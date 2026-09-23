"""Tests for Alternative Cashflow Credit Health feature extraction."""

from dataclasses import replace
from pathlib import Path

import pytest

from app.credit_health.features import extract_credit_health_features
from app.transactions.cashflow import build_monthly_cashflow, summarize_cashflow
from app.transactions.categorizer import categorize_transaction
from app.transactions.parser import parse_csv_statement


FIXTURE_PATH = (
    Path(__file__).parent / "fixtures" / "sample_credit_health_statement.csv"
)


@pytest.fixture
def credit_health_data() -> tuple:
    """Build six months of synthetic categorized cashflow and feature inputs."""
    parsed_transactions = parse_csv_statement(str(FIXTURE_PATH))
    categorized_transactions = [
        categorize_transaction(transaction) for transaction in parsed_transactions
    ]
    monthly_cashflow = build_monthly_cashflow(categorized_transactions)
    cashflow_summary = summarize_cashflow(
        monthly_cashflow, categorized_transactions
    )
    return categorized_transactions, cashflow_summary


def test_extracts_credit_health_features(credit_health_data: tuple) -> None:
    """Create feature data from categorized transactions and cashflow summary."""
    transactions, summary = credit_health_data
    features = extract_credit_health_features(summary, transactions)

    assert features.months_of_history == 6
    assert features.transaction_count == 19
    assert features.vintage_months == 6


def test_uses_average_monthly_income_from_cashflow(credit_health_data: tuple) -> None:
    """Use the Step 10 average income as the feature value."""
    transactions, summary = credit_health_data

    assert extract_credit_health_features(summary, transactions).average_monthly_income == pytest.approx(50000)


def test_uses_average_monthly_expenses_from_cashflow(credit_health_data: tuple) -> None:
    """Use the Step 10 average expenses as the feature value."""
    transactions, summary = credit_health_data

    assert extract_credit_health_features(summary, transactions).average_monthly_expenses == pytest.approx(72800 / 6)


def test_uses_average_monthly_surplus_from_cashflow(credit_health_data: tuple) -> None:
    """Use the Step 10 average net cashflow as average surplus."""
    transactions, summary = credit_health_data

    assert extract_credit_health_features(summary, transactions).average_monthly_surplus == pytest.approx(227200 / 6)


def test_uses_income_cv_from_cashflow(credit_health_data: tuple) -> None:
    """Carry through the Step 10 income coefficient of variation."""
    transactions, summary = credit_health_data
    features = extract_credit_health_features(summary, transactions)

    assert features.income_cv == 0
    assert features.income_volatility_percent == 0


def test_uses_bounce_count_from_cashflow(credit_health_data: tuple) -> None:
    """Carry through observed bounce count and amount from cashflow."""
    transactions, summary = credit_health_data
    features = extract_credit_health_features(summary, transactions)

    assert features.total_bounce_count == 1
    assert features.total_bounce_amount == 300


def test_detects_available_balance_data(credit_health_data: tuple) -> None:
    """Recognize actual balances parsed from the synthetic statement."""
    transactions, summary = credit_health_data

    assert extract_credit_health_features(summary, transactions).balance_data_available


def test_calculates_average_balance_when_present(credit_health_data: tuple) -> None:
    """Calculate mean from supplied statement balances only."""
    transactions, summary = credit_health_data
    expected_average = sum(
        [
            60000, 45000, 40000, 90000, 87000, 82000, 132000, 128000, 123000,
            122700, 172700, 170200, 165200, 215200, 200200, 195200, 245200,
            242200, 237200,
        ]
    ) / 19

    assert extract_credit_health_features(summary, transactions).average_balance == pytest.approx(expected_average)


def test_calculates_minimum_balance_when_present(credit_health_data: tuple) -> None:
    """Calculate minimum from supplied statement balances only."""
    transactions, summary = credit_health_data

    assert extract_credit_health_features(summary, transactions).minimum_balance == 40000


def test_missing_balance_does_not_fabricate_values(credit_health_data: tuple) -> None:
    """Keep all balance statistics absent when statements supply no balances."""
    transactions, summary = credit_health_data
    transactions_without_balance = [
        replace(transaction, balance=None) for transaction in transactions
    ]
    features = extract_credit_health_features(summary, transactions_without_balance)

    assert not features.balance_data_available
    assert features.average_balance is None
    assert features.minimum_balance is None
    assert features.balance_buffer_input is None
