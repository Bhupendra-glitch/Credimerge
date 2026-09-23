"""Tests for consolidation calculation without recommendation logic."""

import pytest

from app.consolidation.engine import ConsolidationScenario, calculate_consolidation
from app.loans.portfolio import Loan, analyze_portfolio


@pytest.fixture
def portfolio_result() -> dict:
    """Return the existing two-loan portfolio test data as an analysis result."""
    return analyze_portfolio(
        [
            Loan("L001", "Personal Loan", 100000, 12, 12),
            Loan("L002", "Vehicle Loan", 200000, 18, 24),
        ]
    )


@pytest.fixture
def scenario() -> ConsolidationScenario:
    """Return the specified 14% / 24-month / 2% fee scenario."""
    return ConsolidationScenario(14, 24, 2)


def test_calculates_valid_consolidation(
    portfolio_result: dict, scenario: ConsolidationScenario
) -> None:
    """Calculate current and consolidated values for valid inputs."""
    result = calculate_consolidation(portfolio_result, scenario)

    assert result["current"]["total_outstanding"] == pytest.approx(300000)
    assert result["consolidated"]["monthly_emi"] > 0
    assert result["consolidated"]["final_balance"] == pytest.approx(0)


def test_calculates_zero_interest_consolidation(portfolio_result: dict) -> None:
    """Support a zero-interest consolidated loan."""
    result = calculate_consolidation(
        portfolio_result, ConsolidationScenario(0, 24, 0)
    )

    assert result["consolidated"]["monthly_emi"] == pytest.approx(12500)
    assert result["consolidated"]["total_interest"] == pytest.approx(0)


def test_calculates_zero_processing_fee(
    portfolio_result: dict,
) -> None:
    """Leave total cost equal to payment when there is no processing fee."""
    result = calculate_consolidation(
        portfolio_result, ConsolidationScenario(14, 24, 0)
    )

    assert result["consolidated"]["processing_fee_amount"] == 0
    assert result["consolidated"]["total_cost"] == pytest.approx(
        result["consolidated"]["total_payment"]
    )


def test_calculates_positive_processing_fee(
    portfolio_result: dict, scenario: ConsolidationScenario
) -> None:
    """Include a positive fee in the consolidated total cost."""
    result = calculate_consolidation(portfolio_result, scenario)

    assert result["consolidated"]["processing_fee_amount"] > 0


def test_rejects_negative_interest_rate() -> None:
    """Reject a negative consolidated interest rate."""
    with pytest.raises(ValueError):
        ConsolidationScenario(-1, 24, 2)


def test_rejects_zero_tenure() -> None:
    """Reject a zero consolidated tenure."""
    with pytest.raises(ValueError):
        ConsolidationScenario(14, 0, 2)


def test_rejects_negative_processing_fee() -> None:
    """Reject a negative processing fee percentage."""
    with pytest.raises(ValueError):
        ConsolidationScenario(14, 24, -1)


def test_rejects_invalid_portfolio_result(
    scenario: ConsolidationScenario,
) -> None:
    """Reject an incomplete portfolio result."""
    with pytest.raises(ValueError):
        calculate_consolidation({}, scenario)


def test_new_principal_equals_current_total_outstanding(
    portfolio_result: dict, scenario: ConsolidationScenario
) -> None:
    """Use portfolio outstanding balance as the consolidated principal."""
    result = calculate_consolidation(portfolio_result, scenario)

    assert result["consolidated"]["principal"] == pytest.approx(
        portfolio_result["total_outstanding"]
    )


def test_calculates_processing_fee_amount(
    portfolio_result: dict, scenario: ConsolidationScenario
) -> None:
    """Calculate the fee as a percentage of consolidated principal."""
    result = calculate_consolidation(portfolio_result, scenario)

    expected_fee = portfolio_result["total_outstanding"] * 2 / 100
    assert result["consolidated"]["processing_fee_amount"] == pytest.approx(
        expected_fee
    )


def test_total_cost_includes_payment_and_processing_fee(
    portfolio_result: dict, scenario: ConsolidationScenario
) -> None:
    """Add the processing fee to the new total payment."""
    result = calculate_consolidation(portfolio_result, scenario)

    assert result["consolidated"]["total_cost"] == pytest.approx(
        result["consolidated"]["total_payment"]
        + result["consolidated"]["processing_fee_amount"]
    )


def test_uses_current_values_directly_from_portfolio_result(
    scenario: ConsolidationScenario,
) -> None:
    """Copy current-cost metrics directly instead of recalculating them."""
    supplied_portfolio = {
        "total_outstanding": 300000,
        "total_monthly_emi": 12345,
        "total_interest": 45678,
        "total_payment": 345678,
        "debt_free_months": 60,
    }

    result = calculate_consolidation(supplied_portfolio, scenario)

    assert result["current"] == {
        "total_outstanding": 300000.0,
        "monthly_emi": 12345.0,
        "total_interest": 45678.0,
        "total_payment": 345678.0,
        "debt_free_months": 60,
    }
