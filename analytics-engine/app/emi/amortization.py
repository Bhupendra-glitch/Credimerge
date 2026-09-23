"""Amortization schedule generation for reducing-balance loans."""

from app.emi.calculator import calculate_emi
from app.emi.validators import validate_principal


_BALANCE_TOLERANCE = 1e-8


def build_amortization_schedule(
    principal: float,
    annual_interest_rate: float,
    tenure_months: int,
) -> list[dict]:
    """Build the month-by-month repayment schedule for a loan.

    Args:
        principal: Total loan amount. It must be a positive finite number.
        annual_interest_rate: Annual interest rate expressed as a percentage.
            It must be a finite number that is zero or greater.
        tenure_months: Number of monthly repayments. It must be a positive
            integer.

    Returns:
        A list of monthly dictionaries with exactly ``month``, ``emi``,
        ``interest``, ``principal``, and ``balance`` keys.

    Raises:
        ValueError: If any loan input fails the existing EMI validation rules.
    """
    # calculate_emi validates all three inputs through the shared validators.
    emi = calculate_emi(principal, annual_interest_rate, tenure_months)
    current_balance = float(principal)
    monthly_interest_rate = float(annual_interest_rate) / 12 / 100
    schedule: list[dict] = []

    for month in range(1, int(tenure_months) + 1):
        interest_component = current_balance * monthly_interest_rate
        principal_component = emi - interest_component
        new_balance = current_balance - principal_component

        if month == tenure_months and abs(new_balance) <= _BALANCE_TOLERANCE:
            new_balance = 0.0

        schedule.append(
            {
                "month": month,
                "emi": emi,
                "interest": interest_component,
                "principal": principal_component,
                "balance": new_balance,
            }
        )
        current_balance = new_balance

    return schedule


def summarize_amortization(
    schedule: list[dict], original_principal: float
) -> dict:
    """Summarize principal, interest, payment, and balance from a schedule.

    Args:
        schedule: Non-empty schedule returned by
            :func:`build_amortization_schedule`.
        original_principal: Principal used to create the schedule. It is
            validated as a positive finite number for input consistency.

    Returns:
        A dictionary containing ``total_principal``, ``total_interest``,
        ``total_payment``, and ``final_balance`` derived from the schedule.

    Raises:
        ValueError: If ``original_principal`` is invalid or ``schedule`` is
            empty.
    """
    validate_principal(original_principal)
    if not schedule:
        raise ValueError("schedule must not be empty")

    total_principal = float(sum(row["principal"] for row in schedule))
    total_interest = float(sum(row["interest"] for row in schedule))
    total_payment = float(sum(row["emi"] for row in schedule))
    final_balance = float(schedule[-1]["balance"])

    return {
        "total_principal": total_principal,
        "total_interest": total_interest,
        "total_payment": total_payment,
        "final_balance": final_balance,
    }
