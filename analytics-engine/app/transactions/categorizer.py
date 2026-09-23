"""Deterministic category assignment for normalized bank transactions."""

from dataclasses import dataclass
from datetime import date
from enum import Enum

from app.transactions.models import Transaction
from app.transactions.parser import normalize_description


class TransactionCategory(str, Enum):
    """Controlled categories used by transaction cashflow analytics."""

    SALARY = "SALARY"
    BUSINESS_INCOME = "BUSINESS_INCOME"
    GIG_INCOME = "GIG_INCOME"
    RENT = "RENT"
    UTILITY = "UTILITY"
    EMI = "EMI"
    FOOD = "FOOD"
    SHOPPING = "SHOPPING"
    CASH_WITHDRAWAL = "CASH_WITHDRAWAL"
    BOUNCE_PENALTY = "BOUNCE_PENALTY"
    OTHER = "OTHER"


@dataclass(frozen=True)
class CategorizedTransaction:
    """A normalized transaction with a deterministic controlled category.

    Attributes:
        date: Date of the transaction.
        description: Whitespace-normalized transaction narration.
        amount: Positive transaction magnitude.
        transaction_type: Original ``"CREDIT"`` or ``"DEBIT"`` direction.
        category: Controlled category determined from the description and
            direction.
        source: Original statement source, if supplied.
        balance: Original optional statement balance, if supplied.
    """

    date: date
    description: str
    amount: float
    transaction_type: str
    category: TransactionCategory
    source: str | None = None
    balance: float | None = None


def categorize_transaction(transaction: Transaction) -> CategorizedTransaction:
    """Return a categorized copy of a normalized transaction.

    Rules are case-insensitive and deterministic. Bounce and penalty keywords
    have the highest priority. For overlapping gig/food merchants, credits are
    treated as gig income and debits as food expenses.

    Args:
        transaction: Validated normalized transaction from the statement parser.

    Returns:
        A new :class:`CategorizedTransaction`; the input transaction is never
        modified.

    Raises:
        ValueError: If ``transaction`` is not a :class:`Transaction` instance.
    """
    if not isinstance(transaction, Transaction):
        raise ValueError("transaction must be a Transaction instance")

    description = normalize_description(transaction.description)
    category = _categorize_description(description, transaction.transaction_type)
    return CategorizedTransaction(
        date=transaction.date,
        description=description,
        amount=transaction.amount,
        transaction_type=transaction.transaction_type,
        category=category,
        source=transaction.source,
        balance=transaction.balance,
    )


def _categorize_description(
    description: str, transaction_type: str
) -> TransactionCategory:
    """Classify a cleaned description using ordered, direction-aware rules."""
    normalized_description = description.casefold()

    if _contains_any(
        normalized_description,
        (
            "bounce",
            "return charge",
            "return charges",
            "penalty",
            "bounce charge",
            "rtm chg",
            "return fee",
        ),
    ):
        return TransactionCategory.BOUNCE_PENALTY
    if _contains_any(normalized_description, ("cash withdrawal", "cash wd", "atm")):
        return TransactionCategory.CASH_WITHDRAWAL
    if _contains_any(
        normalized_description,
        ("loan repayment", "loan emi", "nach debit", "ach dr", "emi", "nach"),
    ):
        return TransactionCategory.EMI

    if transaction_type == "CREDIT":
        if _contains_any(normalized_description, ("salary", "payroll", "salary credit")):
            return TransactionCategory.SALARY
        if _contains_any(
            normalized_description,
            (
                "business",
                "merchant settlement",
                "merchant collection",
                "settlement",
            ),
        ):
            return TransactionCategory.BUSINESS_INCOME
        if _contains_any(
            normalized_description,
            ("uber", "ola", "swiggy", "zomato", "delivery payout", "freelance", "gig"),
        ):
            return TransactionCategory.GIG_INCOME

    if _contains_any(normalized_description, ("house rent", "rent")):
        return TransactionCategory.RENT
    if _contains_any(
        normalized_description,
        (
            "electricity",
            "water bill",
            "gas bill",
            "mobile bill",
            "phone bill",
            "broadband",
            "utility",
        ),
    ):
        return TransactionCategory.UTILITY
    if _contains_any(
        normalized_description,
        ("restaurant", "food", "swiggy", "zomato", "dominos", "mcdonald"),
    ):
        return TransactionCategory.FOOD
    if _contains_any(normalized_description, ("amazon", "flipkart", "shopping", "myntra")):
        return TransactionCategory.SHOPPING
    return TransactionCategory.OTHER


def _contains_any(description: str, keywords: tuple[str, ...]) -> bool:
    """Return whether a normalized description contains any rule keyword."""
    return any(keyword in description for keyword in keywords)
