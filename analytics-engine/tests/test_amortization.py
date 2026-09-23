"""Tests for the amortization schedule engine."""

import pytest

from app.emi.amortization import build_amortization_schedule, summarize_amortization
from app.emi.calculator import calculate_emi


def test_schedule_has_one_row_per_month() -> None:
    """Build one row for every repayment month."""
    schedule = build_amortization_schedule(200000, 12, 24)

    assert len(schedule) == 24
    assert set(schedule[0]) == {"month", "emi", "interest", "principal", "balance"}


def test_first_month_components() -> None:
    """Calculate the expected interest, principal, and balance in month one."""
    principal = 200000
    emi = calculate_emi(principal, 12, 24)
    first_month = build_amortization_schedule(principal, 12, 24)[0]

    assert first_month["interest"] == pytest.approx(2000)
    assert first_month["principal"] == pytest.approx(emi - 2000)
    assert first_month["balance"] == pytest.approx(principal - (emi - 2000))


def test_final_balance_is_zero() -> None:
    """Normalize the final residual balance to zero."""
    schedule = build_amortization_schedule(200000, 12, 24)

    assert schedule[-1]["balance"] == pytest.approx(0, abs=1e-8)


def test_principal_components_conserve_original_principal() -> None:
    """Ensure scheduled principal payments total the original loan amount."""
    schedule = build_amortization_schedule(200000, 12, 24)

    assert sum(row["principal"] for row in schedule) == pytest.approx(200000)


def test_summary_payment_equals_principal_plus_interest() -> None:
    """Derive payment totals from the schedule rows."""
    schedule = build_amortization_schedule(200000, 12, 24)
    summary = summarize_amortization(schedule, 200000)

    assert summary["total_payment"] == pytest.approx(
        summary["total_principal"] + summary["total_interest"]
    )


def test_zero_interest_schedule() -> None:
    """Allocate equal principal and no interest for a zero-rate loan."""
    schedule = build_amortization_schedule(120000, 0, 12)

    assert all(row["interest"] == 0 for row in schedule)
    assert all(row["emi"] == 10000 for row in schedule)
    assert all(row["principal"] == 10000 for row in schedule)
    assert schedule[-1]["balance"] == 0


def test_higher_rate_increases_total_interest() -> None:
    """Confirm that a higher rate creates more total interest."""
    lower_rate_schedule = build_amortization_schedule(200000, 10, 24)
    higher_rate_schedule = build_amortization_schedule(200000, 12, 24)

    lower_rate_interest = summarize_amortization(lower_rate_schedule, 200000)[
        "total_interest"
    ]
    higher_rate_interest = summarize_amortization(higher_rate_schedule, 200000)[
        "total_interest"
    ]

    assert higher_rate_interest > lower_rate_interest


@pytest.mark.parametrize(
    ("principal", "annual_interest_rate", "tenure_months"),
    [
        (0, 12, 24),
        (200000, -1, 24),
        (200000, 12, 0),
    ],
)
def test_invalid_loan_inputs_raise_value_error(
    principal: float, annual_interest_rate: float, tenure_months: int
) -> None:
    """Reuse the EMI validation rules for invalid schedule inputs."""
    with pytest.raises(ValueError):
        build_amortization_schedule(principal, annual_interest_rate, tenure_months)
