"""Pure calculations for replacing a loan portfolio with one new loan."""

from dataclasses import dataclass
from math import isfinite
from numbers import Real

from app.emi.amortization import build_amortization_schedule, summarize_amortization
from app.emi.calculator import calculate_emi
from app.emi.validators import (
    validate_annual_interest_rate,
    validate_principal,
    validate_tenure_months,
)


@dataclass
class ConsolidationScenario:
    """Validated terms proposed for a hypothetical consolidated loan.

    Attributes:
        new_annual_interest_rate: Non-negative annual rate expressed as a
            percentage.
        new_tenure_months: Positive whole number of repayment months.
        processing_fee_percent: Finite non-negative percentage charged on the
            consolidated principal.

    Raises:
        ValueError: If a field is non-numeric, non-finite, negative where not
            allowed, or the tenure is not a positive integer.
    """

    new_annual_interest_rate: float
    new_tenure_months: int
    processing_fee_percent: float

    def __post_init__(self) -> None:
        """Validate and normalize scenario terms after initialization."""
        self.new_annual_interest_rate = validate_annual_interest_rate(
            self.new_annual_interest_rate
        )
        self.new_tenure_months = validate_tenure_months(self.new_tenure_months)
        self.processing_fee_percent = _validate_non_negative_number(
            self.processing_fee_percent, "processing_fee_percent"
        )


def calculate_consolidation(
    portfolio_result: dict, scenario: ConsolidationScenario
) -> dict:
    """Calculate current and consolidated-loan costs without a verdict.

    Args:
        portfolio_result: Result returned by ``analyze_portfolio`` containing
            the current portfolio balances, costs, EMI, and debt-free horizon.
        scenario: Validated proposed interest rate, tenure, and fee terms.

    Returns:
        A dictionary containing current portfolio costs, consolidated-loan
        costs, and raw differences between the two arrangements.

    Raises:
        ValueError: If the portfolio result is incomplete or invalid, or the
            scenario is not a :class:`ConsolidationScenario` instance.
    """
    if not isinstance(scenario, ConsolidationScenario):
        raise ValueError("scenario must be a ConsolidationScenario instance")

    current = _extract_current_portfolio_values(portfolio_result)
    new_principal = current["total_outstanding"]
    new_monthly_emi = calculate_emi(
        new_principal, scenario.new_annual_interest_rate, scenario.new_tenure_months
    )
    schedule = build_amortization_schedule(
        new_principal, scenario.new_annual_interest_rate, scenario.new_tenure_months
    )
    summary = summarize_amortization(schedule, new_principal)
    processing_fee_amount = new_principal * scenario.processing_fee_percent / 100
    new_total_cost = summary["total_payment"] + processing_fee_amount

    consolidated = {
        "principal": new_principal,
        "annual_interest_rate": scenario.new_annual_interest_rate,
        "tenure_months": scenario.new_tenure_months,
        "monthly_emi": new_monthly_emi,
        "total_interest": summary["total_interest"],
        "total_payment": summary["total_payment"],
        "final_balance": summary["final_balance"],
        "processing_fee_percent": scenario.processing_fee_percent,
        "processing_fee_amount": processing_fee_amount,
        "total_cost": new_total_cost,
        "debt_free_months": scenario.new_tenure_months,
    }

    return {
        "current": current,
        "consolidated": consolidated,
        "monthly_emi_difference": new_monthly_emi - current["monthly_emi"],
        "interest_difference": summary["total_interest"] - current["total_interest"],
        "total_cost_difference": new_total_cost - current["total_payment"],
        "tenure_difference_months": (
            scenario.new_tenure_months - current["debt_free_months"]
        ),
    }


def _extract_current_portfolio_values(portfolio_result: dict) -> dict:
    """Validate and copy the current values supplied by portfolio analysis."""
    if not isinstance(portfolio_result, dict):
        raise ValueError("portfolio_result must be a dictionary")

    required_keys = (
        "total_outstanding",
        "total_monthly_emi",
        "total_interest",
        "total_payment",
        "debt_free_months",
    )
    missing_keys = [key for key in required_keys if key not in portfolio_result]
    if missing_keys:
        raise ValueError(
            "portfolio_result is missing required keys: " + ", ".join(missing_keys)
        )

    return {
        "total_outstanding": validate_principal(portfolio_result["total_outstanding"]),
        "monthly_emi": _validate_non_negative_number(
            portfolio_result["total_monthly_emi"], "portfolio_result total_monthly_emi"
        ),
        "total_interest": _validate_non_negative_number(
            portfolio_result["total_interest"], "portfolio_result total_interest"
        ),
        "total_payment": _validate_non_negative_number(
            portfolio_result["total_payment"], "portfolio_result total_payment"
        ),
        "debt_free_months": validate_tenure_months(
            portfolio_result["debt_free_months"]
        ),
    }


def _validate_non_negative_number(value: float, field_name: str) -> float:
    """Return a finite non-negative number or raise a clear validation error."""
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field_name} must be numeric")

    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{field_name} must be finite")
    if normalized_value < 0:
        raise ValueError(f"{field_name} cannot be negative")
    return normalized_value
