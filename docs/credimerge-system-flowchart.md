# CrediMerge — System Flowchart

This diagram summarizes the main user journey and architecture documented in the project README. It is an architecture overview; verify service and database wiring against the deployed configuration.

```mermaid
flowchart TD
    A([User]) --> B[React + Vite Frontend<br/>Login • Dashboard • Loans • Credit Health]
    B --> C{Authenticated?}
    C -- No --> D[Register / Login]
    D --> E[Node.js + Express Backend<br/>JWT Authentication and Authorization]
    C -- Yes --> E
    E --> F{Choose a feature}

    F --> G[Loan and EMI Management]
    F --> H[Bank Statement Upload<br/>PDF / CSV / Demo Data]
    F --> I[AI Financial Assistant]
    F --> J[Dashboard Summary]
    F --> K[Consolidation Simulator]

    G --> L[Loan and EMI Services<br/>CRUD • EMI • Amortization]
    L --> M[(Firestore<br/>User and loan records)]
    H --> N[Statement Parser + Python Analytics Engine]
    N --> O[Alternative Credit Health<br/>5-factor score • Surplus • Safe EMI • Signals]
    O --> P[(Tiger Data / TimescaleDB<br/>Financial transactions and time-series cashflow)]
    O --> M
    P --> Q[Cashflow Trends and 30/60/90-Day Forecasts]
    J --> M
    K --> L
    L --> R[Compare Consolidation Offers<br/>EMI • Total interest • Debt-free timeline]
    I --> S[Backend Gemini API Proxy]
    S --> T[Google Gemini API<br/>Context-aware explanations]

    M --> U[Frontend Results<br/>Charts • Reports • Explanations]
    Q --> U
    R --> U
    T --> U
    U --> V([User reviews results])
```

**Security boundary:** The frontend calls the Express API. Keep database connection strings and Gemini credentials server-side; enforce JWT authorization and user-scoped data access on every private endpoint.
