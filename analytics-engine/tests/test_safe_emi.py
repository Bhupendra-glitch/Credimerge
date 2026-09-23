"""Tests for transparent prototype safe-EMI capacity calculations."""

import pytest

from app.credit_health.features import CreditHealthFeatures
from app.credit_health.safe_emi import SafeEMIConfig, calculate_safe_emi_capacity


def _features(**overrides: object) -> CreditHealthFeatures:
    """Create valid credit-health features for safe-EMI tests."""
    values: dict[str, object] = {
        "months_of_history": 6,
        "average_monthly_income": 50000,
        "average_monthly_expenses": 12000,
        "average_monthly_emi": 5000,
        "average_monthly_surplus": 30000,
        "income_cv": 0.1,
        "income_volatility_percent": 10,
        "total_bounce_count": 0,
        "total_bounce_amount": 0,
        "average_balance": None,
        "minimum_balance": None,
        "balance_data_available": False,
        "transaction_count": 18,
        "income_consistency_score_input": 0.1,
        "surplus_ratio": 0.6,
        "repayment_discipline_input": 0,
        "balance_buffer_input": None,
        "vintage_months": 6,
    }
    values.update(overrides)
    return CreditHealthFeatures(**values)  # type: ignore[arg-type]


def test_calculates_foir_capacity() -> None:
    """Calculate remaining capacity inside the target FOIR envelope."""
    result = calculate_safe_emi_capacity(_features())

    assert result["foir_based_capacity"] == pytest.approx(15000)


def test_calculates_surplus_capacity() -> None:
    """Calculate the configured usable portion of average surplus."""
    result = calculate_safe_emi_capacity(_features())

    assert result["surplus_based_capacity"] == pytest.approx(15000)


def test_uses_lower_capacity_as_safe_emi() -> None:
    """Use the smaller FOIR and surplus capacity as final safe EMI."""
    result = calculate_safe_emi_capacity(
        _features(average_monthly_surplus=20000)
    )

    assert result["foir_based_capacity"] == pytest.approx(15000)
    assert result["surplus_based_capacity"] == pytest.approx(10000)
    assert result["safe_emi_capacity"] == pytest.approx(10000)


def test_zero_surplus_results_in_zero_capacity() -> None:
    """Clamp a zero surplus-based capacity at zero."""
    result = calculate_safe_emi_capacity(_features(average_monthly_surplus=0))

    assert result["surplus_based_capacity"] == 0
    assert result["safe_emi_capacity"] == 0


def test_existing_emi_reduces_foir_capacity() -> None:
    """Subtract existing EMI outflow from the target total-EMI capacity."""
    result = calculate_safe_emi_capacity(_features(average_monthly_emi=12000))

    assert result["foir_based_capacity"] == pytest.approx(8000)


@pytest.mark.parametrize("target_foir_percent", [0, -1, 101])
def test_rejects_invalid_target_foir_percent(target_foir_percent: float) -> None:
    """Require a target FOIR percentage inside the documented range."""
    with pytest.raises(ValueError):
        SafeEMIConfig(target_foir_percent=target_foir_percent)


@pytest.mark.parametrize("surplus_utilization_ratio", [0, -0.1, 1.1])
def test_rejects_invalid_surplus_utilization_ratio(
    surplus_utilization_ratio: float,
) -> None:
    """Require a surplus ratio inside the documented range."""
    with pytest.raises(ValueError):
        SafeEMIConfig(surplus_utilization_ratio=surplus_utilization_ratio)


def test_returns_short_history_warning() -> None:
    """Expose low confidence when fewer than four months are available."""
    result = calculate_safe_emi_capacity(_features(months_of_history=3))

    assert result["confidence_warning"] == "SHORT_HISTORY"


def test_rejects_missing_income() -> None:
    """Reject unavailable average monthly income."""
    with pytest.raises(ValueError, match="average_monthly_income"):
        calculate_safe_emi_capacity(_features(average_monthly_income=None))


def test_rejects_missing_emi_outflow() -> None:
    """Reject unavailable average monthly EMI outflow."""
    with pytest.raises(ValueError, match="average_monthly_emi"):
        calculate_safe_emi_capacity(_features(average_monthly_emi=None))
