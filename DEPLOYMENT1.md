# Deployment

The Vercel project hosts the React frontend. The Node API must be deployed separately.

## Backend

1. Create a Render Blueprint from this repository using `render.yaml`.
2. Wait for the service to become healthy at `https://credimerge0.onrender.com`.
3. Confirm `https://<backend-host>/health` returns `{"status":"healthy"}`.
4. In the Render service environment, set `GEMINI_API_KEY` to a Google AI Studio API key. Keep this key on Render; do not add it to the frontend or expose it as a `VITE_*` variable. If you change the Vercel production domain, update `FRONTEND_ORIGIN` on Render to include the exact frontend origin (including `https://`), then redeploy the backend.

The demo login can use the CSV fallback without Firebase. For production user data, configure Firebase credentials in the Render service environment.

## Frontend

In the Vercel project settings, add this production environment variable:

```text
VITE_API_URL=https://credimerge0.onrender.com
```

Redeploy the frontend after saving the variable. The login, loan, EMI, credit-health, and AI chat requests will then use the deployed API instead of `localhost`. Ensure the Vercel domain is also included in the Render service's `FRONTEND_ORIGIN` setting so browser requests are allowed by CORS.