# 💸 CrediMerge
### Smart Debt Management & Credit Health Platform

> **AI-powered financial intelligence for gig workers, freelancers, and new-to-credit users.**

CrediMerge helps users understand their complete financial picture by combining cashflow analysis, multi-loan management, loan consolidation simulation, and AI-powered financial guidance — all explained in plain language.

[![Backend](https://img.shields.io/badge/API-Healthy-blue)](http://localhost:5000)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Node](https://img.shields.io/badge/Node-18+-339933)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab)](https://python.org)

---

## 🎯 What is CrediMerge?

CrediMerge is a **financial decision-support platform** for users who:
- Have active income but limited traditional credit history
- Manage multiple loans (personal, credit card, BNPL, vehicle)
- Want to understand their cashflow health beyond just CIBIL
- Need to simulate loan decisions before committing

Unlike traditional credit scoring, CrediMerge analyzes **actual cashflow patterns** from UPI/bank transactions to build an **explainable financial profile**.

---

## ✨ Key Features

### 🔐 Authentication
- JWT-based login with User ID + password
- Secure session persistence
- Protected routes with auto-logout on token expiry

### 💳 EMI & Loan Management
- Add, edit, delete unlimited loans (Personal, Credit Card, BNPL, Vehicle)
- Real-time EMI calculation (backend-driven)
- Amortization schedules with principal/interest breakdown
- Loan-wise analytics: EMI comparison, outstanding balance, interest rates
- Highest interest loan & largest EMI highlights

### 🧾 Alternative Credit Health
- Upload bank statement (PDF/CSV) or use sample data
- **5-Factor Credit Health Score** (0–100):
  - Income Stability (25 pts)
  - Surplus Adequacy (20 pts)
  - Repayment Discipline (25 pts)
  - Balance Buffer (15 pts)
  - Data Vintage (15 pts)
- Cashflow metrics: Avg income, expenses, surplus, volatility, bounce count
- Monthly income vs expense trend chart
- **Safe EMI Capacity** (FOIR-based + Surplus-based)
- Red flags & positive signals
- **PDF report generation** with full breakdown

### 🔄 Consolidation Simulator
- Compare **Existing Loans** vs **Consolidated Offer**
- Live sliders for interest rate & tenure
- See Monthly EMI, Total Interest, Debt-Free Timeline
- Honest verdict: **EMI saving ≠ Interest saving**

### 🤖 AI Financial Assistant
- Floating chat widget (always available)
- Gemini-powered responses using **real user context**
- Explains loans, EMIs, credit health, safe EMI, consolidation trade-offs
- Never invents numbers — only interprets backend-calculated data

### 📊 Dashboard
- Two main sections: **EMI Management** + **Credit Health**
- Financial snapshot: Income, Expenses, Total EMI, Surplus
- Backend-driven KPI cards with loading/error states

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React Frontend (Vite + TypeScript + Tailwind)               │
│  ├── Login + JWT Auth                                        │
│  ├── Home Dashboard                                          │
│  ├── EMI Management (CRUD)                                   │
│  ├── Credit Health (Upload + Score)                          │
│  └── Floating AI Assistant                                   │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API (Axios)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Node.js + Express Backend (TypeScript)                      │
│  ├── /api/auth/register, /api/auth/login, /api/auth/me       │
│  ├── /api/loans (CRUD)                                       │
│  ├── /api/emi/* (Calculate, Amortize, Aggregate)             │
│  ├── /api/dashboard/summary                                  │
│  ├── /api/credit-health/analyze + latest                     │
│  └── /api/ai/chat (Gemini proxy)                             │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐       ┌──────────┐       ┌──────────┐
   │Firestore│       │Analytics │       │  Gemini  │
   │  (DB)   │       │  Engine  │       │   API    │
   └─────────┘       │ (Python) │       └──────────┘
                     └──────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| **React 18 + Vite** | Fast SPA with HMR |
| **TypeScript** | Type safety |
| **Tailwind CSS 3** | Modern dark UI |
| **React Router v6** | Client-side routing |
| **Recharts** | Charts (bar, line, pie) |
| **Axios** | HTTP client with JWT interceptor |

### Backend
| Tech | Purpose |
|------|---------|
| **Node.js + Express** | REST API |
| **TypeScript** | Type safety |
| **JWT (jsonwebtoken)** | Authentication |
| **Firestore** | Persistent storage |
| **Multer** | File upload handling |
| **CORS + dotenv** | Config |

### Analytics Engine
| Tech | Purpose |
|------|---------|
| **Python 3.11+** | Core processing |
| **Pandas + NumPy** | Numerical analysis |
| **Custom modules** | EMI math, credit scoring, risk sim |
| **Consolidation logic** | Loan consolidation |
| **Transaction parsing** | Bank statement processing |

### AI + Cloud + DevOps
| Tech | Purpose |
|------|---------|
| **Google Gemini API** | AI chat |
| **Cloud Run** | Backend runtime |
| **Cloud Storage** | Statement uploads, PDF reports |
| **Secret Manager** | JWT + Gemini secrets |
| **Artifact Registry** | Container images |
| **Cloud Build** | CI/CD pipeline |

---

## 📁 Project Structure

```
Credimerge/
├── Frontend/                          # React app
│   ├── src/
│   │   ├── api/                       # Axios client
│   │   ├── components/                # Reusable UI
│   │   ├── context/                   # Auth context
│   │   ├── pages/                     # Route pages
│   │   │   ├── Login.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── EmiPage.tsx
│   │   │   └── CreditHealth.tsx
│   │   ├── types/                     # TS interfaces
│   │   └── App.tsx
│   ├── vercel.json
│   └── package.json
│
├── Backend/                           # Node.js API
│   ├── src/
│   │   ├── config/
│   │   ├── data/users.csv
│   │   ├── middleware/auth.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── csvService.ts
│   │   │   ├── emiService.ts
│   │   │   ├── firestoreService.ts
│   │   │   └── statementService.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
│
├── analytics-engine/                  # Python engine
│   ├── app/
│   │   ├── common/
│   │   ├── consolidation/
│   │   ├── credit_health/
│   │   ├── emi/
│   │   ├── loans/
│   │   ├── risk/
│   │   └── transactions/
│   ├── tests/
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites
- **Node.js 18+**
- **Python 3.11+**
- **Git**
- **Firebase project** (for Firestore)
- **Gemini API key** ([get one free](https://ai.dev))

### 1. Clone Repository

```bash
git clone https://github.com/Bhupendra-glitch/Credimerge.git
cd Credimerge
```

### 2. Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `Backend/.env`:

```env
PORT=5000
JWT_SECRET=your_super_secret_key_here
NODE_ENV=development
GEMINI_API_KEY=your_google_gemini_api_key
FRONTEND_ORIGIN=http://localhost:5173
GOOGLE_APPLICATION_CREDENTIALS=./credentials/firebase-service-account.json
ALLOW_DEMO_LOGIN=false
FRONTEND_URL=http://localhost:5173
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=CrediMerge <no-reply@example.com>
```

Download a Firebase Admin SDK service-account key from Firebase Console → Project settings → Service accounts and place it at `Backend/credentials/firebase-service-account.json`. The JSON file is a private credential and is ignored by Git; never commit or share it. The backend reads this path relative to its working directory at startup.

Forgot-password emails require working SMTP credentials. The emailed link expires after 30 minutes and is single-use; configure `FRONTEND_URL` to your frontend origin before deploying.

Run backend:

```bash
npm run dev
```

✅ Backend runs at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../Frontend
npm install
```

Create `Frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

✅ Frontend runs at `http://localhost:5173`

### 4. Test Login

Open `http://localhost:5173/register`, create an account, then sign in with its User ID and password. The backend must have valid Firestore credentials; account records are stored in Firestore and passwords are bcrypt-hashed.

### 5. (Optional) Analytics Engine Setup

```bash
cd ../analytics-engine
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/login` | ❌ | Login with User ID + password |
| GET | `/api/me` | ✅ | Current user profile |
| GET | `/api/loans` | ✅ | List user's loans |
| POST | `/api/loans` | ✅ | Add new loan |
| GET | `/api/loans/:id` | ✅ | Get loan details |
| PUT | `/api/loans/:id` | ✅ | Update loan |
| DELETE | `/api/loans/:id` | ✅ | Delete loan |
| GET | `/api/dashboard/summary` | ✅ | Dashboard KPIs |
| POST | `/api/emi/calculate` | ❌ | Calculate EMI |
| POST | `/api/emi/amortization` | ❌ | Amortization schedule |
| POST | `/api/emi/aggregate` | ❌ | Aggregate loans |
| POST | `/api/credit-health/analyze` | ✅ | Analyze statement |
| GET | `/api/credit-health/latest` | ✅ | Latest report |
| POST | `/api/ai/chat` | ✅ | Gemini chat |
| GET | `/api/reports/:id/download` | ✅ | PDF report |

**Auth header:** `Authorization: Bearer <JWT_TOKEN>`

---

## 🌐 Deployment

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import GitHub repo: `Bhupendra-glitch/Credimerge`
3. **Root Directory:** `Frontend`
4. **Framework Preset:** Vite
5. **Environment Variables:**
   ```
   VITE_API_URL=<your-backend-url>
   ```
6. **Deploy**

### Backend → Render (or Cloud Run)

**Render:**
1. [render.com](https://render.com) → **New Web Service**
2. Import repo, **Root Directory:** `Backend`
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. **Environment Variables:** (from `.env.example`)
6. **Deploy**

**Cloud Run (alternative):**
```bash
gcloud run deploy credimerge-api \
  --source ./Backend \
  --region asia-south1 \
  --allow-unauthenticated
```

---

## 🧪 Testing

### Backend Health
```bash
curl http://localhost:5000/
# {"status":"ok","service":"CrediMerge API","version":"2.0"}
```

### Login Test
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"GIG1001","password":"GIG1001@123"}'
```

### Frontend Build
```bash
cd Frontend
npm run build
```

---

## 📋 Development Roadmap

- [x] Frontend UI (Login, Home, EMI, Credit Health)
- [x] Backend endpoints (Auth, Loans CRUD, EMI math)
- [x] Analytics engine (Python modules)
- [x] Firestore integration
- [x] JWT authentication
- [x] Frontend ↔ Backend full data binding
- [x] Gemini AI chat integration
- [x] PDF report generation
- [x] Income Twin Monte Carlo simulator

---

## 🐯 Tiger Data Integration

CrediMerge integrates **Tiger Data (Tiger Cloud / TimescaleDB PostgreSQL)** as its dedicated financial time-series storage and analytical engine.

### Why CrediMerge Uses Tiger Data
Traditional relational databases struggle with high-frequency time-series aggregations across hundreds of bank credits, debits, and balance points. Tiger Data combines standard PostgreSQL capabilities with TimescaleDB's native hypertables, offering:
- **Partitioned Time-Series Hypertables**: Automated temporal chunking for fast transaction inserts and retrieval.
- **Native `time_bucket` Aggregation**: Millisecond-level computation of daily, weekly, and monthly cash flow metrics.
- **Analytical Velocity Modeling**: Real-time run-rate and volatility tracking for 30/60/90-day predictive forecasts.

### Data Architecture Separation
CrediMerge strictly partitions responsibilities across database tiers:
- **Tiger Data (TimescaleDB)**:
  - High-volume financial transactions (`financial_transactions` hypertable)
  - Income and deposit history
  - Expense and debit history
  - Time-bucketed cash flow trends
  - Balance trajectory and volatility metrics
  - 30/60/90-day cash flow forecast data
- **Supabase (PostgreSQL Relational)**:
  - User accounts and identity profiles
  - Loan applications and lender records
  - Credit health assessment reports
  - General relational business entities

### Local Setup & Environment Configuration
Tiger Data is connected **only** in the Node/Express backend (`Backend/.env`). It is **never** exposed to the React frontend or committed to GitHub.

1. Add the connection string to `Backend/.env`:
   ```env
   # Tiger Data (TimescaleDB / Tiger Cloud)
   TIGER_DATABASE_URL=postgres://USERNAME:PASSWORD@HOST:PORT/tsdb?sslmode=require
   ```
2. The backend connection pool automatically initializes the hypertable and compound indexes on startup (`Backend/tiger_schema.sql`).
3. Verify connection health:
   ```bash
   curl http://localhost:5000/api/health/tiger
   # {"success":true,"service":"tiger-data","database":"connected"}
   ```

### Database Schema (`financial_transactions`)
```sql
CREATE TABLE IF NOT EXISTS financial_transactions (
    time TIMESTAMPTZ NOT NULL,
    user_id TEXT NOT NULL,
    transaction_id TEXT,
    transaction_type TEXT NOT NULL,          -- 'CREDIT' | 'DEBIT' | 'TRANSFER'
    category TEXT,                          -- 'SALARY', 'GROCERIES', 'BILLS', etc.
    amount NUMERIC(15, 2) NOT NULL,
    balance NUMERIC(15, 2),
    description TEXT,
    source TEXT DEFAULT 'MANUAL',           -- 'LIVE', 'SANDBOX', 'IMPORTED', 'MANUAL'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TimescaleDB Hypertable
SELECT create_hypertable('financial_transactions', 'time', if_not_exists => TRUE, migrate_data => TRUE);

-- Compound Time-Series Indexes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_time ON financial_transactions (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions (user_id, transaction_type, time DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions (user_id, category, time DESC);
```

### Tiger Data API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/health/tiger` | Public | Safe Tiger Data connectivity health status |
| GET | `/api/financial/transactions/:userId` | ✅ Auth | Paginated time-series transactions for user |
| POST | `/api/financial/transactions` | ✅ Auth | Record financial transaction into Tiger hypertable |
| GET | `/api/financial/cashflow/:userId` | ✅ Auth | Daily, weekly, or monthly `time_bucket` cash flow |
| GET | `/api/financial/income/:userId` | ✅ Auth | Historical credit / deposit stream |
| GET | `/api/financial/expenses/:userId` | ✅ Auth | Historical debit / expense stream |
| GET | `/api/financial/balance/:userId` | ✅ Auth | Balance trends over time |
| GET | `/api/financial/forecast/:userId` | ✅ Auth | 30, 60, and 90-day predictive forecasts |

### Render Deployment Configuration
The Node.js backend is deployed on Render.
1. Open your Render Dashboard for the backend service (`credimerge-backend`).
2. Navigate to **Environment Variables**.
3. Add:
   - **Key**: `TIGER_DATABASE_URL`
   - **Value**: `postgres://USERNAME:PASSWORD@HOST:PORT/tsdb?sslmode=require`
4. Deploy the service.
5. **Never** add `TIGER_DATABASE_URL` to Vercel or frontend environments.

### Security Guarantees
- **Zero Frontend Exposure**: The React frontend communicates strictly via Express REST API (`/api/financial/...`), never directly to Tiger Data.
- **Strict User Authorization**: Users can only query and write to their own financial records; cross-user data queries return `403 Forbidden`.
- **Parameterized Queries**: All SQL statements use parameterized place-holders (`$1, $2, ...`), preventing SQL injection.
- **SSL Enforced**: TLS with SSL mode required for all Tiger Cloud connections.
- **Sanitized Logging**: Credentials, passwords, and connection strings are masked from console outputs and health responses.

---

## 👥 Team

| Member | Role | Ownership |
|--------|------|-----------|
| **Bhupendra Sahu** | Backend + Database | Express API, Firestore, JWT, CRUD, orchestration |
| **Juhi Rathod** | Frontend Engineer | React UI, routing, data binding, API integration |
| **Ankit Nayak** | Financial/Data Engine | Python (Pandas/NumPy), EMI math, credit scoring, risk simulation |
| **Sheel Mrida** | AI + Cloud + DevOps | Gemini integration, Cloud Run, Storage, Secret Manager, CI/CD |

---

## 🔒 Security Notes

- ✅ JWT-based authentication with expiring tokens
- ✅ Password hashing (bcrypt) — never plaintext
- ✅ Gemini API key stored **server-side only**
- ✅ CORS whitelist for production
- ✅ Firestore rules restrict per-user data access
- ✅ No secrets in Git (`.env` in `.gitignore`)

---

## ⚠️ Disclaimer

CrediMerge provides **alternative cashflow-based financial estimates** and is **NOT an official credit bureau or CIBIL score**. All calculations are for informational purposes only. Users should consult a licensed financial advisor before making major financial decisions.

The platform does not:
- Store raw bank statements longer than necessary
- Share user data with third parties
- Guarantee loan approval or credit outcomes

---

## 🙏 Acknowledgements

- **Google Cloud** for Gemini API and Cloud Run infrastructure
- **Firebase** for Firestore backend
- **Vercel** for free frontend hosting
- **Render** for free backend hosting
- The open-source community

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 📞 Contact

**Repository:** [github.com/Bhupendra-glitch/Credimerge](https://github.com/Bhupendra-glitch/Credimerge)

**Team:**
- **Bhupendra Sahu** — Backend & Database
- **Juhi Rathod** — Frontend Engineering
- **Ankit Nayak** — Financial/Data Engine
- **Sheel Mrida** — AI, Cloud & DevOps

---

⭐ **If you find CrediMerge useful, please star the repo!**
