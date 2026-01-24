package com.anicon.backend.security;

import java.math.BigInteger;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.EllipticCurve;
import java.util.Base64;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.ProtectedHeader;

/**
 * Validates JWT tokens issued by Supabase Auth.
 *
 * This component verifies the cryptographic signature of JWT tokens using
 * Supabase's
 * public keys (JWKS). It fetches the public keys from Supabase's JWKS endpoint
 * and
 * uses them to verify that tokens were actually signed by Supabase and haven't
 * been tampered with.
 */
@Component
public class SupabaseJwtValidator {

    @Value("${supabase.url}")
    private String supabaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private Map<String, Object> cachedJwks = null; // Cached JWKS to avoid repeated HTTP calls

    /**
     * Validates a JWT token and extracts its claims.
     *
     * This method:
     * 1. Parses the JWT token
     * 2. Extracts the "kid" (key ID) from the token's header
     * 3. Uses the kid to fetch the correct public key from Supabase's JWKS
     * 4. Verifies the token's signature using that public key
     * 5. Returns the claims (payload) if valid, throws exception if invalid
     *
     * @param token The JWT token string (without "Bearer " prefix)
     * @return Claims object containing user ID, email, roles, etc.
     * @throws RuntimeException if token is invalid or signature verification fails
     */
    public Claims validateToken(@NonNull String token) {
        return Jwts.parser()
                .keyLocator(new LocatorAdapter<Key>() {
                    @Override
                    protected Key locate(ProtectedHeader header) {
                        // Extract the "kid" (key ID) from the JWT header
                        // This tells us which public key to use for verification
                        String kid = header.getKeyId();
                        if (kid == null) {
                            throw new IllegalArgumentException("JWT header is missing 'kid'");
                        }
                        return getPublicKey(kid);
                    }
                })
                .build()
                .parseSignedClaims(token) // Parse and verify signature
                .getPayload(); // Extract claims (user data)
    }

    /**
     * Fetches the public key from Supabase's JWKS endpoint that matches the given
     * key ID.
     *
     * JWKS (JSON Web Key Set) is a standard way for auth providers to publish their
     * public keys.
     * Each key has a "kid" (key ID) that JWT tokens reference in their header.
     *
     * This method:
     * 1. Fetches the JWKS from Supabase (cached after first request)
     * 2. Finds the key with matching "kid"
     * 3. Extracts the elliptic curve coordinates (x, y) from the JWK
     * 4. Constructs a Java PublicKey object for signature verification
     *
     * @param kid The key ID from the JWT header
     * @return PublicKey for verifying the JWT signature
     * @throws RuntimeException if key not found or decoding fails 
     */
    @SuppressWarnings("unchecked")
    @NonNull
    private PublicKey getPublicKey(@NonNull String kid) {
        try {
            // Fetch JWKS from Supabase if not cached (only happens once per app lifetime)
            if (cachedJwks == null) {
                String jwksUrl = supabaseUrl + "/auth/v1/.well-known/jwks.json";
                cachedJwks = restTemplate.getForObject(jwksUrl, Map.class);
            }

            if (cachedJwks == null) {
                throw new IllegalStateException("Failed to retrieve JWKS from Supabase");
            }

            // Find the specific key with matching kid from the list of keys
            var keys = (java.util.List<Map<String, Object>>) cachedJwks.get("keys");
            if (keys == null) {
                throw new IllegalStateException("JWKS response is missing 'keys' field");
            }

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

            // Extract x and y coordinates from the JWK (these define the public key point
            // on the elliptic curve)
            String xStr = (String) jwk.get("x");
            String yStr = (String) jwk.get("y");
            String crv = (String) jwk.get("crv");

            if (xStr == null || yStr == null || crv == null) {
                throw new IllegalArgumentException("JWK is missing required fields (x, y, or crv)");
            }

            // Supabase uses P-256 (secp256r1) elliptic curve algorithm
            if (!"P-256".equals(crv)) {
                throw new IllegalArgumentException("Unsupported curve: " + crv);
            }

            // Decode Base64 URL encoded coordinates (JWK format uses URL-safe Base64)
            byte[] xBytes = Base64.getUrlDecoder().decode(xStr);
            byte[] yBytes = Base64.getUrlDecoder().decode(yStr);

            BigInteger x = new BigInteger(1, xBytes);
            BigInteger y = new BigInteger(1, yBytes);

            // Create the actual Java PublicKey object from the EC coordinates
            return createECPublicKey(x, y);

        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve public key", e);
        }
    }

    /**
     * Constructs an Elliptic Curve (EC) public key from x and y coordinates.
     *
     * This method builds a Java PublicKey object using the P-256 elliptic curve
     * standard.
     * P-256 is a NIST-standardized elliptic curve used for cryptographic
     * signatures.
     *
     * The hardcoded parameters below are the official P-256 curve constants defined
     * by NIST.
     * These never change - they're mathematical constants that define the curve's
     * shape.
     *
     * @param x The x-coordinate of the public key point on the elliptic curve
     * @param y The y-coordinate of the public key point on the elliptic curve
     * @return A PublicKey object ready for signature verification
     * @throws Exception if key generation fails
     */
    @NonNull
    private PublicKey createECPublicKey(BigInteger x, BigInteger y) throws Exception {
        // P-256 curve parameters - these are standardized constants
        // p: The prime that defines the finite field
        BigInteger p = new BigInteger(
                "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF", 16);
        // a: First coefficient in the curve equation y² = x³ + ax + b
        BigInteger a = new BigInteger(
                "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC", 16);
        // b: Second coefficient in the curve equation
        BigInteger b = new BigInteger(
                "5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B", 16);

        // Create the elliptic curve with these parameters
        EllipticCurve curve = new EllipticCurve(
                new java.security.spec.ECFieldFp(p), a, b);

        // order: The number of points on the curve (used for key generation)
        BigInteger order = new BigInteger(
                "FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551", 16);

        // generator: A standard point on the curve used as the starting point for key
        // generation
        ECPoint generator = new ECPoint(
                new BigInteger("6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296", 16),
                new BigInteger("4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5", 16));

        // Combine all parameters into an EC specification
        ECParameterSpec spec = new ECParameterSpec(curve, generator, order, 1);

        // Create the actual public key point using the x,y coordinates from Supabase's
        // JWKS
        ECPoint point = new ECPoint(x, y);
        ECPublicKeySpec pubKeySpec = new ECPublicKeySpec(point, spec);

        // Use Java's KeyFactory to generate the final PublicKey object
        KeyFactory keyFactory = KeyFactory.getInstance("EC");
        return Objects.requireNonNull(keyFactory.generatePublic(pubKeySpec));
    }
}
