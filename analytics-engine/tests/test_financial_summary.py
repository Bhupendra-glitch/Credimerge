"""Tests for monthly income, expenses, and portfolio EMI summaries."""

import pytest

from app.loans.financial_summary import FinancialProfile, build_financial_summary


@pytest.fixture
def example_portfolio_result() -> dict:
    """Return the specified portfolio EMI value."""
    return {"total_monthly_emi": 26653}


def test_positive_income_builds_summary(example_portfolio_result: dict) -> None:
    """Build a summary for a valid positive-income profile."""
    profile = FinancialProfile(60000, 20000)
    summary = build_financial_summary(profile, example_portfolio_result)

    assert summary["monthly_income"] == 60000
    assert summary["fixed_monthly_expenses"] == 20000
    assert summary["total_monthly_emi"] == 26653


def test_zero_income_raises_value_error() -> None:
    """Reject zero monthly income."""
    with pytest.raises(ValueError):
        FinancialProfile(0, 20000)


def test_negative_income_raises_value_error() -> None:
    """Reject negative monthly income."""
    with pytest.raises(ValueError):
        FinancialProfile(-1, 20000)


def test_negative_fixed_expenses_raise_value_error() -> None:
    """Reject negative fixed monthly expenses."""
    with pytest.raises(ValueError):
        FinancialProfile(60000, -1)


def test_zero_fixed_expenses_work(example_portfolio_result: dict) -> None:
    """Allow a profile with no fixed expenses."""
    summary = build_financial_summary(
        FinancialProfile(60000, 0), example_portfolio_result
    )

    assert summary["fixed_monthly_expenses"] == 0
    assert summary["total_fixed_outflow"] == 26653


def test_positive_emi_calculates_foir_and_ratio(
    example_portfolio_result: dict,
) -> None:
    """Calculate FOIR as a percentage and EMI-to-income as a decimal."""
    summary = build_financial_summary(
        FinancialProfile(60000, 20000), example_portfolio_result
    )

    assert summary["foir_percent"] == pytest.approx(44.4216666667)
    assert summary["emi_to_income_ratio"] == pytest.approx(0.4442166667)


def test_calculates_available_surplus(example_portfolio_result: dict) -> None:
    """Subtract fixed outflows from monthly income."""
    summary = build_financial_summary(
        FinancialProfile(60000, 20000), example_portfolio_result
    )

    assert summary["total_fixed_outflow"] == pytest.approx(46653)
    assert summary["available_surplus"] == pytest.approx(13347)


def test_preserves_negative_available_surplus(
    example_portfolio_result: dict,
) -> None:
    """Keep a negative surplus as meaningful financial information."""
    summary = build_financial_summary(
        FinancialProfile(30000, 20000), example_portfolio_result
    )

    assert summary["available_surplus"] == pytest.approx(-16653)


def test_invalid_portfolio_result_raises_value_error() -> None:
    """Reject a portfolio result without a total monthly EMI."""
    with pytest.raises(ValueError):
        build_financial_summary(FinancialProfile(60000, 20000), {})
