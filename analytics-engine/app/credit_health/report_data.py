"""Report-ready Alternative Cashflow Credit Health analysis orchestration."""

from app.credit_health.features import (
    CreditHealthFeatures,
    extract_credit_health_features,
)
from app.credit_health.safe_emi import SafeEMIConfig, calculate_safe_emi_capacity
from app.credit_health.score import calculate_credit_health_score
from app.transactions.cashflow import build_monthly_cashflow, summarize_cashflow
from app.transactions.categorizer import CategorizedTransaction


_REPORT_TITLE = "Alternative Cashflow Credit Report"
_DISCLAIMER = (
    "This is an alternative cashflow-based credit-health estimate "
    "and is not an official bureau or CIBIL score."
)
_FACTOR_NAMES = (
    "income_stability",
    "surplus_adequacy",
    "repayment_discipline",
    "balance_buffer",
    "vintage_activity",
)


def build_credit_health_report_data(
    features: CreditHealthFeatures, score_result: dict, safe_emi_result: dict
) -> dict:
    """Build clean structured data for a future Credit Health report renderer.

    Factor scores and warnings are copied from existing Step 11 and safe-EMI
    outputs; this function never recalculates scoring or capacity formulas.

    Args:
        features: Extracted Alternative Cashflow Credit Health features.
        score_result: Result from ``calculate_credit_health_score``.
        safe_emi_result: Result from ``calculate_safe_emi_capacity``.

    Returns:
        Structured report data containing score, factor, cashflow, balance,
        safe-EMI, warning, and disclaimer sections.

    Raises:
        ValueError: If any input is missing the required structured data.
    """
    if not isinstance(features, CreditHealthFeatures):
        raise ValueError("features must be a CreditHealthFeatures instance")
    if not isinstance(score_result, dict):
        raise ValueError("score_result must be a dictionary")
    if not isinstance(safe_emi_result, dict):
        raise ValueError("safe_emi_result must be a dictionary")

    score = _required_value(score_result, "score", "score_result")
    health_band = _required_value(score_result, "health_band", "score_result")
    factors = _required_value(score_result, "factors", "score_result")
    if not isinstance(factors, dict):
        raise ValueError("score_result factors must be a dictionary")
    missing_factors = [name for name in _FACTOR_NAMES if name not in factors]
    if missing_factors:
        raise ValueError("score_result factors missing: " + ", ".join(missing_factors))

    foir_based_capacity = _required_value(
        safe_emi_result, "foir_based_capacity", "safe_emi_result"
    )
    surplus_based_capacity = _required_value(
        safe_emi_result, "surplus_based_capacity", "safe_emi_result"
    )
    safe_emi_capacity = _required_value(
        safe_emi_result, "safe_emi_capacity", "safe_emi_result"
    )

    return {
        "report_title": _REPORT_TITLE,
        "score": score,
        "health_band": health_band,
        "factor_breakdown": factors,
        "cashflow_summary": {
            "average_monthly_income": features.average_monthly_income,
            "average_monthly_expenses": features.average_monthly_expenses,
            "average_monthly_surplus": features.average_monthly_surplus,
            "average_monthly_emi": features.average_monthly_emi,
            "income_volatility_percent": features.income_volatility_percent,
            "bounce_count": features.total_bounce_count,
            "bounce_amount": features.total_bounce_amount,
            "months_of_history": features.months_of_history,
        },
        "balance_summary": {
            "balance_data_available": features.balance_data_available,
            "average_balance": features.average_balance,
            "minimum_balance": features.minimum_balance,
        },
        "safe_emi": {
            "foir_based_capacity": foir_based_capacity,
            "surplus_based_capacity": surplus_based_capacity,
            "safe_emi_capacity": safe_emi_capacity,
        },
        "warnings": _merge_warnings(
            score_result.get("warnings", []), safe_emi_result.get("confidence_warning")
        ),
        "disclaimer": _DISCLAIMER,
    }


def analyze_credit_health(
    transactions: list[CategorizedTransaction], config: SafeEMIConfig | None = None
) -> dict:
    """Run the complete in-memory Alternative Cashflow Credit Health pipeline.

    This function accepts already categorized transactions. It intentionally does
    not parse statements, perform file I/O, call AI services, or calculate any
    EMI/loan metrics.

    Args:
        transactions: Non-empty categorized transactions from the parser and
            categorization stages.
        config: Optional transparent safe-EMI assumptions.

    Returns:
        Intermediate monthly cashflow, features, score, and safe-EMI outputs,
        along with clean report-ready data under ``report_data``.

    Raises:
        ValueError: If the supplied transactions or optional configuration are
            invalid.
    """
    monthly_cashflow = build_monthly_cashflow(transactions)
    cashflow_summary = summarize_cashflow(monthly_cashflow, transactions)
    features = extract_credit_health_features(cashflow_summary, transactions)
    score_result = calculate_credit_health_score(features)
    safe_emi_result = calculate_safe_emi_capacity(features, config)
    report_data = build_credit_health_report_data(
        features, score_result, safe_emi_result
    )

    return {
        "monthly_cashflow": monthly_cashflow,
        "cashflow_summary": cashflow_summary,
        "features": features,
        "score_result": score_result,
        "safe_emi_result": safe_emi_result,
        "report_data": report_data,
    }


def _required_value(source: dict, key: str, source_name: str) -> object:
    """Read a required value from structured upstream output."""
    if key not in source:
        raise ValueError(f"{source_name} is missing required key: {key}")
    return source[key]


def _merge_warnings(score_warnings: object, safe_emi_warning: object) -> list[str]:
    """Merge upstream warnings without inventing duplicates or changing order."""
    if not isinstance(score_warnings, list) or any(
        not isinstance(warning, str) for warning in score_warnings
    ):
        raise ValueError("score_result warnings must be a list of strings")
    if safe_emi_warning is not None and not isinstance(safe_emi_warning, str):
        raise ValueError("safe_emi_result confidence_warning must be a string or None")

    warnings = list(score_warnings)
    if safe_emi_warning is not None:
        warnings.append(safe_emi_warning)
    return list(dict.fromkeys(warnings))
