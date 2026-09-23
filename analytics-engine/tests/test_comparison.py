"""Tests for consolidation comparison metrics."""

from copy import deepcopy

import pytest

from app.consolidation.comparison import compare_consolidation


@pytest.fixture
def calculation_result() -> dict:
    """Return a representative Step 6 calculation result."""
    return {
        "current": {
            "monthly_emi": 20000,
            "total_interest": 50000,
            "total_payment": 400000,
            "debt_free_months": 24,
        },
        "consolidated": {
            "monthly_emi": 18000,
            "total_interest": 40000,
            "total_cost": 380000,
            "debt_free_months": 36,
            "processing_fee_amount": 0,
        },
    }


def test_calculates_emi_reduction(calculation_result: dict) -> None:
    """Report a negative EMI change and positive monthly saving."""
    comparison = compare_consolidation(calculation_result)

    assert comparison["emi_change"] == pytest.approx(-2000)
    assert comparison["monthly_emi_saving"] == pytest.approx(2000)


def test_calculates_emi_increase(calculation_result: dict) -> None:
    """Report a positive EMI change and negative monthly saving."""
    result = deepcopy(calculation_result)
    result["consolidated"]["monthly_emi"] = 22000

    comparison = compare_consolidation(result)

    assert comparison["emi_change"] == pytest.approx(2000)
    assert comparison["monthly_emi_saving"] == pytest.approx(-2000)


def test_calculates_equal_emi(calculation_result: dict) -> None:
    """Report zero change when both arrangements have the same EMI."""
    result = deepcopy(calculation_result)
    result["consolidated"]["monthly_emi"] = 20000

    comparison = compare_consolidation(result)

    assert comparison["emi_change"] == 0
    assert comparison["monthly_emi_saving"] == 0


def test_calculates_interest_reduction(calculation_result: dict) -> None:
    """Report a reduction in total interest."""
    comparison = compare_consolidation(calculation_result)

    assert comparison["interest_change"] == pytest.approx(-10000)


def test_calculates_interest_increase(calculation_result: dict) -> None:
    """Report an increase in total interest."""
    result = deepcopy(calculation_result)
    result["consolidated"]["total_interest"] = 60000

    comparison = compare_consolidation(result)

    assert comparison["interest_change"] == pytest.approx(10000)


def test_calculates_total_cost_reduction(calculation_result: dict) -> None:
    """Report savings when consolidated total cost is lower."""
    comparison = compare_consolidation(calculation_result)

    assert comparison["total_cost_change"] == pytest.approx(-20000)
    assert comparison["total_cost_saving"] == pytest.approx(20000)
    assert comparison["additional_total_cost"] == 0


def test_calculates_total_cost_increase(calculation_result: dict) -> None:
    """Report additional cost when consolidated total cost is higher."""
    result = deepcopy(calculation_result)
    result["consolidated"]["total_cost"] = 420000

    comparison = compare_consolidation(result)

    assert comparison["total_cost_change"] == pytest.approx(20000)
    assert comparison["additional_total_cost"] == pytest.approx(20000)
    assert comparison["total_cost_saving"] == 0


def test_calculates_tenure_change(calculation_result: dict) -> None:
    """Compare the two debt-free horizons."""
    comparison = compare_consolidation(calculation_result)

    assert comparison["tenure_change_months"] == 12


def test_calculates_percentage_changes(calculation_result: dict) -> None:
    """Calculate percentage changes relative to current values."""
    comparison = compare_consolidation(calculation_result)

    assert comparison["emi_change_percent"] == pytest.approx(-10)
    assert comparison["interest_change_percent"] == pytest.approx(-20)
    assert comparison["total_cost_change_percent"] == pytest.approx(-5)


def test_reports_zero_processing_fee(calculation_result: dict) -> None:
    """Expose a zero processing fee without changing the result."""
    comparison = compare_consolidation(calculation_result)

    assert comparison["processing_fee"] == 0


def test_rejects_invalid_calculation_result() -> None:
    """Reject a calculation result of the wrong type."""
    with pytest.raises(ValueError):
        compare_consolidation([])  # type: ignore[arg-type]


def test_rejects_missing_required_calculation_values() -> None:
    """Reject a calculation result with missing nested values."""
    with pytest.raises(ValueError, match="monthly_emi"):
        compare_consolidation({"current": {}, "consolidated": {}})
