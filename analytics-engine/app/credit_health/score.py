"""Transparent Alternative Cashflow Credit Health prototype scorecard."""

from math import isfinite
from numbers import Real

from app.credit_health.features import CreditHealthFeatures


def calculate_credit_health_score(features: CreditHealthFeatures) -> dict:
    """Calculate a transparent cashflow-based health score and factor metadata.

    The result is an Alternative Cashflow Credit Health prototype, not an
    official credit-bureau score or lending decision. Missing balance data is
    excluded from the denominator rather than silently scored as zero.

    Args:
        features: Extracted cashflow and available balance features.

    Returns:
        A scorecard dictionary with raw and normalized scores, factor-level
        metadata, health band, data quality information, and warnings.

    Raises:
        ValueError: If ``features`` is not a :class:`CreditHealthFeatures`.
    """
    if not isinstance(features, CreditHealthFeatures):
        raise ValueError("features must be a CreditHealthFeatures instance")

    factors = {
        "income_stability": score_income_stability(features.income_cv),
        "surplus_adequacy": score_surplus_adequacy(
            features.average_monthly_income, features.surplus_ratio
        ),
        "repayment_discipline": score_repayment_discipline(
            features.total_bounce_count, features.total_bounce_amount
        ),
        "balance_buffer": score_balance_buffer(
            features.balance_data_available,
            features.average_balance,
            features.average_monthly_expenses,
            features.balance_buffer_input,
        ),
        "vintage_activity": score_vintage_activity(features.months_of_history),
    }
    raw_total_score = sum(
        factor["score"] for factor in factors.values() if factor["score"] is not None
    )
    maximum_possible_score = (
        100 if factors["balance_buffer"]["score"] is not None else 85
    )
    normalized_score = raw_total_score / maximum_possible_score * 100
    warnings = _build_data_quality_warnings(features)

    return {
        "score": normalized_score,
        "available_factor_points": raw_total_score,
        "maximum_available_points": maximum_possible_score,
        "raw_total_score": raw_total_score,
        "maximum_possible_score": maximum_possible_score,
        "normalized_score": normalized_score,
        "health_band": determine_health_band(normalized_score),
        "factors": factors,
        "data_quality": {
            "balance_data_available": features.balance_data_available,
            "months_of_history": features.months_of_history,
        },
        "warnings": warnings,
    }


def score_income_stability(income_cv: float) -> dict:
    """Score income stability from coefficient-of-variation thresholds.

    Args:
        income_cv: Non-negative income coefficient of variation.

    Returns:
        Factor metadata with a 0-to-25 score.

    Raises:
        ValueError: If ``income_cv`` is not a finite non-negative number.
    """
    value = _validate_non_negative_number(income_cv, "income_cv")
    if value <= 0.10:
        score, code = 25, "CV_AT_OR_BELOW_10_PERCENT"
    elif value <= 0.20:
        score, code = 20, "CV_10_TO_20_PERCENT"
    elif value <= 0.30:
        score, code = 15, "CV_20_TO_30_PERCENT"
    elif value <= 0.40:
        score, code = 10, "CV_30_TO_40_PERCENT"
    elif value <= 0.50:
        score, code = 5, "CV_40_TO_50_PERCENT"
    else:
        score, code = 0, "CV_ABOVE_50_PERCENT"
    return _factor(score, 25, value, code)


def score_surplus_adequacy(
    average_monthly_income: float, surplus_ratio: float
) -> dict:
    """Score surplus adequacy from average income and surplus ratio.

    Args:
        average_monthly_income: Average monthly income from cashflow history.
        surplus_ratio: Average surplus divided by average monthly income.

    Returns:
        Factor metadata with a 0-to-20 score.

    Raises:
        ValueError: If either input is non-numeric or non-finite.
    """
    income = _validate_finite_number(average_monthly_income, "average_monthly_income")
    ratio = _validate_finite_number(surplus_ratio, "surplus_ratio")
    if income <= 0:
        return _factor(0, 20, ratio, "NO_AVERAGE_INCOME")
    if ratio >= 0.40:
        score, code = 20, "SURPLUS_RATIO_AT_LEAST_40_PERCENT"
    elif ratio >= 0.30:
        score, code = 16, "SURPLUS_RATIO_30_TO_40_PERCENT"
    elif ratio >= 0.20:
        score, code = 12, "SURPLUS_RATIO_20_TO_30_PERCENT"
    elif ratio >= 0.10:
        score, code = 8, "SURPLUS_RATIO_10_TO_20_PERCENT"
    elif ratio >= 0:
        score, code = 4, "SURPLUS_RATIO_0_TO_10_PERCENT"
    else:
        score, code = 0, "NEGATIVE_SURPLUS_RATIO"
    return _factor(score, 20, ratio, code)


def score_repayment_discipline(bounce_count: int, bounce_amount: float) -> dict:
    """Score observed bounce/penalty behavior without inferring loan default.

    Args:
        bounce_count: Non-negative count of categorized bounce penalties.
        bounce_amount: Non-negative aggregate bounce/penalty amount.

    Returns:
        Factor metadata with a 0-to-25 score.

    Raises:
        ValueError: If the count or amount is invalid.
    """
    count = _validate_non_negative_integer(bounce_count, "bounce_count")
    amount = _validate_non_negative_number(bounce_amount, "bounce_amount")
    if count == 0:
        score, code = 25, "NO_OBSERVED_BOUNCES"
    elif count == 1:
        score, code = 18, "ONE_OBSERVED_BOUNCE"
    elif count == 2:
        score, code = 12, "TWO_OBSERVED_BOUNCES"
    elif count == 3:
        score, code = 6, "THREE_OBSERVED_BOUNCES"
    else:
        score, code = 0, "FOUR_OR_MORE_OBSERVED_BOUNCES"
    return _factor(score, 25, {"bounce_count": count, "bounce_amount": amount}, code)


def score_balance_buffer(
    balance_data_available: bool,
    average_balance: float | None,
    average_monthly_expenses: float,
    balance_buffer_input: float | None,
) -> dict:
    """Score balance buffer or explicitly mark missing balance data.

    Args:
        balance_data_available: Whether actual usable statement balances exist.
        average_balance: Mean available statement balance when present.
        average_monthly_expenses: Average cashflow expenses.
        balance_buffer_input: Mean balance divided by expenses when meaningful.

    Returns:
        Factor metadata with a 0-to-15 score, or ``None`` score and
        ``"insufficient_balance_data"`` status when balances are unavailable.

    Raises:
        ValueError: If supplied balance-related numeric data is invalid.
    """
    if not isinstance(balance_data_available, bool):
        raise ValueError("balance_data_available must be a boolean")
    expenses = _validate_finite_number(
        average_monthly_expenses, "average_monthly_expenses"
    )
    if not balance_data_available:
        return {
            "score": None,
            "max_score": 15,
            "value": None,
            "status": "insufficient_balance_data",
            "explanation_code": "INSUFFICIENT_BALANCE_DATA",
        }

    if average_balance is None:
        raise ValueError("average_balance is required when balance data is available")
    balance = _validate_finite_number(average_balance, "average_balance")
    if expenses <= 0:
        return _factor(15, 15, None, "NO_RECURRING_EXPENSE_BURDEN")
    if balance_buffer_input is None:
        ratio = balance / expenses
    else:
        ratio = _validate_finite_number(balance_buffer_input, "balance_buffer_input")

    if ratio >= 1.0:
        score, code = 15, "BUFFER_AT_LEAST_ONE_MONTH"
    elif ratio >= 0.75:
        score, code = 12, "BUFFER_75_TO_100_PERCENT"
    elif ratio >= 0.50:
        score, code = 9, "BUFFER_50_TO_75_PERCENT"
    elif ratio >= 0.25:
        score, code = 6, "BUFFER_25_TO_50_PERCENT"
    elif ratio >= 0:
        score, code = 3, "BUFFER_0_TO_25_PERCENT"
    else:
        score, code = 0, "NEGATIVE_BALANCE_BUFFER"
    return _factor(score, 15, ratio, code)


def score_vintage_activity(months_of_history: int) -> dict:
    """Score transaction-history vintage using transparent month thresholds.

    Args:
        months_of_history: Non-negative count of available monthly history.

    Returns:
        Factor metadata with a 0-to-15 score.

    Raises:
        ValueError: If ``months_of_history`` is not a non-negative integer.
    """
    months = _validate_non_negative_integer(months_of_history, "months_of_history")
    if months >= 12:
        score, code = 15, "HISTORY_AT_LEAST_12_MONTHS"
    elif months >= 9:
        score, code = 12, "HISTORY_9_TO_11_MONTHS"
    elif months >= 6:
        score, code = 9, "HISTORY_6_TO_8_MONTHS"
    elif months >= 4:
        score, code = 6, "HISTORY_4_TO_5_MONTHS"
    elif months >= 2:
        score, code = 3, "HISTORY_2_TO_3_MONTHS"
    else:
        score, code = 0, "HISTORY_UNDER_2_MONTHS"
    return _factor(score, 15, months, code)


def determine_health_band(normalized_score: float) -> str:
    """Return the prototype health band for a normalized 0-to-100 score.

    Args:
        normalized_score: Finite score between zero and 100, inclusive.

    Returns:
        One of ``"Strong"``, ``"Moderate"``, ``"Needs Improvement"``, or
        ``"High Risk"``.

    Raises:
        ValueError: If the score is invalid or outside the 0-to-100 range.
    """
    score = _validate_finite_number(normalized_score, "normalized_score")
    if not 0 <= score <= 100:
        raise ValueError("normalized_score must be between zero and 100")
    if score >= 80:
        return "Strong"
    if score >= 60:
        return "Moderate"
    if score >= 40:
        return "Needs Improvement"
    return "High Risk"


def _build_data_quality_warnings(features: CreditHealthFeatures) -> list[str]:
    """Expose balance and history limitations without making a lending decision."""
    warnings: list[str] = []
    if not features.balance_data_available:
        warnings.append("INSUFFICIENT_BALANCE_DATA")
    if features.months_of_history < 4:
        warnings.append("SHORT_HISTORY")
    return warnings


def _factor(score: int, max_score: int, value: object, explanation_code: str) -> dict:
    """Create consistent structured factor metadata."""
    return {
        "score": score,
        "max_score": max_score,
        "value": value,
        "explanation_code": explanation_code,
    }


def _validate_finite_number(value: float, field_name: str) -> float:
    """Return a finite real number or raise a clear validation error."""
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field_name} must be numeric")
    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{field_name} must be finite")
    return normalized_value


def _validate_non_negative_number(value: float, field_name: str) -> float:
    """Return a finite number that is zero or greater."""
    normalized_value = _validate_finite_number(value, field_name)
    if normalized_value < 0:
        raise ValueError(f"{field_name} cannot be negative")
    return normalized_value


def _validate_non_negative_integer(value: int, field_name: str) -> int:
    """Return a non-negative integer while excluding booleans."""
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
    return value
