"""Validation helpers for EMI calculations."""

from math import isfinite
from numbers import Integral, Real


def validate_principal(principal: float) -> float:
    """Validate and normalize a loan principal amount.

    Args:
        principal: Total loan amount. It must be a finite numeric value greater
            than zero.

    Returns:
        The validated principal as a float.

    Raises:
        ValueError: If ``principal`` is non-numeric, non-finite, or not greater
            than zero.
    """
    validated_principal = _validate_finite_number(principal, "principal")
    if validated_principal <= 0:
        raise ValueError("principal must be greater than zero")
    return validated_principal


def validate_annual_interest_rate(annual_interest_rate: float) -> float:
    """Validate and normalize an annual interest rate percentage.

    Args:
        annual_interest_rate: Annual percentage rate. It must be a finite
            numeric value that is zero or greater.

    Returns:
        The validated annual interest rate as a float.

    Raises:
        ValueError: If ``annual_interest_rate`` is non-numeric, non-finite, or
            negative.
    """
    validated_rate = _validate_finite_number(
        annual_interest_rate, "annual_interest_rate"
    )
    if validated_rate < 0:
        raise ValueError("annual_interest_rate cannot be negative")
    return validated_rate


def validate_tenure_months(tenure_months: int) -> int:
    """Validate a loan tenure expressed as a whole number of months.

    Args:
        tenure_months: Number of monthly repayments. It must be an integer
            greater than zero.

    Returns:
        The validated tenure in months.

    Raises:
        ValueError: If ``tenure_months`` is not an integer or is not greater
            than zero.
    """
    if isinstance(tenure_months, bool) or not isinstance(tenure_months, Integral):
        raise ValueError("tenure_months must be an integer")
    if tenure_months <= 0:
        raise ValueError("tenure_months must be greater than zero")
    return int(tenure_months)


def _validate_finite_number(value: float, field_name: str) -> float:
    """Return a finite real number or raise a clear validation error."""
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field_name} must be numeric")

    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{field_name} must be finite")
    return normalized_value
