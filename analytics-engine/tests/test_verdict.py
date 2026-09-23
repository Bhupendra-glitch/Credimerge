"""Tests for deterministic consolidation verdict rules."""

import pytest

from app.consolidation.verdict import get_consolidation_verdict


def _comparison(
    current_emi: float,
    consolidated_emi: float,
    current_total_cost: float,
    consolidated_total_cost: float,
) -> dict:
    """Create the minimal valid comparison input for a verdict test."""
    return {
        "current_emi": current_emi,
        "consolidated_emi": consolidated_emi,
        "current_total_cost": current_total_cost,
        "consolidated_total_cost": consolidated_total_cost,
    }


def test_returns_beneficial_for_lower_emi_and_total_cost() -> None:
    """Apply Rule 1 when EMI and total cost both decrease."""
    verdict = get_consolidation_verdict(_comparison(20000, 18000, 400000, 380000))

    assert verdict["verdict"] == "beneficial"
    assert verdict["explanation_code"] == "LOWER_EMI_AND_LOWER_TOTAL_COST"


def test_returns_relief_but_costlier_for_lower_emi_and_higher_cost() -> None:
    """Apply Rule 2 when EMI falls but total cost rises."""
    verdict = get_consolidation_verdict(_comparison(20000, 18000, 400000, 420000))

    assert verdict["verdict"] == "relief_but_costlier"
    assert verdict["explanation_code"] == "LOWER_EMI_HIGHER_TOTAL_COST"


def test_returns_not_beneficial_without_emi_or_cost_reduction() -> None:
    """Apply Rule 3 when neither required metric improves."""
    verdict = get_consolidation_verdict(_comparison(20000, 21000, 400000, 420000))

    assert verdict["verdict"] == "not_beneficial"
    assert verdict["explanation_code"] == "NO_MEANINGFUL_FINANCIAL_IMPROVEMENT"


def test_returns_beneficial_for_lower_emi_and_equal_cost_with_tolerance() -> None:
    """Treat a tiny cost residual as equal rather than higher."""
    verdict = get_consolidation_verdict(
        _comparison(20000, 18000, 400000, 400000.0001)
    )

    assert verdict["verdict"] == "beneficial"


def test_rejects_invalid_comparison_input() -> None:
    """Reject a comparison input of the wrong type."""
    with pytest.raises(ValueError):
        get_consolidation_verdict([])  # type: ignore[arg-type]


def test_rejects_missing_required_comparison_keys() -> None:
    """Reject a comparison without all values needed for a verdict."""
    with pytest.raises(ValueError, match="consolidated_emi"):
        get_consolidation_verdict({"current_emi": 20000})
