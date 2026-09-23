"""Feature extraction for Alternative Cashflow Credit Health analysis."""

from dataclasses import dataclass
from math import isfinite
from numbers import Real

from app.transactions.cashflow import CashflowSummary
from app.transactions.categorizer import CategorizedTransaction


@dataclass(frozen=True)
class CreditHealthFeatures:
    """Cashflow-derived inputs for the transparent prototype scorecard.

    This model supports Alternative Cashflow Credit Health only. It is not an
    official bureau score and does not represent a lending decision.
    """

    months_of_history: int
    average_monthly_income: float
    average_monthly_expenses: float
    average_monthly_emi: float
    average_monthly_surplus: float
    income_cv: float
    income_volatility_percent: float
    total_bounce_count: int
    total_bounce_amount: float
    average_balance: float | None
    minimum_balance: float | None
    balance_data_available: bool
    transaction_count: int
    income_consistency_score_input: float
    surplus_ratio: float
    repayment_discipline_input: int
    balance_buffer_input: float | None
    vintage_months: int


def extract_credit_health_features(
    cashflow_summary: CashflowSummary,
    transactions: list[CategorizedTransaction],
) -> CreditHealthFeatures:
    """Extract Credit Health features from transaction cashflow analytics.

    Args:
        cashflow_summary: Step 10 aggregate cashflow summary, used as the
            source of truth for income, expenses, surplus, volatility, bounces,
            history, and activity counts.
        transactions: Categorized source transactions, used only to read actual
            non-``None`` bank balance values when they were supplied.

    Returns:
        A :class:`CreditHealthFeatures` instance. Balance statistics are ``None``
        when no usable balance values are present; no balance is inferred.

    Raises:
        ValueError: If inputs are not valid transaction analytics objects or a
            supplied balance value is invalid.
    """
    if not isinstance(cashflow_summary, CashflowSummary):
        raise ValueError("cashflow_summary must be a CashflowSummary instance")
    if not isinstance(transactions, list) or not transactions:
        raise ValueError("transactions must be a non-empty list")
    if any(not isinstance(item, CategorizedTransaction) for item in transactions):
        raise ValueError("transactions must contain CategorizedTransaction instances")

    balances = _extract_balance_values(transactions)
    balance_data_available = bool(balances)
    average_balance = sum(balances) / len(balances) if balances else None
    minimum_balance = min(balances) if balances else None
    average_monthly_income = cashflow_summary.average_monthly_income
    average_monthly_surplus = cashflow_summary.average_monthly_net_cashflow
    surplus_ratio = (
        average_monthly_surplus / average_monthly_income
        if average_monthly_income > 0
        else 0.0
    )
    balance_buffer_input = (
        average_balance / cashflow_summary.average_monthly_expenses
        if balance_data_available
        and cashflow_summary.average_monthly_expenses > 0
        and average_balance is not None
        else None
    )

    return CreditHealthFeatures(
        months_of_history=cashflow_summary.months_of_history,
        average_monthly_income=average_monthly_income,
        average_monthly_expenses=cashflow_summary.average_monthly_expenses,
        average_monthly_emi=cashflow_summary.average_monthly_emi,
        average_monthly_surplus=average_monthly_surplus,
        income_cv=cashflow_summary.income_volatility_cv,
        income_volatility_percent=cashflow_summary.income_volatility_percent,
        total_bounce_count=cashflow_summary.total_bounce_count,
        total_bounce_amount=cashflow_summary.total_bounce_amount,
        average_balance=average_balance,
        minimum_balance=minimum_balance,
        balance_data_available=balance_data_available,
        transaction_count=cashflow_summary.total_transaction_count,
        income_consistency_score_input=cashflow_summary.income_volatility_cv,
        surplus_ratio=surplus_ratio,
        repayment_discipline_input=cashflow_summary.total_bounce_count,
        balance_buffer_input=balance_buffer_input,
        vintage_months=cashflow_summary.months_of_history,
    )


def _extract_balance_values(
    transactions: list[CategorizedTransaction],
) -> list[float]:
    """Return actual usable balances without fabricating missing values."""
    balances: list[float] = []
    for transaction in transactions:
        if transaction.balance is None:
            continue
        if isinstance(transaction.balance, bool) or not isinstance(
            transaction.balance, Real
        ):
            raise ValueError("transaction balance must be numeric or None")
        balance = float(transaction.balance)
        if not isfinite(balance):
            raise ValueError("transaction balance must be finite or None")
        balances.append(balance)
    return balances
