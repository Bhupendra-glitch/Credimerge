"""Tests for transparent Alternative Cashflow Credit Health scoring."""

import pytest

from app.credit_health.features import CreditHealthFeatures
from app.credit_health.score import (
    calculate_credit_health_score,
    determine_health_band,
    score_balance_buffer,
    score_income_stability,
    score_repayment_discipline,
    score_surplus_adequacy,
    score_vintage_activity,
)


def _features(**overrides: object) -> CreditHealthFeatures:
    """Create valid feature data, allowing individual score inputs to vary."""
    values: dict[str, object] = {
        "months_of_history": 6,
        "average_monthly_income": 100,
        "average_monthly_expenses": 50,
        "average_monthly_emi": 10,
        "average_monthly_surplus": 40,
        "income_cv": 0.05,
        "income_volatility_percent": 5,
        "total_bounce_count": 0,
        "total_bounce_amount": 0,
        "average_balance": 100,
        "minimum_balance": 50,
        "balance_data_available": True,
        "transaction_count": 20,
        "income_consistency_score_input": 0.05,
        "surplus_ratio": 0.4,
        "repayment_discipline_input": 0,
        "balance_buffer_input": 2.0,
        "vintage_months": 6,
    }
    values.update(overrides)
    return CreditHealthFeatures(**values)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("income_cv", "expected_score"),
    [(0.10, 25), (0.20, 20), (0.30, 15), (0.40, 10), (0.50, 5), (0.51, 0)],
)
def test_income_stability_scoring_ranges(
    income_cv: float, expected_score: int
) -> None:
    """Apply every published income-CV threshold."""
    assert score_income_stability(income_cv)["score"] == expected_score


@pytest.mark.parametrize(
    ("surplus_ratio", "expected_score"),
    [(0.40, 20), (0.30, 16), (0.20, 12), (0.10, 8), (0.0, 4), (-0.01, 0)],
)
def test_surplus_adequacy_scoring_ranges(
    surplus_ratio: float, expected_score: int
) -> None:
    """Apply every published surplus-ratio threshold."""
    assert score_surplus_adequacy(100, surplus_ratio)["score"] == expected_score


@pytest.mark.parametrize(
    ("bounce_count", "expected_score"),
    [(0, 25), (1, 18), (2, 12), (3, 6), (4, 0)],
)
def test_repayment_discipline_scoring_ranges(
    bounce_count: int, expected_score: int
) -> None:
    """Apply the published zero through four-plus bounce thresholds."""
    assert score_repayment_discipline(bounce_count, 100)["score"] == expected_score


@pytest.mark.parametrize(
    ("buffer_ratio", "expected_score"),
    [(1.0, 15), (0.75, 12), (0.50, 9), (0.25, 6), (0.0, 3), (-0.01, 0)],
)
def test_balance_buffer_scoring_ranges(
    buffer_ratio: float, expected_score: int
) -> None:
    """Apply every published available-balance buffer threshold."""
    factor = score_balance_buffer(True, buffer_ratio * 100, 100, buffer_ratio)

    assert factor["score"] == expected_score


def test_balance_buffer_marks_missing_data_as_insufficient() -> None:
    """Exclude an unavailable balance factor rather than assigning zero."""
    factor = score_balance_buffer(False, None, 100, None)

    assert factor["score"] is None
    assert factor["status"] == "insufficient_balance_data"


@pytest.mark.parametrize(
    ("months", "expected_score"),
    [(12, 15), (9, 12), (6, 9), (4, 6), (2, 3), (1, 0)],
)
def test_vintage_activity_scoring_ranges(months: int, expected_score: int) -> None:
    """Apply every published transaction-history vintage threshold."""
    assert score_vintage_activity(months)["score"] == expected_score


def test_normalizes_score_when_balance_is_unavailable() -> None:
    """Normalize available factor points against 85, not an assumed 100."""
    features = _features(
        months_of_history=9,
        vintage_months=9,
        income_cv=0.10,
        income_consistency_score_input=0.10,
        balance_data_available=False,
        average_balance=None,
        minimum_balance=None,
        balance_buffer_input=None,
    )
    result = calculate_credit_health_score(features)

    assert result["available_factor_points"] == 82
    assert result["maximum_available_points"] == 85
    assert result["normalized_score"] == pytest.approx(82 / 85 * 100)
    assert "INSUFFICIENT_BALANCE_DATA" in result["warnings"]


def test_uses_full_100_points_when_balance_is_available() -> None:
    """Use full-score normalization when usable balance data exists."""
    features = _features(
        months_of_history=12,
        vintage_months=12,
        income_cv=0.05,
        income_consistency_score_input=0.05,
        surplus_ratio=0.4,
        total_bounce_count=0,
        average_balance=100,
        balance_buffer_input=2,
    )
    result = calculate_credit_health_score(features)

    assert result["raw_total_score"] == 100
    assert result["maximum_possible_score"] == 100
    assert result["normalized_score"] == 100


@pytest.mark.parametrize(
    ("score", "expected_band"),
    [(80, "Strong"), (60, "Moderate"), (40, "Needs Improvement"), (0, "High Risk")],
)
def test_health_band_thresholds(score: float, expected_band: str) -> None:
    """Map normalized scores to the documented prototype health bands."""
    assert determine_health_band(score) == expected_band


def test_reports_short_history_warning() -> None:
    """Expose a data-quality warning for fewer than four months of history."""
    result = calculate_credit_health_score(_features(months_of_history=3, vintage_months=3))

    assert "SHORT_HISTORY" in result["warnings"]
