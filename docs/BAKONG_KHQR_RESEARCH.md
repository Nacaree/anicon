# Bakong API + KHQR — Research Notes

> **Date:** 2026-03-22
> **Purpose:** Replace PayWay's KHQR flow with direct Bakong API integration for scannable QR payments

---

## What is Bakong / KHQR?

**Bakong** is Cambodia's national real-time payment system, operated by the **National Bank of Cambodia (NBC)**. It connects all banks and payment providers in Cambodia into a single interoperable network.

**KHQR** (Khmer QR) is the standardized QR code format for payments in Cambodia, based on the EMV QR Code standard. A single KHQR code can be scanned by any banking app in Cambodia (ABA, ACLEDA, Wing, etc.) via the Bakong backbone.

---

## Can We Generate KHQR Codes Directly?

**Yes.** The Bakong Open API is a free developer API from NBC that lets you:

1. **Generate KHQR QR codes** (the actual scannable payment QR)
2. **Check payment status** (poll by MD5 hash to know when someone paid)
3. **Get full payment details** (sender account, amount, timestamp)
4. **Generate deeplinks** (for mobile app redirect)

This means we can replace the PayWay KHQR flow entirely — generate the QR code ourselves, display it on our own page, and poll for confirmation. No external redirect needed.

---

## Environments

| Environment | Base URL |
|-------------|----------|
| **SIT (sandbox)** | `https://sit-api-bakong.nbc.gov.kh/v1` |
| **Production** | `https://api-bakong.nbc.gov.kh/v1` |

### IP Restriction Test (2026-03-22)

Both endpoints were tested from outside Cambodia and returned **HTTP 404** (not 403), meaning they are **not geo-blocked**. The 404 is expected — no route at `/v1` root.

```
Production: HTTP 404 (IP: 18.239.134.49) — reachable
Sandbox:    HTTP 404 (IP: 3.166.34.36)   — reachable
```

**Conclusion:** Railway Singapore server should work fine. The geo-blocking concern appears outdated or only applies to specific scenarios.

---

## How to Get Access

1. Register for a **Bakong Developer Token** at `https://api-bakong.nbc.gov.kh/register/`
2. Need a **Bakong account with full KYC** (verified with Cambodian National ID or Passport)
3. Token expires every **90 days** — must be auto-renewed via `/v1/renew_token`
4. Zero transaction fees (NBC policy to promote digital payments)

---

## Integration Flow

```
1. GENERATE QR
   User clicks "Pay with KHQR"
   → Backend uses Bakong SDK to generate KHQR string + MD5 hash
   → Return QR string to frontend

2. DISPLAY QR
   → Frontend renders QR string as scannable image (ZXing or qrcode library)
   → User scans with any Cambodian banking app (ABA, ACLEDA, Wing, etc.)

3. POLL FOR PAYMENT
   → Frontend/backend polls Bakong API with MD5 hash
   → Response code 0 = PAID, 1 = not found
   → Max timeout: 10 minutes (per KHQR spec)

4. CONFIRM & ISSUE TICKET
   → Payment confirmed → update transaction → issue ticket
   → Increment current_attendance
```

---

## Official Java SDK (Spring Boot)

```xml
<dependency>
    <groupId>kh.gov.nbc.bakong_khqr</groupId>
    <artifactId>sdk-java</artifactId>
    <version>1.0.0.17</version>
</dependency>
```

### Generate Merchant KHQR

```java
MerchantInfo merchantInfo = new MerchantInfo();
merchantInfo.setBakongAccountId("your_account@bankcode");
merchantInfo.setMerchantName("AniCon Events");
merchantInfo.setMerchantCity("Phnom Penh");
merchantInfo.setAcquiringBank("Your Bank");
merchantInfo.setCurrency(KHQRCurrency.KHR); // or USD
merchantInfo.setAmount(9800.0);

KHQRResponse<KHQRData> response = BakongKHQR.generateMerchant(merchantInfo);
String qrString = response.getData().getQr();  // KHQR payload string
String md5 = response.getData().getMd5();       // MD5 hash for payment verification
```

### Generate Individual KHQR

```java
IndividualInfo info = new IndividualInfo();
info.setBakongAccountId("john_smith@devb");
info.setMerchantName("John Smith");
KHQRResponse<KHQRData> response = BakongKHQR.generateIndividual(info);
```

---

## Available SDKs

| Language | Package | Source |
|----------|---------|--------|
| **Java** | `kh.gov.nbc.bakong_khqr:sdk-java:1.0.0.17` | Maven Central — **Official NBC SDK** |
| **JavaScript** | `bakong-khqr` (npm) | npm — **Official NBC SDK** |
| **TypeScript** | `ts-khqr` (npm) | GitHub (community) |
| **Python** | `bakong-khqr` (PyPI) | GitHub (community) |
| **Go** | `github.com/chhunneng/bakong-khqr` | Go Packages (community) |
| **PHP** | `khqr-gateway/bakong-khqr-php` | Packagist (community) |
| **Dart/Flutter** | `khqr_sdk` | pub.dev (community) |

---

## Key Considerations for AniCon

| Item | Detail |
|------|--------|
| **Registration** | Need a Bakong account with full KYC (Cambodian ID/Passport) |
| **Token renewal** | Expires every 90 days — build auto-renewal into backend |
| **QR timeout** | Max 10 minutes per KHQR spec |
| **Fees** | Zero transaction fees |
| **Scope** | Replaces PayWay for KHQR/ABA only. Stripe still needed for cards |
| **Server location** | Railway Singapore — confirmed reachable, no geo-block |

---

## Reference Resources

- [Bakong Open API Portal](https://api-bakong.nbc.gov.kh/)
- [Developer Token Registration](https://api-bakong.nbc.gov.kh/register/)
- [Bakong Open API Document (PDF)](https://bakong.nbc.gov.kh/download/KHQR/integration/Bakong%20Open%20API%20Document.pdf)
- [KHQR SDK Document (PDF)](https://bakong.nbc.gov.kh/download/KHQR/integration/KHQR%20SDK%20Document.pdf)
- [QR Payment Integration Guide (PDF)](https://bakong.nbc.gov.kh/download/QR%20Payment%20Integration.pdf)
- [KHQR Content Guideline v1.4 (PDF)](https://bakong.nbc.gov.kh/download/KHQR/integration/KHQR%20Content%20Guideline%20v.1.3.pdf)
- [Spring Boot Integration Example (GitHub)](https://github.com/tongbora/Bakong-API-Integration-with-Spring-Boot)

---

## vs. Current PayWay Flow

| Aspect | PayWay (current) | Bakong Direct (proposed) |
|--------|------------------|--------------------------|
| UX | Redirects to external PayWay checkout page | QR displayed in-app, no redirect |
| Fees | PayWay charges transaction fees | Zero fees |
| Verification | Call PayWay Check Transaction API | Poll Bakong with MD5 hash |
| Supported methods | ABA Pay, KHQR, WeChat, Alipay, Card | KHQR only (all Cambodian banks) |
| Setup | PayWay merchant account | Bakong developer token (KYC required) |
