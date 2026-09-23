const ANALYTICS_ENGINE_URL =
  (import.meta.env.VITE_ANALYTICS_ENGINE_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

export async function checkAnalyticsEngine() {
  const response = await fetch(`${ANALYTICS_ENGINE_URL}/health`);

  if (!response.ok) {
    throw new Error("Analytics Engine is unavailable");
  }

  return response.json();
}