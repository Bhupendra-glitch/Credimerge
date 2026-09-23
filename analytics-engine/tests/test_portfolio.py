"""Tests for loan portfolio analytics."""

import pytest

from app.loans.portfolio import Loan, analyze_loan, analyze_portfolio


@pytest.fixture
def sample_loans() -> list[Loan]:
    """Return the two loans specified for portfolio testing."""
    return [
        Loan(
            loan_id="L001",
            loan_type="Personal Loan",
            principal=100000,
            annual_interest_rate=12,
            tenure_months=12,
        ),
        Loan(
            loan_id="L002",
            loan_type="Vehicle Loan",
            principal=200000,
            annual_interest_rate=18,
            tenure_months=24,
        ),
    ]


def test_analyzes_individual_loan(sample_loans: list[Loan]) -> None:
    """Return EMI and amortization metrics for one loan."""
    analysis = analyze_loan(sample_loans[0])

    assert analysis["loan_id"] == "L001"
    assert analysis["emi"] > 0
    assert analysis["total_payment"] == pytest.approx(
        analysis["principal"] + analysis["total_interest"]
    )
    assert analysis["final_balance"] == pytest.approx(0)
    assert analysis["debt_free_months"] == 12


def test_analyzes_two_loan_portfolio(sample_loans: list[Loan]) -> None:
    """Return individual analysis results for every active loan."""
    portfolio = analyze_portfolio(sample_loans)

    assert portfolio["active_loans"] == 2
    assert len(portfolio["loans"]) == 2


def test_calculates_total_outstanding(sample_loans: list[Loan]) -> None:
    """Sum the outstanding principal of all loans."""
    portfolio = analyze_portfolio(sample_loans)

    assert portfolio["total_outstanding"] == pytest.approx(300000)


def test_calculates_total_monthly_emi(sample_loans: list[Loan]) -> None:
    """Sum each individual loan EMI."""
    portfolio = analyze_portfolio(sample_loans)

    expected_emi = sum(loan["emi"] for loan in portfolio["loans"])
    assert portfolio["total_monthly_emi"] == pytest.approx(expected_emi)


def test_calculates_total_interest(sample_loans: list[Loan]) -> None:
    """Sum amortization-derived interest across loans."""
    portfolio = analyze_portfolio(sample_loans)

    expected_interest = sum(loan["total_interest"] for loan in portfolio["loans"])
    assert portfolio["total_interest"] == pytest.approx(expected_interest)


def test_calculates_total_payment(sample_loans: list[Loan]) -> None:
    """Sum amortization-derived payment totals across loans."""
    portfolio = analyze_portfolio(sample_loans)

    expected_payment = sum(loan["total_payment"] for loan in portfolio["loans"])
    assert portfolio["total_payment"] == pytest.approx(expected_payment)


def test_calculates_principal_weighted_blended_rate(sample_loans: list[Loan]) -> None:
    """Weight annual rates by outstanding principal, not loan count."""
    portfolio = analyze_portfolio(sample_loans)

    assert portfolio["blended_interest_rate"] == pytest.approx(16)


def test_calculates_debt_free_months(sample_loans: list[Loan]) -> None:
    """Use the longest active tenure as the debt-free horizon."""
    portfolio = analyze_portfolio(sample_loans)

    assert portfolio["debt_free_months"] == 24


def test_identifies_highest_interest_loan(sample_loans: list[Loan]) -> None:
    """Identify the loan with the largest annual rate."""
    portfolio = analyze_portfolio(sample_loans)

    assert portfolio["highest_interest_loan"] == {
        "loan_id": "L002",
        "loan_type": "Vehicle Loan",
        "annual_interest_rate": 18,
    }


def test_identifies_largest_emi_loan(sample_loans: list[Loan]) -> None:
    """Identify the loan with the largest monthly EMI."""
    portfolio = analyze_portfolio(sample_loans)

    assert portfolio["largest_emi_loan"]["loan_id"] == "L002"
    assert portfolio["largest_emi_loan"]["loan_type"] == "Vehicle Loan"


def test_rejects_empty_portfolio() -> None:
    """Reject a portfolio with no active loans."""
    with pytest.raises(ValueError):
        analyze_portfolio([])


def test_rejects_invalid_principal() -> None:
    """Reject a non-positive loan principal."""
    with pytest.raises(ValueError):
        Loan("L003", "Personal Loan", 0, 12, 12)


def test_rejects_invalid_interest_rate() -> None:
    """Reject a negative annual interest rate."""
    with pytest.raises(ValueError):
        Loan("L003", "Personal Loan", 100000, -1, 12)


def test_rejects_invalid_tenure() -> None:
    """Reject a non-positive tenure."""
    with pytest.raises(ValueError):
        Loan("L003", "Personal Loan", 100000, 12, 0)
