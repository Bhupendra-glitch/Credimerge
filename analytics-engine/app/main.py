from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.risk.monte_carlo import (
    RiskSimulationInput,
    simulate_emi_affordability,
    compare_emi_affordability,
)

app = FastAPI(
    title="CrediMerge Analytics Engine",
    description="Python Financial Analytics Engine for time-series forecasting, risk scoring, and Monte Carlo simulation",
    version="1.1.0"
)


class RiskSimulationPayload(BaseModel):
    monthly_income: float = Field(..., gt=0, description="Expected monthly income")
    fixed_monthly_expenses: float = Field(0.0, ge=0, description="Fixed monthly expenses")
    emi: float = Field(..., gt=0, description="Current monthly EMI")
    income_volatility_percent: float = Field(..., ge=0, le=100, description="Income volatility percent")
    alternative_emi: Optional[float] = Field(None, gt=0, description="Optional proposed consolidation EMI")
    simulations: int = Field(10000, gt=100, le=50000)
    random_seed: int = 42


class TimeSeriesForecastPayload(BaseModel):
    user_id: str
    historical_daily_incomes: List[float] = []
    historical_daily_expenses: List[float] = []
    current_emi: float = 0.0


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "credimerge-analytics-engine",
        "features": ["monte_carlo", "emi_affordability", "time_series_forecasting"]
    }


@app.post("/api/analytics/risk-simulation")
def run_risk_simulation(payload: RiskSimulationPayload):
    try:
        sim_input = RiskSimulationInput(
            monthly_income=payload.monthly_income,
            fixed_monthly_expenses=payload.fixed_monthly_expenses,
            emi=payload.emi,
            income_volatility_percent=payload.income_volatility_percent,
            simulations=payload.simulations,
            random_seed=payload.random_seed,
        )

        if payload.alternative_emi:
            result = compare_emi_affordability(sim_input, payload.alternative_emi)
        else:
            result = simulate_emi_affordability(sim_input)

        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/analytics/forecast")
def compute_forecast(payload: TimeSeriesForecastPayload):
    try:
        incomes = payload.historical_daily_incomes
        expenses = payload.historical_daily_expenses
        
        avg_income = sum(incomes) / len(incomes) if incomes else 0.0
        avg_expense = sum(expenses) / len(expenses) if expenses else 0.0
        daily_surplus = avg_income - avg_expense

        forecast_30 = {"days": 30, "projected_income": round(avg_income * 30, 2), "projected_expenses": round(avg_expense * 30, 2), "net_savings": round(daily_surplus * 30, 2)}
        forecast_60 = {"days": 60, "projected_income": round(avg_income * 60 * 0.95, 2), "projected_expenses": round(avg_expense * 60, 2), "net_savings": round((avg_income * 0.95 - avg_expense) * 60, 2)}
        forecast_90 = {"days": 90, "projected_income": round(avg_income * 90 * 0.90, 2), "projected_expenses": round(avg_expense * 90, 2), "net_savings": round((avg_income * 0.90 - avg_expense) * 90, 2)}

        return {
            "success": True,
            "user_id": payload.user_id,
            "projections": {
                "30_day": forecast_30,
                "60_day": forecast_60,
                "90_day": forecast_90,
            },
            "daily_run_rate": round(daily_surplus, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))