"""Tests for deterministic transaction categorization."""

from datetime import date

from app.transactions.categorizer import (
    TransactionCategory,
    categorize_transaction,
)
from app.transactions.models import Transaction


def _transaction(description: str, transaction_type: str = "DEBIT") -> Transaction:
    """Create a valid synthetic transaction for category tests."""
    return Transaction(date(2026, 1, 1), description, 1000, transaction_type, "manual")


def test_detects_salary() -> None:
    """Categorize salary credits."""
    assert categorize_transaction(_transaction("Salary Credit", "CREDIT")).category == TransactionCategory.SALARY


def test_detects_business_income() -> None:
    """Categorize merchant settlement credits."""
    assert categorize_transaction(_transaction("Merchant Settlement", "CREDIT")).category == TransactionCategory.BUSINESS_INCOME


def test_detects_gig_income() -> None:
    """Categorize delivery payout credits as gig income."""
    assert categorize_transaction(_transaction("Swiggy Delivery Payout", "CREDIT")).category == TransactionCategory.GIG_INCOME


def test_detects_rent() -> None:
    """Categorize house-rent payments."""
    assert categorize_transaction(_transaction("House Rent Payment")).category == TransactionCategory.RENT


def test_detects_utility() -> None:
    """Categorize electricity bills."""
    assert categorize_transaction(_transaction("Electricity Bill")).category == TransactionCategory.UTILITY


def test_detects_emi() -> None:
    """Categorize loan EMI payments."""
    assert categorize_transaction(_transaction("Loan EMI Payment")).category == TransactionCategory.EMI


def test_detects_food() -> None:
    """Categorize food-order debits."""
    assert categorize_transaction(_transaction("Swiggy Food Order")).category == TransactionCategory.FOOD


def test_detects_shopping() -> None:
    """Categorize shopping debits."""
    assert categorize_transaction(_transaction("Amazon Shopping")).category == TransactionCategory.SHOPPING


def test_detects_cash_withdrawal() -> None:
    """Categorize ATM cash withdrawals."""
    assert categorize_transaction(_transaction("ATM Cash Withdrawal")).category == TransactionCategory.CASH_WITHDRAWAL


def test_detects_bounce_penalty() -> None:
    """Categorize return-charge debits."""
    assert categorize_transaction(_transaction("Return Charge")).category == TransactionCategory.BOUNCE_PENALTY


def test_uses_other_for_unknown_transaction() -> None:
    """Assign OTHER when no deterministic rule matches."""
    assert categorize_transaction(_transaction("Unclassified Transfer")).category == TransactionCategory.OTHER


def test_matching_is_case_insensitive() -> None:
    """Apply category keywords regardless of their original case."""
    assert categorize_transaction(_transaction("pAyRoLl credit", "CREDIT")).category == TransactionCategory.SALARY


def test_bounce_penalty_has_priority_over_emi() -> None:
    """Prefer a bounce penalty when a description includes EMI and bounce terms."""
    assert categorize_transaction(_transaction("EMI Bank Bounce Charge")).category == TransactionCategory.BOUNCE_PENALTY


def test_preserves_original_transaction() -> None:
    """Create a new categorized object without mutating the original transaction."""
    transaction = _transaction("  UPI   ZOMATO   PAYMENT  ")

    categorized = categorize_transaction(transaction)

    assert transaction.description == "  UPI   ZOMATO   PAYMENT  "
    assert categorized.description == "UPI ZOMATO PAYMENT"
