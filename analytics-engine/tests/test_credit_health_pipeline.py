"""Tests for end-to-end Alternative Cashflow Credit Health orchestration."""

from dataclasses import replace
from pathlib import Path

import pytest

from app.credit_health.report_data import analyze_credit_health
from app.transactions.categorizer import CategorizedTransaction, categorize_transaction
from app.transactions.parser import parse_csv_statement


FIXTURE_PATH = (
    Path(__file__).parent / "fixtures" / "sample_credit_health_statement.csv"
)


@pytest.fixture
def categorized_transactions() -> list[CategorizedTransaction]:
    """Return categorized transactions from the synthetic six-month statement."""
    return [
        categorize_transaction(transaction)
        for transaction in parse_csv_statement(str(FIXTURE_PATH))
    ]


def test_end_to_end_pipeline_works(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Run all in-memory Credit Health analytics stages successfully."""
    result = analyze_credit_health(categorized_transactions)

    assert result["report_data"]["report_title"] == "Alternative Cashflow Credit Report"


def test_pipeline_does_not_call_parser(
    monkeypatch: pytest.MonkeyPatch,
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Accept categorized transactions without calling statement parsing."""
    monkeypatch.setattr(
        "app.transactions.parser.parse_csv_statement",
        lambda _: (_ for _ in ()).throw(AssertionError("parser was called")),
    )

    assert analyze_credit_health(categorized_transactions)["features"].transaction_count == 19


def test_pipeline_uses_categorized_transactions(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Retain categorized transaction data as the pipeline's input type."""
    result = analyze_credit_health(categorized_transactions)

    assert result["features"].total_bounce_count == 1


def test_pipeline_produces_monthly_cashflow(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Produce six monthly cashflow rows from the six-month fixture."""
    assert len(analyze_credit_health(categorized_transactions)["monthly_cashflow"]) == 6


def test_pipeline_produces_credit_health_features(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Produce feature data from monthly cashflow and balances."""
    assert analyze_credit_health(categorized_transactions)["features"].balance_data_available


def test_pipeline_produces_score(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Produce a normalized Alternative Cashflow Credit Health score."""
    result = analyze_credit_health(categorized_transactions)

    assert result["score_result"]["normalized_score"] == pytest.approx(87)


def test_pipeline_produces_safe_emi(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Produce safe-EMI capacity from cashflow features only."""
    result = analyze_credit_health(categorized_transactions)

    assert result["safe_emi_result"]["safe_emi_capacity"] == pytest.approx(15000)


def test_report_data_contains_required_sections(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Provide all structured sections required by a future report renderer."""
    report = analyze_credit_health(categorized_transactions)["report_data"]

    assert {
        "score",
        "health_band",
        "factor_breakdown",
        "cashflow_summary",
        "balance_summary",
        "safe_emi",
        "warnings",
        "disclaimer",
    } <= set(report)


def test_report_preserves_all_five_factor_breakdowns(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Keep every Step 11 factor and metadata intact for report consumers."""
    factors = analyze_credit_health(categorized_transactions)["report_data"][
        "factor_breakdown"
    ]

    assert set(factors) == {
        "income_stability",
        "surplus_adequacy",
        "repayment_discipline",
        "balance_buffer",
        "vintage_activity",
    }


def test_report_contains_disclaimer(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Retain the required non-bureau score disclaimer."""
    disclaimer = analyze_credit_health(categorized_transactions)["report_data"][
        "disclaimer"
    ]

    assert "not an official bureau or CIBIL score" in disclaimer


def test_report_preserves_and_deduplicates_warnings(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Merge upstream warnings without duplicated short-history values."""
    short_history_without_balance = [
        replace(transaction, balance=None)
        for transaction in categorized_transactions
        if transaction.date.month <= 3
    ]
    report = analyze_credit_health(short_history_without_balance)["report_data"]

    assert report["warnings"] == ["INSUFFICIENT_BALANCE_DATA", "SHORT_HISTORY"]


def test_report_represents_missing_balance_honestly(
    categorized_transactions: list[CategorizedTransaction],
) -> None:
    """Leave unavailable balance statistics as None and retain their warning."""
    without_balance = [
        replace(transaction, balance=None) for transaction in categorized_transactions
    ]
    report = analyze_credit_health(without_balance)["report_data"]

    assert report["balance_summary"] == {
        "balance_data_available": False,
        "average_balance": None,
        "minimum_balance": None,
    }
    assert "INSUFFICIENT_BALANCE_DATA" in report["warnings"]
