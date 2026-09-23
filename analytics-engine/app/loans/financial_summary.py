"""Income, expense, and EMI summary calculations for loan portfolios."""

from dataclasses import dataclass
from math import isfinite
from numbers import Real


@dataclass
class FinancialProfile:
    """Validated monthly income and fixed-expense data.

    Attributes:
        monthly_income: Positive, finite monthly income amount.
        fixed_monthly_expenses: Finite monthly fixed expenses that are zero or
            greater.

    Raises:
        ValueError: If either field is non-numeric or non-finite, income is not
            positive, or fixed expenses are negative.
    """

    monthly_income: float
    fixed_monthly_expenses: float

    def __post_init__(self) -> None:
        """Validate and normalize profile values after initialization."""
        self.monthly_income = _validate_finite_number(
            self.monthly_income, "monthly_income"
        )
        self.fixed_monthly_expenses = _validate_finite_number(
            self.fixed_monthly_expenses, "fixed_monthly_expenses"
        )

        if self.monthly_income <= 0:
            raise ValueError("monthly_income must be greater than zero")
        if self.fixed_monthly_expenses < 0:
            raise ValueError("fixed_monthly_expenses cannot be negative")


def build_financial_summary(
    profile: FinancialProfile, portfolio_result: dict
) -> dict:
    """Build income and expense metrics from an analyzed loan portfolio.

    Args:
        profile: Validated monthly income and fixed-expense information.
        portfolio_result: Result returned by ``analyze_portfolio``. It must
            contain a finite, non-negative ``total_monthly_emi`` value.

    Returns:
        A dictionary with income, expenses, portfolio EMI, FOIR percentage,
        available surplus, total fixed outflow, and decimal EMI-to-income
        ratio.

    Raises:
        ValueError: If ``profile`` is invalid or ``portfolio_result`` does not
            provide a valid total monthly EMI.
    """
    if not isinstance(profile, FinancialProfile):
        raise ValueError("profile must be a FinancialProfile instance")

    total_monthly_emi = _extract_total_monthly_emi(portfolio_result)
    emi_to_income_ratio = total_monthly_emi / profile.monthly_income
    total_fixed_outflow = profile.fixed_monthly_expenses + total_monthly_emi
    available_surplus = profile.monthly_income - total_fixed_outflow

    return {
        "monthly_income": profile.monthly_income,
        "fixed_monthly_expenses": profile.fixed_monthly_expenses,
        "total_monthly_emi": total_monthly_emi,
        "foir_percent": emi_to_income_ratio * 100,
        "available_surplus": available_surplus,
        "total_fixed_outflow": total_fixed_outflow,
        "emi_to_income_ratio": emi_to_income_ratio,
    }


def _extract_total_monthly_emi(portfolio_result: dict) -> float:
    """Read and validate total EMI from an analyzed portfolio result."""
    if not isinstance(portfolio_result, dict):
        raise ValueError("portfolio_result must be a dictionary")
    if "total_monthly_emi" not in portfolio_result:
        raise ValueError("portfolio_result must contain total_monthly_emi")

    total_monthly_emi = _validate_finite_number(
        portfolio_result["total_monthly_emi"], "portfolio_result total_monthly_emi"
    )
    if total_monthly_emi < 0:
        raise ValueError("portfolio_result total_monthly_emi cannot be negative")
    return total_monthly_emi


def _validate_finite_number(value: float, field_name: str) -> float:
    """Return a finite real number or raise a clear validation error."""
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field_name} must be numeric")

    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{field_name} must be finite")
    return normalized_value
