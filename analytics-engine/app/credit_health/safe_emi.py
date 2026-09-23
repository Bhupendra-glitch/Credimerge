"""Transparent prototype safe-EMI capacity calculations from cashflow features."""

from dataclasses import dataclass
from math import isfinite
from numbers import Real

from app.credit_health.features import CreditHealthFeatures


@dataclass(frozen=True)
class SafeEMIConfig:
    """Transparent, non-regulatory assumptions for safe EMI capacity.

    ``target_foir_percent`` defines the desired total-EMI share of income and
    ``surplus_utilization_ratio`` defines how much observed surplus may be used.
    These are prototype analytical assumptions, not regulated lending standards.

    Attributes:
        target_foir_percent: Percentage of average monthly income allocated to
            total EMI, greater than zero and no more than 100.
        surplus_utilization_ratio: Portion of average monthly surplus available
            for EMI, greater than zero and no more than one.
    """

    target_foir_percent: float = 40.0
    surplus_utilization_ratio: float = 0.50

    def __post_init__(self) -> None:
        """Validate prototype configuration values."""
        target_foir_percent = _validate_finite_number(
            self.target_foir_percent, "target_foir_percent"
        )
        surplus_utilization_ratio = _validate_finite_number(
            self.surplus_utilization_ratio, "surplus_utilization_ratio"
        )
        if not 0 < target_foir_percent <= 100:
            raise ValueError("target_foir_percent must be greater than 0 and at most 100")
        if not 0 < surplus_utilization_ratio <= 1:
            raise ValueError(
                "surplus_utilization_ratio must be greater than 0 and at most 1"
            )
        object.__setattr__(self, "target_foir_percent", target_foir_percent)
        object.__setattr__(self, "surplus_utilization_ratio", surplus_utilization_ratio)


def calculate_safe_emi_capacity(
    features: CreditHealthFeatures, config: SafeEMIConfig | None = None
) -> dict:
    """Calculate additional EMI capacity using FOIR and surplus envelopes.

    The capacity is the lower of the FOIR-based amount and the surplus-based
    amount. It is a transparent prototype estimate, not a lending decision or
    official banking formula.

    Args:
        features: Credit Health cashflow features containing income, existing
            EMI outflow, surplus, and history length.
        config: Optional transparent capacity assumptions. Defaults to a 40%
            target FOIR and 50% surplus utilization.

    Returns:
        FOIR-based, surplus-based, and final safe EMI capacity values plus the
        configuration and a short-history confidence warning when applicable.

    Raises:
        ValueError: If required feature values are unavailable or invalid, or
            ``config`` is not a :class:`SafeEMIConfig` instance.
    """
    if not isinstance(features, CreditHealthFeatures):
        raise ValueError("features must be a CreditHealthFeatures instance")
    if config is None:
        config = SafeEMIConfig()
    if not isinstance(config, SafeEMIConfig):
        raise ValueError("config must be a SafeEMIConfig instance")

    average_monthly_income = _validate_positive_number(
        features.average_monthly_income, "average_monthly_income"
    )
    average_monthly_emi = _validate_non_negative_number(
        features.average_monthly_emi, "average_monthly_emi"
    )
    average_monthly_surplus = _validate_finite_number(
        features.average_monthly_surplus, "average_monthly_surplus"
    )

    target_total_emi_capacity = (
        average_monthly_income * config.target_foir_percent / 100
    )
    foir_based_capacity = max(
        target_total_emi_capacity - average_monthly_emi, 0.0
    )
    surplus_based_capacity = max(
        average_monthly_surplus * config.surplus_utilization_ratio, 0.0
    )

    return {
        "target_foir_percent": config.target_foir_percent,
        "surplus_utilization_ratio": config.surplus_utilization_ratio,
        "foir_based_capacity": foir_based_capacity,
        "surplus_based_capacity": surplus_based_capacity,
        "safe_emi_capacity": min(foir_based_capacity, surplus_based_capacity),
        "method": "minimum_of_foir_and_surplus_capacity",
        "confidence_warning": (
            "SHORT_HISTORY" if features.months_of_history < 4 else None
        ),
    }


def _validate_positive_number(value: float, field_name: str) -> float:
    """Return a finite numeric value greater than zero."""
    normalized_value = _validate_finite_number(value, field_name)
    if normalized_value <= 0:
        raise ValueError(f"{field_name} must be greater than zero")
    return normalized_value


def _validate_non_negative_number(value: float, field_name: str) -> float:
    """Return a finite numeric value that is zero or greater."""
    normalized_value = _validate_finite_number(value, field_name)
    if normalized_value < 0:
        raise ValueError(f"{field_name} cannot be negative")
    return normalized_value


def _validate_finite_number(value: float, field_name: str) -> float:
    """Return a finite real number or raise a clear validation error."""
    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError(f"{field_name} must be numeric")
    normalized_value = float(value)
    if not isfinite(normalized_value):
        raise ValueError(f"{field_name} must be finite")
    return normalized_value
