from fastapi import FastAPI

app = FastAPI(
    title="CrediMerge Analytics Engine",
    version="1.0.0"
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "credimerge-analytics-engine"
    }