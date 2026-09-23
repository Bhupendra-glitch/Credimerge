"""Tests for the EMI calculation engine."""

import pytest

from app.emi.calculator import calculate_emi


def test_calculates_reducing_balance_emi() -> None:
    """Calculate the expected EMI for a 12% annual-interest loan."""
    emi = calculate_emi(200000, 12, 24)

    assert emi == pytest.approx(9414.6944, rel=1e-6)


def test_calculates_zero_interest_emi() -> None:
    """Split the principal evenly when the loan has no interest."""
    assert calculate_emi(120000, 0, 12) == 10000


def test_rejects_zero_principal() -> None:
    """Reject a principal of zero."""
    with pytest.raises(ValueError):
        calculate_emi(0, 12, 24)


def test_rejects_negative_principal() -> None:
    """Reject a negative principal."""
    with pytest.raises(ValueError):
        calculate_emi(-100000, 12, 24)


def test_rejects_negative_interest_rate() -> None:
    """Reject a negative annual interest rate."""
    with pytest.raises(ValueError):
        calculate_emi(200000, -5, 24)


def test_rejects_zero_tenure() -> None:
    """Reject a tenure of zero months."""
    with pytest.raises(ValueError):
        calculate_emi(200000, 12, 0)


def test_rejects_negative_tenure() -> None:
    """Reject a negative tenure."""
    with pytest.raises(ValueError):
        calculate_emi(200000, 12, -24)


def test_higher_interest_rate_increases_emi() -> None:
    """Confirm that a higher rate raises EMI for the same loan terms."""
    lower_rate_emi = calculate_emi(200000, 10, 24)
    higher_rate_emi = calculate_emi(200000, 12, 24)

    assert higher_rate_emi > lower_rate_emi


def test_longer_tenure_reduces_emi() -> None:
    """Confirm that a longer tenure lowers EMI for the same loan and rate."""
    shorter_tenure_emi = calculate_emi(200000, 12, 24)
    longer_tenure_emi = calculate_emi(200000, 12, 36)

    assert longer_tenure_emi < shorter_tenure_emi
