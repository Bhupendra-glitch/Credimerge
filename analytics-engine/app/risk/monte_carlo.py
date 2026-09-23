"""Seeded Monte Carlo simulation for monthly EMI affordability."""

from dataclasses import dataclass
from math import isfinite
from numbers import Integral, Real

import numpy as np


@dataclass
class RiskSimulationInput:
    """Validated inputs for an educational EMI affordability simulation.

    Attributes:
        monthly_income: Positive, finite expected monthly income.
        fixed_monthly_expenses: Finite monthly fixed expenses that are zero or
            greater.
        emi: Positive, finite monthly EMI to assess.
        income_volatility_percent: Finite income volatility from 0 through 100.
        simulations: Positive whole number of simulated months.
        random_seed: Whole-number seed used for deterministic sampling.

    Raises:
        ValueError: If an input is non-numeric, non-finite, or outside its
            permitted range.
    """

    monthly_income: float
    fixed_monthly_expenses: float
    emi: float
    income_volatility_percent: float
    simulations: int = 10000
    random_seed: int = 42

    def __post_init__(self) -> None:
        """Validate and normalize fields after dataclass initialization."""
        self.monthly_income = _validate_positive_number(
            self.monthly_income, "monthly_income"
        )
        self.fixed_monthly_expenses = _validate_non_negative_number(
            self.fixed_monthly_expenses, "fixed_monthly_expenses"
        )
        self.emi = _validate_positive_number(self.emi, "emi")
        self.income_volatility_percent = _validate_non_negative_number(
            self.income_volatility_percent, "income_volatility_percent"
        )
        if self.income_volatility_percent > 100:
            raise ValueError("income_volatility_percent cannot exceed 100")
        self.simulations = _validate_positive_integer(self.simulations, "simulations")
        self.random_seed = _validate_integer(self.random_seed, "random_seed")


def generate_income_simulation(input_data: RiskSimulationInput) -> np.ndarray:
    """Generate non-negative monthly income samples for a validated input.

    Args:
        input_data: Income, volatility, sample-count, and seed information.

    Returns:
        A NumPy array of simulated monthly incomes, clipped to a minimum of
        zero and reproducible for the supplied random seed.

    Raises:
        ValueError: If ``input_data`` is not a :class:`RiskSimulationInput`.
    """
    _validate_input_data(input_data)
    income_std = input_data.monthly_income * input_data.income_volatility_percent / 100
    generator = np.random.default_rng(input_data.random_seed)
    simulated_income = generator.normal(
        loc=input_data.monthly_income,
        scale=income_std,
        size=input_data.simulations,
    )
    return np.clip(simulated_income, 0, None)


def simulate_emi_affordability(input_data: RiskSimulationInput) -> dict:
    """Estimate the likelihood that EMI exceeds post-expense monthly income.

    Args:
        input_data: Validated simulation inputs, including the EMI to assess.

    Returns:
        Summary statistics and affordability counts, including the stress
        probability as both a decimal and percentage.

    Raises:
        ValueError: If ``input_data`` is not a :class:`RiskSimulationInput`.
    """
    _validate_input_data(input_data)
    income_samples = generate_income_simulation(input_data)
    return _summarize_affordability(input_data, input_data.emi, income_samples)


def compare_emi_affordability(
    base_input: RiskSimulationInput, alternative_emi: float
) -> dict:
    """Compare current and alternative EMI affordability on identical samples.

    Args:
        base_input: Validated input representing the current EMI scenario.
        alternative_emi: Positive, finite EMI to assess against the same income
            samples used for the current scenario.

    Returns:
        Current and alternative simulation summaries plus absolute and
        percentage-point changes in stress probability.

    Raises:
        ValueError: If ``base_input`` is invalid or ``alternative_emi`` is not
            a positive finite number.
    """
    _validate_input_data(base_input)
    validated_alternative_emi = _validate_positive_number(
        alternative_emi, "alternative_emi"
    )
    income_samples = generate_income_simulation(base_input)
    current = _summarize_affordability(base_input, base_input.emi, income_samples)
    alternative = _summarize_affordability(
        base_input, validated_alternative_emi, income_samples
    )
    stress_probability_change = (
        alternative["stress_probability"] - current["stress_probability"]
    )

    return {
        "current": current,
        "alternative": alternative,
        "stress_probability_change": stress_probability_change,
        "stress_probability_change_percentage_points": stress_probability_change
        * 100,
    }


def _summarize_affordability(
    input_data: RiskSimulationInput, emi: float, income_samples: np.ndarray
) -> dict:
    """Calculate affordability summary fields from a supplied income sequence."""
    available_after_fixed = income_samples - input_data.fixed_monthly_expenses
    stress_count = int(np.count_nonzero(available_after_fixed < emi))
    affordable_count = input_data.simulations - stress_count
    stress_probability = stress_count / input_data.simulations

    return {
        "simulations": input_data.simulations,
        "monthly_income": input_data.monthly_income,
        "fixed_monthly_expenses": input_data.fixed_monthly_expenses,
        "emi": emi,
        "income_volatility_percent": input_data.income_volatility_percent,
        "random_seed": input_data.random_seed,
        "mean_simulated_income": float(np.mean(income_samples)),
        "min_simulated_income": float(np.min(income_samples)),
        "max_simulated_income": float(np.max(income_samples)),
        "stress_count": stress_count,
        "affordable_count": affordable_count,
        "stress_probability": stress_probability,
        "stress_probability_percent": stress_probability * 100,
    }


def _validate_input_data(input_data: RiskSimulationInput) -> None:
    """Ensure a public function received the expected input model."""
    if not isinstance(input_data, RiskSimulationInput):
        raise ValueError("input_data must be a RiskSimulationInput instance")


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


def _validate_positive_integer(value: int, field_name: str) -> int:
    """Return a positive integer or raise a clear validation error."""
    normalized_value = _validate_integer(value, field_name)
    if normalized_value <= 0:
        raise ValueError(f"{field_name} must be greater than zero")
    return normalized_value


def _validate_integer(value: int, field_name: str) -> int:
    """Return an integer while rejecting booleans and non-integral values."""
    if isinstance(value, bool) or not isinstance(value, Integral):
        raise ValueError(f"{field_name} must be an integer")
    return int(value)
