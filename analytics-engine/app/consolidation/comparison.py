"""Comparison metrics for current and consolidated loan arrangements."""

from math import isfinite
from numbers import Integral, Real


def compare_consolidation(calculation_result: dict) -> dict:
    """Compare the current portfolio with a calculated consolidated loan.

    Args:
        calculation_result: Result returned by ``calculate_consolidation``. It
            must contain valid ``current`` and ``consolidated`` cost metrics.

    Returns:
        A dictionary of copied current and consolidated values, changes,
        percentage changes, savings, and processing-fee information.

    Raises:
        ValueError: If the calculation result is incomplete or contains invalid
            numeric values.
    """
    current, consolidated = _extract_comparison_values(calculation_result)

    emi_change = consolidated["monthly_emi"] - current["monthly_emi"]
    interest_change = consolidated["total_interest"] - current["total_interest"]
    total_cost_change = consolidated["total_cost"] - current["total_payment"]

    return {
        "current_emi": current["monthly_emi"],
        "consolidated_emi": consolidated["monthly_emi"],
        "emi_change": emi_change,
        "emi_change_percent": _percentage_change(emi_change, current["monthly_emi"]),
        "current_interest": current["total_interest"],
        "consolidated_interest": consolidated["total_interest"],
        "interest_change": interest_change,
        "interest_change_percent": _percentage_change(
            interest_change, current["total_interest"]
        ),
        "current_total_cost": current["total_payment"],
        "consolidated_total_cost": consolidated["total_cost"],
        "total_cost_change": total_cost_change,
        "total_cost_change_percent": _percentage_change(
            total_cost_change, current["total_payment"]
        ),
        "current_debt_free_months": current["debt_free_months"],
        "consolidated_debt_free_months": consolidated["debt_free_months"],
        "tenure_change_months": (
            consolidated["debt_free_months"] - current["debt_free_months"]
        ),
        "processing_fee": consolidated["processing_fee_amount"],
        "monthly_emi_saving": current["monthly_emi"] - consolidated["monthly_emi"],
        "additional_total_cost": max(total_cost_change, 0.0),
        "total_cost_saving": max(-total_cost_change, 0.0),
    }


def _extract_comparison_values(calculation_result: dict) -> tuple[dict, dict]:
    """Validate and copy the Step 6 values needed for a comparison."""
    if not isinstance(calculation_result, dict):
        raise ValueError("calculation_result must be a dictionary")

    current = calculation_result.get("current")
    consolidated = calculation_result.get("consolidated")
    if not isinstance(current, dict) or not isinstance(consolidated, dict):
        raise ValueError("calculation_result must contain current and consolidated data")

    current_values = {
        "monthly_emi": _required_non_negative_number(
            current, "monthly_emi", "current"
        ),
        "total_interest": _required_non_negative_number(
            current, "total_interest", "current"
        ),
        "total_payment": _required_non_negative_number(
            current, "total_payment", "current"
        ),
        "debt_free_months": _required_positive_integer(
            current, "debt_free_months", "current"
        ),
    }
    consolidated_values = {
        "monthly_emi": _required_non_negative_number(
            consolidated, "monthly_emi", "consolidated"
        ),
        "total_interest": _required_non_negative_number(
            consolidated, "total_interest", "consolidated"
        ),
        "total_cost": _required_non_negative_number(
            consolidated, "total_cost", "consolidated"
        ),
        "debt_free_months": _required_positive_integer(
            consolidated, "debt_free_months", "consolidated"
        ),
        "processing_fee_amount": _required_non_negative_number(
            consolidated, "processing_fee_amount", "consolidated"
        ),
    }
    return current_values, consolidated_values


def _required_non_negative_number(source: dict, key: str, section: str) -> float:
    """Read one required finite, non-negative numeric value."""
    if key not in source:
        raise ValueError(f"{section} is missing required key: {key}")

    value = source[key]
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{section} {key} must be numeric")
    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{section} {key} must be finite")
    if normalized_value < 0:
        raise ValueError(f"{section} {key} cannot be negative")
    return normalized_value


def _required_positive_integer(source: dict, key: str, section: str) -> int:
    """Read one required positive whole-number value."""
    if key not in source:
        raise ValueError(f"{section} is missing required key: {key}")

    value = source[key]
    if isinstance(value, bool) or not isinstance(value, Integral) or value <= 0:
        raise ValueError(f"{section} {key} must be a positive integer")
    return int(value)


def _percentage_change(change: float, baseline: float) -> float:
    """Return percentage change while avoiding division by a zero baseline."""
    if baseline == 0:
        return 0.0
    return change / baseline * 100
