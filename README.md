# CrediMerge 💸

### AI-powered Debt Management & Credit Health Platform

CrediMerge is a financial decision-support platform designed to help gig workers, freelancers, and people building their credit history understand cash flow, manage multiple loans, explore consolidation scenarios, and make more informed financial decisions.

> **Important:** CrediMerge provides estimates and educational guidance. It is not a credit bureau, lender, or substitute for professional financial advice. Scores produced by the project are not official CIBIL scores and do not guarantee loan approval.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-Analytics-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Repository:** [Bhupendra-glitch/Credimerge](https://github.com/Bhupendra-glitch/Credimerge)  
**Deployment guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Data Services](#data-services)
- [Security](#security)
- [Roadmap](#roadmap)
- [Team](#team)
- [License](#license)

  <img width="2144" height="2280" alt="CrediMerge_Flowchart" src="https://github.com/user-attachments/assets/d80d3232-639c-44bb-aabf-b4444f84851b" />
  **VIDEO LINK:- https://drive.google.com/file/d/14mXKJeffz_xvsKfBXpmzjFkokkaJFoh-/view?usp=sharing**


## Overview

Many people earn regularly but have limited traditional credit history. CrediMerge aims to help users understand their financial profile using loan details and cash-flow information, rather than presenting a single unexplained number.

The application separates the user interface, API/orchestration layer, and financial analytics code. The backend handles authentication, requests, and integrations; calculations should be performed server-side and should not depend on values calculated only in the browser.

## Features

### Loan and EMI management

- Manage loan records, including adding, editing, viewing, and deleting loans where the configured backend supports these operations.
- Calculate estimated monthly instalments (EMIs).
- Review repayment schedules and principal-versus-interest breakdowns.
- Compare loan payments, balances, and interest rates.

### Alternative credit health and cash-flow analysis

- Import supported bank statement formats such as PDF or CSV, depending on the configured parser.
- Review income, expense, surplus, balance, and transaction trends.
- Explore cash-flow indicators and potential positive signals or risk flags.
- Estimate affordable EMI capacity using available income and expense information.
- Generate a downloadable report when the report-generation service is configured.

### Loan consolidation simulator

- Compare existing repayments with a hypothetical consolidated loan offer.
- Explore how interest rate and tenure affect estimated EMI and total interest.
- Consider both monthly payment changes and the overall cost of borrowing.

> A lower EMI does not automatically mean a lower total interest cost. Compare the full repayment amount and loan duration before making a decision.

### AI financial assistant

- Uses the Google Gemini API through the backend to explain supported financial metrics and trade-offs in plain language.
- Keeps the Gemini API key on the server rather than exposing it in frontend code.
- AI responses are explanatory and should not replace verified calculation results or professional advice.

### Financial time-series integration

- Optional Tiger Data / TimescaleDB integration is intended for transaction history and time-based cash-flow analysis.
- Supabase/PostgreSQL and Firebase-related dependencies are present in the repository. Which persistence path is active depends on the relevant backend configuration and implementation.

### Authentication and user experience

- Login and protected application areas, depending on the selected authentication configuration.
- Dashboard summaries and visual analytics.
- Loading, validation, and error feedback for supported requests.

*Feature availability depends on the backend services and environment variables configured for the deployment. See the source code and [DEPLOYMENT.md](DEPLOYMENT.md) for the current deployment setup.*

## Technology Stack

| Layer | Technologies | Responsibility |
|---|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router, Recharts, Axios | UI, routing, charts, and API requests |
| API backend | Node.js, Express, TypeScript | REST API, request validation, orchestration, and service integrations |
| Analytics | Python, Pandas/NumPy dependencies where implemented | Financial calculations and analysis modules |
| AI | Google Gemini API | Natural-language explanations through the backend |
| Data services | Firebase/Firestore, Supabase/PostgreSQL, optional Tiger Data/TimescaleDB | Authentication or application data, relational records, and time-series data depending on configuration |
| Hosting | Vercel (frontend), Render (backend) | Web app and API hosting |
| Optional voice integration | ElevenLabs API | Voice functionality when configured |

## Architecture

```text
┌─────────────────────────────────────────┐
│             React Frontend              │
│   Dashboard · Loans · Credit Health      │
│         AI Assistant · Charts            │
└────────────────────┬────────────────────┘
                     │ HTTPS / REST API
                     ▼
┌─────────────────────────────────────────┐
│       Node.js + Express API              │
│ Authentication · Validation · Routing   │
│ Data services · Gemini API proxy         │
└─────────┬───────────────┬───────────────┘
          │               │
          ▼               ▼
┌────────────────┐  ┌─────────────────────┐
│ Configured DBs  │  │ Analytics modules   │
│ Firebase /      │  │ Python financial    │
│ Supabase /      │  │ calculations and    │
│ Tiger Data      │  │ analysis             │
└────────────────┘  └─────────────────────┘
```

This diagram describes the intended service boundaries. Enable only the data providers and analytics routes that are implemented and configured in your deployment.

## Repository Structure

```text
Credimerge/
├── Backend/                    # Node.js / Express API
│   ├── src/                     # API, services, and configuration
│   ├── services/                # Supporting backend services
│   ├── tests/                   # Backend tests
│   ├── .env.example             # Environment-variable template
│   ├── supabase_schema.sql      # Supabase database schema
│   └── tiger_schema.sql         # Tiger Data / TimescaleDB schema
├── Frontend/                   # React + Vite application
│   ├── src/                     # UI and client-side code
│   ├── public/                  # Static assets
│   └── .env.example             # Frontend environment template
├── analytics-engine/           # Python analytics workspace
│   ├── app/                     # Analytics modules
│   ├── tests/                   # Analytics tests
│   └── requirements.txt
├── docs/                       # Project documentation
├── GigCred_synthetic_10_users.csv # Synthetic/demo dataset
├── DEPLOYMENT.md               # Deployment instructions
├── render.yaml                 # Render service configuration
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project locally:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (18 or later recommended)
- npm (included with Node.js)
- Python 3.11 or later if you are working with the analytics engine
- Credentials for whichever data services and API integrations you intend to enable

### 1. Clone the repository

```bash
git clone https://github.com/Bhupendra-glitch/Credimerge.git
cd Credimerge
```

### 2. Configure the backend

```bash
cd Backend
npm install
```

Create a local environment file by copying the template.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `Backend/.env` and set the variables required by the services you are using. At minimum, configure a strong `JWT_SECRET`, `FRONTEND_ORIGIN`, and the credentials needed by your selected database and AI integrations. See [Environment Variables](#environment-variables).

### 3. Configure the frontend

In a second terminal:

```bash
cd Frontend
npm install
```

Create `Frontend/.env` using the provided example.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

By default, local development points the frontend to `http://localhost:5000`:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Optional: prepare the Python analytics workspace

```bash
cd analytics-engine
python -m venv .venv
```

Activate the environment:

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install the listed dependencies:

```bash
pip install -r requirements.txt
```

The analytics workspace is evolving. Check `analytics-engine/README.md` and the tests before relying on a specific calculation or API.

## Environment Variables

Do not commit real credentials to Git. The following table lists common variables from `Backend/.env.example`; additional variables may be required by specific features.

| Variable | Purpose |
|---|---|
| `PORT` | Port used by the backend (local default: `5000`) |
| `NODE_ENV` | Runtime environment, such as `development` or `production` |
| `FRONTEND_ORIGIN` | Allowed frontend origin(s) for CORS |
| `FRONTEND_URL` | Frontend URL used for password-reset links |
| `JWT_SECRET` | Secret used to sign session tokens; use a long, random value |
| `GEMINI_API_KEY` | Google Gemini API key; server-side only |
| `ALLOW_DEMO_LOGIN` | Enables or disables the demo-login path, if implemented for the selected setup |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public/anon key, used only where applicable and with correct database access policies |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase key; backend only, never expose publicly |
| `TIGER_DATABASE_URL` | Tiger Data / TimescaleDB connection string; backend only |
| `ELEVENLABS_API_KEY` | Optional ElevenLabs API key for voice features |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | SMTP settings for email features such as password resets |
| `FINANCIAL_WEBHOOK_SECRET` | Secret used to validate configured financial webhooks; replace any example value with a strong unique secret |
| `CONFIDENTIAL_COMPUTE_ENABLED`, `CONFIDENTIAL_PLATFORM` | Optional confidential-computing configuration |

Firebase credentials may be provided through the environment or another supported Firebase Admin SDK configuration. See `DEPLOYMENT.md` and the backend configuration code for the required deployment-specific variables.

**Frontend variables:** Only expose values intentionally designed to be public. In Vite, variables prefixed with `VITE_` are bundled into client-side code. Never place service-role keys, database passwords, JWT secrets, webhook secrets, or Gemini/ElevenLabs private API keys in frontend environment variables.

## Running the Application

Start the backend from the `Backend` directory:

```bash
npm run dev
```

Start the frontend from the `Frontend` directory in another terminal:

```bash
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`, while the backend uses port `5000` unless configured otherwise.

Check backend readiness at:

```text
http://localhost:5000/health
```

If the app cannot reach the API, confirm that the backend is running, `VITE_API_URL` points to the correct API origin, CORS includes the frontend origin, and the backend environment variables are configured.

## Testing

Run the backend test script from `Backend`:

```bash
npm test
```

Run the frontend tests from `Frontend`:

```bash
npm test
```

Build the frontend for production:

```bash
npm run build
```

Build the backend TypeScript code:

```bash
npm run build
```

Run tests before deploying changes. Not every optional provider or external API can be tested without its credentials and a configured test environment.

## Deployment

The documented deployment pattern is:

- **Frontend:** Vercel, with the Vite project rooted at `Frontend/`.
- **Backend:** Render, using the repository's `render.yaml` or a web service configured to use `Backend/` as its root directory.
- **Database and external APIs:** Configure credentials in the backend hosting provider's environment-variable settings.

### Vercel frontend

Set the production environment variable:

```env
VITE_API_URL=https://<your-backend-host>
```

Use the actual deployed backend URL, then redeploy the frontend.

### Render backend

Configure the required backend environment variables in the Render dashboard. Make sure `FRONTEND_ORIGIN` contains the exact production frontend origin(s), including `https://`. Keep all private credentials on the backend. Check the service's health endpoint after deployment.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the repository-specific deployment steps and health-check URL.

## Data Services

### Supabase / PostgreSQL

The repository includes `Backend/supabase_schema.sql` and Supabase client dependencies. Configure a project URL and appropriate credentials on the backend. Use least-privilege access and appropriate row-level security policies where applicable.

### Tiger Data / TimescaleDB

The repository includes `Backend/tiger_schema.sql` and a `TIGER_DATABASE_URL` template for time-series transaction storage. Keep the connection string on the server, require encrypted connections where supported, and verify the current implementation before depending on an endpoint.

### Firebase

The backend and frontend include Firebase-related dependencies, and the deployment configuration includes Firebase settings. Use Firebase credentials for the features that rely on Firebase in the current configuration. Do not publish service-account keys or private-key values.

The repository contains more than one data-provider integration. Decide which service owns each kind of record, configure only the intended services, and avoid maintaining inconsistent copies of the same user or transaction data.

## Security

Because the application may handle sensitive financial data:

- Never commit `.env` files, private keys, service-account JSON files, database URLs, or API secrets.
- Store server-side credentials in Render or another secret manager. Do not expose them through Vite `VITE_*` variables.
- Rotate immediately any credentials that have been committed or shared accidentally.
- Replace example webhook secrets and generate a unique, high-entropy secret for each environment.
- Restrict CORS to known frontend origins.
- Validate uploaded files, enforce size/type limits, and avoid retaining bank statements longer than necessary.
- Authenticate protected API routes and authorize every record access against the current user.
- Use parameterized database queries and least-privilege database credentials.
- Avoid logging access tokens, raw bank data, passwords, or full connection strings.
- Review database access policies and deployment settings before using real customer information.

Do not upload real bank statements or other sensitive personal information to a demo deployment unless its data handling, retention, and access controls have been reviewed.

## Roadmap

- [ ] Finish and validate the end-to-end analytics workflows.
- [ ] Add integration tests for authentication, data isolation, and external services.
- [ ] Verify a single source of truth for user, loan, and transaction data across configured providers.
- [ ] Improve audit logging, retention controls, and security documentation.
- [ ] Continue improving cash-flow forecasting and explainable financial insights.
- [ ] Explore a mobile app after the backend API and authentication flows are stable.



## License

This project is distributed under the MIT License. See [LICENSE](LICENSE) for details.

## Disclaimer

CrediMerge is a project for financial analysis and decision support. It does not provide an official credit score, guarantee creditworthiness, offer loans, or guarantee any lending outcome. Verify all calculations and terms independently, and consult a qualified financial professional before making significant financial decisions.

---

If you find this project useful, consider starring the [repository](https://github.com/Bhupendra-glitch/Credimerge) ⭐
