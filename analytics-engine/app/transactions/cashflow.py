"""Monthly cashflow aggregation for categorized bank transactions."""

from dataclasses import dataclass
from datetime import date
from statistics import pstdev

from app.transactions.categorizer import CategorizedTransaction, TransactionCategory


_INCOME_CATEGORIES = {
    TransactionCategory.SALARY,
    TransactionCategory.BUSINESS_INCOME,
    TransactionCategory.GIG_INCOME,
}


@dataclass(frozen=True)
class MonthlyCashflow:
    """Cashflow totals and breakdowns for one calendar month.

    Missing months between the first and last transaction month are represented
    by zero-valued rows so history averages and volatility use elapsed months.
    """

    month: str
    total_income: float
    total_expenses: float
    total_emi: float
    total_bounce_penalty: float
    net_cashflow: float
    transaction_count: int


@dataclass(frozen=True)
class CashflowSummary:
    """Overall features calculated from monthly cashflow history.

    ``income_volatility_cv`` is the population standard deviation of monthly
    income divided by average monthly income. ``income_volatility_percent`` is
    the same value expressed as a percentage.
    """

    months_of_history: int
    average_monthly_income: float
    average_monthly_expenses: float
    average_monthly_emi: float
    average_monthly_net_cashflow: float
    income_volatility_cv: float
    income_volatility_percent: float
    total_bounce_count: int
    total_bounce_amount: float
    total_transaction_count: int


def build_monthly_cashflow(
    transactions: list[CategorizedTransaction],
) -> list[MonthlyCashflow]:
    """Aggregate categorized transactions into chronological monthly cashflow.

    Every debit contributes to total expenses, including EMI and bounce penalties.
    The latter two totals are included as explanatory breakdowns, not additional
    expenses. Months with no transaction between first and last observed months
    receive a zero-valued cashflow row.

    Args:
        transactions: Non-empty list of categorized transactions.

    Returns:
        Monthly cashflow rows from first to last observed month, inclusive.

    Raises:
        ValueError: If ``transactions`` is empty, not a list, or contains an
            invalid item.
    """
    _validate_categorized_transactions(transactions)
    transactions_by_month: dict[date, list[CategorizedTransaction]] = {}
    for transaction in transactions:
        month_start = transaction.date.replace(day=1)
        transactions_by_month.setdefault(month_start, []).append(transaction)

    first_month = min(transactions_by_month)
    last_month = max(transactions_by_month)
    return [
        _build_monthly_cashflow(month, transactions_by_month.get(month, []))
        for month in _iter_months(first_month, last_month)
    ]


def summarize_cashflow(
    monthly_cashflow: list[MonthlyCashflow],
    transactions: list[CategorizedTransaction],
) -> CashflowSummary:
    """Calculate history-wide cashflow features without generating a score.

    Args:
        monthly_cashflow: Non-empty monthly rows from
            :func:`build_monthly_cashflow`.
        transactions: Categorized source transactions used for bounce totals.

    Returns:
        A :class:`CashflowSummary` with monthly averages, income volatility,
        bounce data, and transaction/history counts.

    Raises:
        ValueError: If either input is empty, not a list, or contains invalid
            items.
    """
    if not isinstance(monthly_cashflow, list) or not monthly_cashflow:
        raise ValueError("monthly_cashflow must be a non-empty list")
    if any(not isinstance(item, MonthlyCashflow) for item in monthly_cashflow):
        raise ValueError("monthly_cashflow must contain MonthlyCashflow instances")
    _validate_categorized_transactions(transactions)

    months_of_history = len(monthly_cashflow)
    incomes = [month.total_income for month in monthly_cashflow]
    average_monthly_income = sum(incomes) / months_of_history
    average_monthly_expenses = (
        sum(month.total_expenses for month in monthly_cashflow) / months_of_history
    )
    average_monthly_emi = (
        sum(month.total_emi for month in monthly_cashflow) / months_of_history
    )
    average_monthly_net_cashflow = (
        sum(month.net_cashflow for month in monthly_cashflow) / months_of_history
    )
    income_volatility_cv = _calculate_income_volatility_cv(
        incomes, average_monthly_income
    )
    bounce_transactions = [
        transaction
        for transaction in transactions
        if transaction.category == TransactionCategory.BOUNCE_PENALTY
    ]

    return CashflowSummary(
        months_of_history=months_of_history,
        average_monthly_income=average_monthly_income,
        average_monthly_expenses=average_monthly_expenses,
        average_monthly_emi=average_monthly_emi,
        average_monthly_net_cashflow=average_monthly_net_cashflow,
        income_volatility_cv=income_volatility_cv,
        income_volatility_percent=income_volatility_cv * 100,
        total_bounce_count=len(bounce_transactions),
        total_bounce_amount=sum(transaction.amount for transaction in bounce_transactions),
        total_transaction_count=len(transactions),
    )


def _build_monthly_cashflow(
    month: date, transactions: list[CategorizedTransaction]
) -> MonthlyCashflow:
    """Build one monthly row from a possibly empty transaction collection."""
    total_income = sum(
        transaction.amount
        for transaction in transactions
        if transaction.transaction_type == "CREDIT"
        and transaction.category in _INCOME_CATEGORIES
    )
    total_expenses = sum(
        transaction.amount
        for transaction in transactions
        if transaction.transaction_type == "DEBIT"
    )
    total_emi = sum(
        transaction.amount
        for transaction in transactions
        if transaction.transaction_type == "DEBIT"
        and transaction.category == TransactionCategory.EMI
    )
    total_bounce_penalty = sum(
        transaction.amount
        for transaction in transactions
        if transaction.transaction_type == "DEBIT"
        and transaction.category == TransactionCategory.BOUNCE_PENALTY
    )

    return MonthlyCashflow(
        month=month.strftime("%Y-%m"),
        total_income=total_income,
        total_expenses=total_expenses,
        total_emi=total_emi,
        total_bounce_penalty=total_bounce_penalty,
        net_cashflow=total_income - total_expenses,
        transaction_count=len(transactions),
    )


def _iter_months(first_month: date, last_month: date):
    """Yield all calendar-month starts from first through last, inclusive."""
    current_month = first_month
    while current_month <= last_month:
        yield current_month
        if current_month.month == 12:
            current_month = current_month.replace(year=current_month.year + 1, month=1)
        else:
            current_month = current_month.replace(month=current_month.month + 1)


def _calculate_income_volatility_cv(
    incomes: list[float], average_income: float
) -> float:
    """Return population income standard deviation divided by mean income."""
    if len(incomes) <= 1 or average_income == 0:
        return 0.0
    return pstdev(incomes) / average_income


def _validate_categorized_transactions(
    transactions: list[CategorizedTransaction],
) -> None:
    """Ensure a non-empty list contains only categorized transactions."""
    if not isinstance(transactions, list) or not transactions:
        raise ValueError("transactions must be a non-empty list")
    if any(not isinstance(item, CategorizedTransaction) for item in transactions):
        raise ValueError("transactions must contain CategorizedTransaction instances")
