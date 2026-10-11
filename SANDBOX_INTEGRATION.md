# Sandbox.co.in & Tiger Data Integration Guide

This document details the production-ready integration of **Sandbox.co.in** verification APIs and **Tiger Data** (TimescaleDB / Tiger Cloud) into the CrediMerge full-stack fintech platform.

---

## 1. System Architecture

```
                                [ React / Vite Frontend (Vercel) ]
                                                │
                          Firebase JWT / Bearer │ (Zero Sandbox secrets in client)
                                                ▼
                         [ Express / Node.js Backend (Render) ]
                                  │            │           │
           x-api-key + JWT Token  │            │ Store     │ Time-series audit stream
       (test-api.sandbox.co.in)   │            │ metadata  │ (hypertable)
                                  ▼            ▼           ▼
                      [ Sandbox.co.in TEST API ]  [ Supabase DB ]  [ Tiger Cloud ]
                                  │                     │                 │
                                  └──────────────┬──────┴─────────────────┘
                                                 │
                                                 ▼
                                     [ CrediMerge Profile ]
                                                 │ (Verified Signals)
                                                 ▼
                                    [ Risk & Analytics Engine ]
```

### Separation of Responsibilities

* **Sandbox.co.in (TEST Environment)**:
  * Identity verification: PAN card validation & name matching
  * Tax compliance: GSTIN business verification & taxpayer status
  * Bank verification: Real-time Penny Drop validation (`/bank/{ifsc}/accounts/{account_number}/verify`)
* **Setu / Sahamati (Account Aggregator)**:
  * User consent artifacts (`/api/accounts/consent`)
  * Bank statement fetching & transaction aggregation
* **Tiger Data (TimescaleDB / Tiger Cloud)**:
  * High-throughput time-series financial transactions (`financial_transactions` hypertable)
  * Verification event audit stream (`sandbox_verification_events` hypertable)
  * Cash flow projections, rolling burn rate, and 30/60/90-day predictive forecasts
* **Supabase PostgreSQL**:
  * User profiles, auth records, loans, statements, and `sandbox_verifications` relational data

---

## 2. Environment Variables Configuration

Set these in your **Backend environment only** (`Backend/.env` for local testing, or in the Render dashboard). **Never expose these to the Vercel frontend or git.**

```env
# Sandbox.co.in Configuration (TEST / SANDBOX Environment)
SANDBOX_BASE_URL=https://test-api.sandbox.co.in
SANDBOX_API_KEY=your_test_api_key
SANDBOX_API_SECRET=your_test_api_secret
SANDBOX_API_VERSION=1.0.0

# Tiger Data (TimescaleDB Cloud) Connection String
TIGER_DATABASE_URL=postgres://tsdbadmin:<PASSWORD>@v9as7g5wxb.eiodgteuug.tsdb.cloud.timescale.com:31172/tsdb?sslmode=require
```

### Frontend (`Frontend/.env`)
```env
# Only the CrediMerge Backend URL
VITE_API_URL=http://localhost:5000
```

---

## 3. Sandbox Authentication Flow

1. **Authentication Endpoint**: `POST https://test-api.sandbox.co.in/authenticate`
2. **Required Headers**:
   * `x-api-key`: Your Sandbox test API key
   * `x-api-secret`: Your Sandbox test API secret
   * `x-api-version`: `1.0.0`
   * `Content-Type`: `application/json`
3. **Access Token Lifespan**: 24 hours.
4. **Token Caching & Auto-Refresh**:
   * `sandbox.service.ts` caches the JWT in-memory with a 5-minute safety buffer.
   * If a `401 Unauthorized` response is returned by Sandbox, the cache is automatically invalidated and a fresh token is requested.
5. **Subsequent API Headers**:
   * `authorization`: `<access_token>` (Raw token string, **no Bearer prefix**)
   * `x-api-key`: `<api_key>`
   * `x-api-version`: `1.0.0`
   * `x-accept-cache`: `true`

---

## 4. Backend API Endpoints

All endpoints are mounted under `/api/sandbox` and require CrediMerge user authentication (`authenticate` middleware).

### 1. `POST /api/sandbox/pan/verify`
* **Input Payload**:
  ```json
  {
    "pan": "ABCDE1234F",
    "nameAsPerPan": "Full Name (Optional)",
    "dateOfBirth": "DD/MM/YYYY (Optional)"
  }
  ```
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "VERIFIED",
      "verificationType": "PAN",
      "maskedIdentifier": "ABC****34F",
      "category": "individual",
      "nameMatched": true,
      "referenceId": "sbx_pan_1730000000",
      "provider": "SANDBOX",
      "message": "PAN verification successful."
    }
  }
  ```

### 2. `POST /api/sandbox/gst/verify`
* **Input Payload**:
  ```json
  {
    "gstin": "29AAAAA0000A1Z5"
  }
  ```
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "VERIFIED",
      "verificationType": "GST",
      "maskedIdentifier": "29AA******0A1Z5",
      "tradeName": "CrediMerge Tech Solutions",
      "legalName": "CREDIMERGE TEST ENTERPRISES PVT LTD",
      "taxpayerStatus": "Active",
      "referenceId": "sbx_gst_1730000000",
      "provider": "SANDBOX",
      "message": "GSTIN verification successful."
    }
  }
  ```

### 3. `POST /api/sandbox/bank-account/verify`
* **Input Payload**:
  ```json
  {
    "accountNumber": "919876543210",
    "ifsc": "HDFC0000001"
  }
  ```
* **Success Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "VERIFIED",
      "verificationType": "BANK_ACCOUNT",
      "maskedIdentifier": "•••• •••• 3210",
      "ifsc": "HDFC0000001",
      "accountHolderName": "CREDIMERGE VERIFIED ACCOUNT HOLDER",
      "accountExists": true,
      "referenceId": "sbx_bank_1730000000",
      "provider": "SANDBOX",
      "message": "Bank account verified successfully via Penny Drop."
    }
  }
  ```

### 4. `GET /api/sandbox/verifications`
* Returns current user's verification history stored in Supabase along with time-series verification events from Tiger Data.

### 5. `GET /api/sandbox/status`
* Returns integration diagnostic status, live Sandbox API readiness, and Tiger Data connection health.

---

## 5. Database Schemas

### Supabase Relational Table (`sandbox_verifications`)
```sql
CREATE TABLE IF NOT EXISTS public.sandbox_verifications (
  id TEXT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('PAN', 'GST', 'BANK_ACCOUNT')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('VERIFIED', 'FAILED', 'PENDING')),
  reference_id TEXT,
  provider VARCHAR(50) NOT NULL DEFAULT 'SANDBOX',
  masked_identifier VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
```

### Tiger Data (TimescaleDB) Hypertable (`sandbox_verification_events`)
```sql
CREATE TABLE IF NOT EXISTS sandbox_verification_events (
    time TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    verification_type TEXT NOT NULL,
    status TEXT NOT NULL,
    reference_id TEXT,
    masked_identifier TEXT,
    name_matched BOOLEAN DEFAULT true,
    source TEXT DEFAULT 'SANDBOX_TEST',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT create_hypertable('sandbox_verification_events', 'time', if_not_exists => TRUE, migrate_data => TRUE);
```

---

## 6. Financial Risk Profile Integration

In accordance with responsible lending and credit governance:
* Successful PAN, GST, or Bank account verification does **not** arbitrarily adjust credit scores.
* Instead, verified data creates an official `verification_signals` object exposed on `user`:
  ```json
  {
    "pan_verified": true,
    "gst_verified": false,
    "bank_verified": true,
    "total_verified": 2,
    "trust_tier": "VERIFIED_FINANCIAL_PROFILE"
  }
  ```
* This verified signal informs risk assessment, reduces fraud probability, and increases data vintage confidence without altering mathematical underwriting formulas.

---

## 7. Security Best Practices

1. **PII Masking**: Full account numbers, PANs, and GSTINs are masked before database persistence and client response (`ABC****34F`, `•••• •••• 3210`).
2. **Zero Credentials in Git**: `.env` and `.env.*` remain strictly excluded in `.gitignore`.
3. **No Secret Logging**: Console logs never print API secrets, raw access tokens, or sensitive payload attributes.
4. **Resilient Mock Fallback**: If Sandbox test credentials are not yet configured or during local unit testing, the service provides compliant mock responses matching official government schema contracts.

---

## 8. Local Testing & Verification Commands

### Backend:
```bash
cd Backend
npm install
npm test
npm run dev
```

### Frontend:
```bash
cd Frontend
npm install
npm run build
npm run dev
```

---

## 9. Deployment Guides

### Render Deployment (Backend)
1. In the **Render Dashboard**, navigate to your `credimerge-backend` web service.
2. Under **Environment**, add the following environment variables:
   * `SANDBOX_BASE_URL` = `https://test-api.sandbox.co.in`
   * `SANDBOX_API_KEY` = `<your_sandbox_test_key>`
   * `SANDBOX_API_SECRET` = `<your_sandbox_test_secret>`
   * `SANDBOX_API_VERSION` = `1.0.0`
   * `TIGER_DATABASE_URL` = `postgres://tsdbadmin:<PASSWORD>@v9as7g5wxb.eiodgteuug.tsdb.cloud.timescale.com:31172/tsdb?sslmode=require`
3. Trigger a manual deploy or push to `main`.

### Vercel Deployment (Frontend)
1. In the **Vercel Dashboard**, open your CrediMerge frontend project settings.
2. Set `VITE_API_URL` to your Render backend URL (e.g. `https://credimerge-api.onrender.com`).
3. **Important**: Never add `SANDBOX_API_KEY` or `SANDBOX_API_SECRET` to Vercel.

---

## 10. Production Migration Checklist

Before switching from Sandbox TEST (`https://test-api.sandbox.co.in`) to Live Production (`https://api.sandbox.co.in`):
* [ ] Switch `SANDBOX_BASE_URL` to `https://api.sandbox.co.in` in Render.
* [ ] Update `SANDBOX_API_KEY` and `SANDBOX_API_SECRET` to live production credentials.
* [ ] Verify that Penny Drop payout wallet on Sandbox console is funded with operational balance for bank verification charges.
* [ ] Ensure IP whitelisting on Sandbox console matches Render outbound IP addresses if enforced.
* [ ] Verify SSL certificate validation on Supabase and Tiger Data connections.
