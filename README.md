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
│  ├── /api/login, /api/me                                     │
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
GEMINI_API_KEY=AIza...
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

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

```
User ID:  GIG1001
Password: GIG1001@123
```

Other demo users: `GIG1002` through `GIG1009` (password: `<user_id>@123`)

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
