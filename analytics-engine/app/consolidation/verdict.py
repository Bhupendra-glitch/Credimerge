"""Deterministic verdict rules for consolidation comparisons."""

from math import isclose, isfinite
from numbers import Real


_RELATIVE_TOLERANCE = 1e-9
_ABSOLUTE_TOLERANCE = 1e-9


def get_consolidation_verdict(comparison: dict) -> dict:
    """Classify a consolidation comparison using transparent financial rules.

    Args:
        comparison: Comparison produced by ``compare_consolidation`` containing
            current and consolidated EMI and total-cost values.

    Returns:
        A dictionary with a deterministic verdict, title, explanation code, and
        the financial values used to make the classification.

    Raises:
        ValueError: If ``comparison`` lacks required metrics or has invalid
            numeric values.
    """
    metrics = _extract_verdict_metrics(comparison)
    emi_is_lower = _is_meaningfully_lower(
        metrics["consolidated_emi"], metrics["current_emi"]
    )
    costs_are_equal = isclose(
        metrics["consolidated_total_cost"],
        metrics["current_total_cost"],
        rel_tol=_RELATIVE_TOLERANCE,
        abs_tol=_ABSOLUTE_TOLERANCE,
    )
    cost_is_lower = _is_meaningfully_lower(
        metrics["consolidated_total_cost"], metrics["current_total_cost"]
    )

    if emi_is_lower and (cost_is_lower or costs_are_equal):
        verdict = "beneficial"
        title = "Beneficial"
        explanation_code = "LOWER_EMI_AND_LOWER_TOTAL_COST"
    elif emi_is_lower:
        verdict = "relief_but_costlier"
        title = "Relief but costlier"
        explanation_code = "LOWER_EMI_HIGHER_TOTAL_COST"
    else:
        verdict = "not_beneficial"
        title = "Not beneficial"
        explanation_code = "NO_MEANINGFUL_FINANCIAL_IMPROVEMENT"

    return {
        "verdict": verdict,
        "title": title,
        "explanation_code": explanation_code,
        "key_metrics": metrics,
    }


def _extract_verdict_metrics(comparison: dict) -> dict:
    """Validate and copy the four comparison metrics needed for a verdict."""
    if not isinstance(comparison, dict):
        raise ValueError("comparison must be a dictionary")

    required_keys = (
        "current_emi",
        "consolidated_emi",
        "current_total_cost",
        "consolidated_total_cost",
    )
    missing_keys = [key for key in required_keys if key not in comparison]
    if missing_keys:
        raise ValueError("comparison is missing required keys: " + ", ".join(missing_keys))

    return {
        key: _validate_non_negative_number(comparison[key], key)
        for key in required_keys
    }


def _validate_non_negative_number(value: float, field_name: str) -> float:
    """Return a finite non-negative numeric metric or raise ValueError."""
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field_name} must be numeric")
    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{field_name} must be finite")
    if normalized_value < 0:
        raise ValueError(f"{field_name} cannot be negative")
    return normalized_value


def _is_meaningfully_lower(candidate: float, baseline: float) -> bool:
    """Return whether a value is lower beyond floating-point tolerance."""
    return candidate < baseline and not isclose(
        candidate,
        baseline,
        rel_tol=_RELATIVE_TOLERANCE,
        abs_tol=_ABSOLUTE_TOLERANCE,
    )
