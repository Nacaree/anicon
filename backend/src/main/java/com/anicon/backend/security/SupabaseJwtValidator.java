package com.anicon.backend.security;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.EllipticCurve;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SigningKeyResolverAdapter;

@Component
public class SupabaseJwtValidator {

    @Value("${supabase.url}")
    private String supabaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private Map<String, Object> cachedJwks = null;

    public Claims validateToken(String token) {
        return Jwts.parser()
            .setSigningKeyResolver(new SigningKeyResolverAdapter() {
                @Override
                public PublicKey resolveSigningKey(JwsHeader header, Claims claims) {
                    String kid = header.getKeyId();
                    return getPublicKey(kid);
                }
            })
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    @SuppressWarnings("unchecked")
    private PublicKey getPublicKey(String kid) {
        try {
            // Fetch JWKS from Supabase if not cached
            if (cachedJwks == null) {
                String jwksUrl = supabaseUrl + "/.well-known/jwks.json";
                cachedJwks = restTemplate.getForObject(jwksUrl, Map.class);
            }

            // Find the key with matching kid
            var keys = (java.util.List<Map<String, Object>>) cachedJwks.get("keys");
            Map<String, Object> jwk = null;

            for (Map<String, Object> key : keys) {
                if (kid.equals(key.get("kid"))) {
                    jwk = key;
                    break;
                }
            }

            if (jwk == null) {
                throw new IllegalArgumentException("Key ID not found in JWKS: " + kid);
            }

            // Extract x and y coordinates from JWK
            String xStr = (String) jwk.get("x");
            String yStr = (String) jwk.get("y");
            String crv = (String) jwk.get("crv");

            if (!"P-256".equals(crv)) {
                throw new IllegalArgumentException("Unsupported curve: " + crv);
            }

            // Decode Base64 URL encoded coordinates
            byte[] xBytes = Base64.getUrlDecoder().decode(xStr);
            byte[] yBytes = Base64.getUrlDecoder().decode(yStr);

            BigInteger x = new BigInteger(1, xBytes);
            BigInteger y = new BigInteger(1, yBytes);

            // Create EC public key
            return createECPublicKey(x, y);

        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve public key", e);
        }
    }

    private PublicKey createECPublicKey(BigInteger x, BigInteger y) throws Exception {
        // P-256 curve parameters (secp256r1)
        BigInteger p = new BigInteger(
            "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF", 16);
        BigInteger a = new BigInteger(
            "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC", 16);
        BigInteger b = new BigInteger(
            "5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B", 16);

        EllipticCurve curve = new EllipticCurve(
            new java.security.spec.ECFieldFp(p), a, b);

        BigInteger order = new BigInteger(
            "FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551", 16);

        ECPoint generator = new ECPoint(
            new BigInteger("6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296", 16),
            new BigInteger("4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5", 16)
        );

        ECParameterSpec spec = new ECParameterSpec(curve, generator, order, 1);
        ECPoint point = new ECPoint(x, y);
        ECPublicKeySpec pubKeySpec = new ECPublicKeySpec(point, spec);

        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        return keyFactory.generatePublic(pubKeySpec);
    }
}
