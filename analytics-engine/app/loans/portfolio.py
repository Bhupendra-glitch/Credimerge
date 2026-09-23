"""Loan portfolio analytics built on the EMI and amortization engines."""

from dataclasses import dataclass

from app.emi.amortization import build_amortization_schedule, summarize_amortization
from app.emi.calculator import calculate_emi
from app.emi.validators import (
    validate_annual_interest_rate,
    validate_principal,
    validate_tenure_months,
)


@dataclass
class Loan:
    """Validated input data for one active loan.

    Attributes:
        loan_id: Non-empty identifier for the loan.
        loan_type: Non-empty descriptive category for the loan.
        principal: Positive, finite outstanding loan amount.
        annual_interest_rate: Non-negative annual rate expressed as a percent.
        tenure_months: Positive whole number of repayment months.

    Raises:
        ValueError: If an identifier is empty or any financial value does not
            satisfy the shared EMI validation rules.
    """

    loan_id: str
    loan_type: str
    principal: float
    annual_interest_rate: float
    tenure_months: int

    def __post_init__(self) -> None:
        """Validate and normalize loan fields after dataclass initialization."""
        _validate_non_empty_string(self.loan_id, "loan_id")
        _validate_non_empty_string(self.loan_type, "loan_type")
        self.principal = validate_principal(self.principal)
        self.annual_interest_rate = validate_annual_interest_rate(
            self.annual_interest_rate
        )
        self.tenure_months = validate_tenure_months(self.tenure_months)


def analyze_loan(loan: Loan) -> dict:
    """Calculate financial metrics for one validated loan.

    Args:
        loan: Validated :class:`Loan` data to analyze.

    Returns:
        A dictionary with loan details, EMI, amortization-derived totals, final
        balance, and months until the loan is paid off.

    Raises:
        ValueError: If ``loan`` is not a :class:`Loan` instance.
    """
    if not isinstance(loan, Loan):
        raise ValueError("loan must be a Loan instance")

    emi = calculate_emi(
        loan.principal, loan.annual_interest_rate, loan.tenure_months
    )
    schedule = build_amortization_schedule(
        loan.principal, loan.annual_interest_rate, loan.tenure_months
    )
    summary = summarize_amortization(schedule, loan.principal)

    return {
        "loan_id": loan.loan_id,
        "loan_type": loan.loan_type,
        "principal": loan.principal,
        "annual_interest_rate": loan.annual_interest_rate,
        "tenure_months": loan.tenure_months,
        "emi": emi,
        "total_interest": summary["total_interest"],
        "total_payment": summary["total_payment"],
        "final_balance": summary["final_balance"],
        "debt_free_months": loan.tenure_months,
    }


def analyze_portfolio(loans: list[Loan]) -> dict:
    """Aggregate financial metrics across a non-empty list of loans.

    Args:
        loans: Non-empty list of validated :class:`Loan` instances.

    Returns:
        A dictionary of aggregate balances, payments, interest, a
        principal-weighted blended rate, loan milestones, notable loans, and
        individual loan analyses.

    Raises:
        ValueError: If ``loans`` is not a non-empty list or contains an invalid
            loan value.
    """
    if not isinstance(loans, list) or not loans:
        raise ValueError("loans must be a non-empty list")

    individual_loans = [analyze_loan(loan) for loan in loans]
    total_outstanding = float(sum(loan["principal"] for loan in individual_loans))
    total_monthly_emi = float(sum(loan["emi"] for loan in individual_loans))
    total_interest = float(sum(loan["total_interest"] for loan in individual_loans))
    total_payment = float(sum(loan["total_payment"] for loan in individual_loans))
    blended_interest_rate = float(
        sum(
            loan["principal"] * loan["annual_interest_rate"]
            for loan in individual_loans
        )
        / total_outstanding
    )
    highest_interest_loan = max(
        individual_loans, key=lambda loan: loan["annual_interest_rate"]
    )
    largest_emi_loan = max(individual_loans, key=lambda loan: loan["emi"])

    return {
        "active_loans": len(individual_loans),
        "total_outstanding": total_outstanding,
        "total_monthly_emi": total_monthly_emi,
        "total_interest": total_interest,
        "total_payment": total_payment,
        "blended_interest_rate": blended_interest_rate,
        "debt_free_months": max(
            loan["debt_free_months"] for loan in individual_loans
        ),
        "highest_interest_loan": {
            "loan_id": highest_interest_loan["loan_id"],
            "loan_type": highest_interest_loan["loan_type"],
            "annual_interest_rate": highest_interest_loan["annual_interest_rate"],
        },
        "largest_emi_loan": {
            "loan_id": largest_emi_loan["loan_id"],
            "loan_type": largest_emi_loan["loan_type"],
            "emi": largest_emi_loan["emi"],
        },
        "loans": individual_loans,
    }


def _validate_non_empty_string(value: str, field_name: str) -> None:
    """Raise ValueError unless ``value`` is a non-whitespace string."""
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
