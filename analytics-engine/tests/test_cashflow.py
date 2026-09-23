"""Tests for monthly transaction cashflow aggregation and features."""

from datetime import date

import pytest

from app.transactions.cashflow import build_monthly_cashflow, summarize_cashflow
from app.transactions.categorizer import CategorizedTransaction, TransactionCategory


def _categorized(
    transaction_date: date,
    amount: float,
    transaction_type: str,
    category: TransactionCategory,
) -> CategorizedTransaction:
    """Create a synthetic categorized transaction for cashflow tests."""
    return CategorizedTransaction(
        date=transaction_date,
        description=category.value,
        amount=amount,
        transaction_type=transaction_type,
        category=category,
        source="manual",
    )


@pytest.fixture
def transactions() -> list[CategorizedTransaction]:
    """Return three months of representative income and debit activity."""
    return [
        _categorized(date(2026, 1, 5), 40000, "CREDIT", TransactionCategory.SALARY),
        _categorized(date(2026, 1, 7), 10000, "DEBIT", TransactionCategory.RENT),
        _categorized(date(2026, 1, 10), 5000, "DEBIT", TransactionCategory.EMI),
        _categorized(date(2026, 1, 12), 500, "DEBIT", TransactionCategory.BOUNCE_PENALTY),
        _categorized(date(2026, 2, 5), 30000, "CREDIT", TransactionCategory.BUSINESS_INCOME),
        _categorized(date(2026, 2, 10), 4000, "DEBIT", TransactionCategory.FOOD),
        _categorized(date(2026, 3, 5), 50000, "CREDIT", TransactionCategory.GIG_INCOME),
        _categorized(date(2026, 3, 10), 2000, "DEBIT", TransactionCategory.UTILITY),
    ]


def test_groups_transactions_by_month(transactions: list[CategorizedTransaction]) -> None:
    """Create one cashflow row per observed month."""
    assert len(build_monthly_cashflow(transactions)) == 3


def test_sorts_multiple_months_chronologically(transactions: list[CategorizedTransaction]) -> None:
    """Return monthly labels in chronological order."""
    months = build_monthly_cashflow(list(reversed(transactions)))

    assert [month.month for month in months] == ["2026-01", "2026-02", "2026-03"]


def test_creates_zero_row_for_missing_month() -> None:
    """Insert a zero-valued row for a gap in transaction months."""
    rows = build_monthly_cashflow(
        [
            _categorized(date(2026, 1, 5), 40000, "CREDIT", TransactionCategory.SALARY),
            _categorized(date(2026, 4, 5), 1000, "DEBIT", TransactionCategory.FOOD),
        ]
    )

    march = rows[2]
    assert march.month == "2026-03"
    assert march.total_income == march.total_expenses == march.net_cashflow == 0
    assert march.transaction_count == 0


def test_calculates_income_totals(transactions: list[CategorizedTransaction]) -> None:
    """Include only defined income categories from credit transactions."""
    january = build_monthly_cashflow(transactions)[0]

    assert january.total_income == 40000


def test_calculates_expense_totals(transactions: list[CategorizedTransaction]) -> None:
    """Include every debit in monthly expenses."""
    january = build_monthly_cashflow(transactions)[0]

    assert january.total_expenses == 15500


def test_calculates_emi_totals(transactions: list[CategorizedTransaction]) -> None:
    """Expose EMI debits as an expense breakdown."""
    assert build_monthly_cashflow(transactions)[0].total_emi == 5000


def test_calculates_bounce_totals(transactions: list[CategorizedTransaction]) -> None:
    """Expose bounce penalties as an expense breakdown."""
    assert build_monthly_cashflow(transactions)[0].total_bounce_penalty == 500


def test_calculates_net_cashflow(transactions: list[CategorizedTransaction]) -> None:
    """Subtract all expenses from recognized income."""
    assert build_monthly_cashflow(transactions)[0].net_cashflow == 24500


def test_calculates_transaction_count(transactions: list[CategorizedTransaction]) -> None:
    """Count all transactions in the monthly row."""
    assert build_monthly_cashflow(transactions)[0].transaction_count == 4


def test_calculates_average_monthly_income(transactions: list[CategorizedTransaction]) -> None:
    """Average income across the available monthly history."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.average_monthly_income == pytest.approx(40000)


def test_calculates_average_monthly_expenses(transactions: list[CategorizedTransaction]) -> None:
    """Average expenses across the available monthly history."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.average_monthly_expenses == pytest.approx(21500 / 3)


def test_calculates_average_monthly_emi(transactions: list[CategorizedTransaction]) -> None:
    """Average EMI breakdown across the available monthly history."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.average_monthly_emi == pytest.approx(5000 / 3)


def test_calculates_average_monthly_net_cashflow(transactions: list[CategorizedTransaction]) -> None:
    """Average the monthly net cashflow values."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.average_monthly_net_cashflow == pytest.approx(98500 / 3)


def test_calculates_income_coefficient_of_variation(transactions: list[CategorizedTransaction]) -> None:
    """Use population standard deviation divided by average income."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.income_volatility_cv == pytest.approx(0.2041241452)
    assert summary.income_volatility_percent == pytest.approx(20.41241452)


def test_returns_zero_cv_for_one_month() -> None:
    """Avoid fabricating income volatility from a single month."""
    one_month_transactions = [
        _categorized(date(2026, 1, 5), 40000, "CREDIT", TransactionCategory.SALARY)
    ]
    summary = summarize_cashflow(
        build_monthly_cashflow(one_month_transactions), one_month_transactions
    )

    assert summary.income_volatility_cv == 0


def test_counts_bounce_transactions(transactions: list[CategorizedTransaction]) -> None:
    """Count every transaction categorized as a bounce penalty."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.total_bounce_count == 1


def test_sums_bounce_amount(transactions: list[CategorizedTransaction]) -> None:
    """Sum the magnitude of all bounce-penalty transactions."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.total_bounce_amount == 500


def test_calculates_months_of_history(transactions: list[CategorizedTransaction]) -> None:
    """Use the observed transaction-date range to determine history length."""
    summary = summarize_cashflow(build_monthly_cashflow(transactions), transactions)

    assert summary.months_of_history == 3


def test_rejects_empty_transaction_input() -> None:
    """Reject monthly aggregation without source transactions."""
    with pytest.raises(ValueError, match="non-empty"):
        build_monthly_cashflow([])
