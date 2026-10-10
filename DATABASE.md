# Database Documentation

## Overview

CrediMerge uses **Supabase PostgreSQL** as its primary application
database.

The database stores application data required for financial analytics,
user-specific information, loan analysis, transaction analysis, and
credit-health features.

Firebase Authentication is used for user authentication, while
Supabase/PostgreSQL is used for application data.

## Architecture

``` text
User
 │
 ▼
Firebase Authentication
 │
 │ authenticated user ID
 ▼
CrediMerge Backend
 │
 ▼
Supabase
 │
 ▼
PostgreSQL
```

## Database Responsibilities

Supabase/PostgreSQL can be used for:

-   User profile/application data
-   Loan information
-   Transaction data
-   Income and expense records
-   Financial analysis results
-   Forecast data
-   Credit-health calculations
-   Consolidation analysis
-   Application preferences

The exact tables should match the current database schema implemented in
the project.

## Authentication and User IDs

Firebase Authentication manages user identity.

A user should be associated with a stable authentication identifier,
such as the Firebase UID.

Conceptually:

``` text
Firebase UID
     │
     ▼
User/Application Record
     │
     ├── Loans
     ├── Transactions
     ├── Forecasts
     └── Credit Health
```

Never rely only on a user ID supplied by the frontend. The backend
should derive the authenticated identity from a verified authentication
token.

## Recommended Schema

A possible logical schema is:

``` text
users
 ├── id
 ├── firebase_uid
 ├── name
 ├── email
 └── created_at

loans
 ├── id
 ├── user_id
 ├── lender
 ├── principal
 ├── outstanding_amount
 ├── interest_rate
 ├── tenure
 ├── emi
 └── created_at

transactions
 ├── id
 ├── user_id
 ├── transaction_date
 ├── transaction_type
 ├── amount
 ├── category
 └── description

forecasts
 ├── id
 ├── user_id
 ├── forecast_period
 ├── predicted_income
 ├── predicted_expenses
 └── created_at

credit_health
 ├── id
 ├── user_id
 ├── score
 ├── score_factors
 └── created_at

consolidation_analysis
 ├── id
 ├── user_id
 ├── total_outstanding
 ├── current_emi
 ├── proposed_emi
 ├── estimated_savings
 └── created_at
```

> This is a logical reference schema. Always treat the actual SQL schema
> in the project/Supabase dashboard as the source of truth.

## Row Level Security

Supabase Row Level Security (RLS) should be enabled for user-specific
tables.

The goal is:

``` text
User A
  │
  ├── Can read User A data
  ├── Can create User A data
  ├── Can update User A data
  └── Cannot read User B data
```

Never rely only on frontend filtering to protect user data.

## Example RLS Concept

A policy should ensure that the authenticated user can access only
records belonging to that user.

Conceptually:

``` sql
CREATE POLICY "Users can access their own records"
ON transactions
FOR SELECT
USING (user_id = auth.uid());
```

The exact policy depends on how Firebase Authentication and Supabase
authentication are integrated in the current implementation.

Do not copy this policy blindly into production without matching it to
the project's authentication architecture.

## Database Security

Recommended practices:

-   Enable RLS for private tables.
-   Keep privileged credentials on the backend.
-   Never expose the Supabase service-role key in frontend code.
-   Use least-privilege access.
-   Validate all user input.
-   Use parameterized queries/safe database libraries.
-   Avoid storing unnecessary personal or financial information.
-   Avoid logging complete bank statements or sensitive transaction
    data.

## Environment Variables

Backend environment variables may include:

``` env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

If a server-side privileged key is required:

``` env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service-role key must remain server-side and must never be exposed
through frontend code.

## Data Flow

A typical financial-analysis request can follow this flow:

``` text
User
 │
 ▼
React Frontend
 │
 ▼
Firebase Authentication
 │
 ▼
Node/Express Backend
 │
 ├──► Validate user
 │
 ├──► Read transaction/loan data
 │
 ▼
Python Financial Analytics
 │
 ├── Cash-flow analysis
 ├── Loan analysis
 ├── Forecasting
 ├── Risk simulation
 └── Credit-health analysis
 │
 ▼
Backend
 │
 ▼
Supabase
 │
 ▼
Frontend Dashboard
```

## Financial Data Considerations

Financial data should be treated as sensitive application data.

Recommended practices:

-   Collect only data required for the requested feature.
-   Avoid storing raw bank statements permanently unless required.
-   Prefer structured transaction data after processing.
-   Protect uploaded documents.
-   Do not expose one user's data to another user.
-   Delete temporary processing files when they are no longer required.
-   Use HTTPS for data transmission.

## Backups and Recovery

For production deployments:

-   Enable appropriate Supabase backup/recovery features.
-   Periodically verify that backups are usable.
-   Keep database migrations in version control.
-   Test important schema changes before production deployment.

## Database Migrations

Database schema changes should be tracked through migration files where
possible.

Example:

``` text
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_add_loans.sql
    └── 003_add_forecasts.sql
```

Avoid making undocumented production schema changes.

## Performance

For larger datasets:

-   Add indexes to frequently queried columns.
-   Use pagination for transaction history.
-   Avoid fetching unnecessary columns.
-   Aggregate financial data in the backend/database where appropriate.
-   Avoid loading thousands of transactions into the frontend at once.

Potential indexes include:

``` sql
CREATE INDEX idx_transactions_user_id
ON transactions(user_id);

CREATE INDEX idx_transactions_date
ON transactions(transaction_date);

CREATE INDEX idx_loans_user_id
ON loans(user_id);
```

Use indexes based on actual query patterns.

## Data Lifecycle

A recommended lifecycle is:

``` text
Input
  ↓
Validation
  ↓
Secure Processing
  ↓
Structured Storage
  ↓
Financial Analytics
  ↓
Dashboard / Insights
  ↓
Retention / Deletion according to project requirements
```

## Important Disclaimer

CrediMerge is a financial decision-support and educational platform.

Database-stored scores and analytics are application-generated
estimates. They are **not official CIBIL scores, credit-bureau records,
lender decisions, or guarantees of loan approval**.
