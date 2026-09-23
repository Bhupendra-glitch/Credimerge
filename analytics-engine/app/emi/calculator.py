"""Reducing-balance EMI calculation functions."""

from app.emi.validators import (
    validate_annual_interest_rate,
    validate_principal,
    validate_tenure_months,
)


def calculate_emi(
    principal: float,
    annual_interest_rate: float,
    tenure_months: int,
) -> float:
    """Calculate the monthly EMI for a reducing-balance loan.

    Args:
        principal: Total loan amount. It must be a positive finite number.
        annual_interest_rate: Annual interest rate expressed as a percentage.
            It must be a finite number that is zero or greater.
        tenure_months: Number of monthly repayments. It must be a positive
            integer.

    Returns:
        The unrounded monthly EMI as a float.

    Raises:
        ValueError: If the principal is not positive, the interest rate is
            negative or non-numeric, or the tenure is not a positive integer.
    """
    validated_principal = validate_principal(principal)
    validated_rate = validate_annual_interest_rate(annual_interest_rate)
    validated_tenure = validate_tenure_months(tenure_months)

    if validated_rate == 0:
        return validated_principal / validated_tenure

    monthly_interest_rate = validated_rate / 12 / 100
    growth_factor = (1 + monthly_interest_rate) ** validated_tenure
    return (
        validated_principal
        * monthly_interest_rate
        * growth_factor
        / (growth_factor - 1)
    )
