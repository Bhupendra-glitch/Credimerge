# Deployment

The Vercel project hosts the React frontend. The Node API must be deployed separately.

## Backend

1. Create a Render Blueprint from this repository using `render.yaml`.
2. Wait for the service to become healthy at its Render URL, for example `https://credimerge-api.onrender.com`.
3. Confirm `https://<backend-host>/health` returns `{"status":"healthy"}`.

The demo login can use the CSV fallback without Firebase. For production user data, configure Firebase credentials in the Render service environment.

## Frontend

In the Vercel project settings, add this production environment variable:

```text
VITE_API_URL=https://<backend-host>
```

Redeploy the frontend after saving the variable. The login, loan, EMI, and credit-health requests will then use the deployed API instead of `localhost`.