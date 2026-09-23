"""Tests for seeded Monte Carlo EMI affordability simulation."""

import numpy as np
import pytest

from app.risk.monte_carlo import (
    RiskSimulationInput,
    compare_emi_affordability,
    generate_income_simulation,
    simulate_emi_affordability,
)


@pytest.fixture
def simulation_input() -> RiskSimulationInput:
    """Return the specified reproducible sample input."""
    return RiskSimulationInput(60000, 20000, 18000, 20, 10000, 42)


def test_runs_valid_simulation(simulation_input: RiskSimulationInput) -> None:
    """Return a complete affordability summary for valid input."""
    result = simulate_emi_affordability(simulation_input)

    assert result["stress_count"] + result["affordable_count"] == 10000
    assert 0 <= result["stress_probability"] <= 1
    assert result["stress_probability_percent"] == pytest.approx(
        result["stress_probability"] * 100
    )


def test_uses_default_simulation_count() -> None:
    """Use 10,000 simulations when the optional count is omitted."""
    input_data = RiskSimulationInput(60000, 20000, 18000, 20)

    assert input_data.simulations == 10000
    assert simulate_emi_affordability(input_data)["simulations"] == 10000


def test_seeded_results_are_reproducible(
    simulation_input: RiskSimulationInput,
) -> None:
    """Produce the same probability for repeated seeded simulations."""
    first = simulate_emi_affordability(simulation_input)
    second = simulate_emi_affordability(simulation_input)

    assert first["stress_probability"] == second["stress_probability"]
    assert first["mean_simulated_income"] == second["mean_simulated_income"]


def test_higher_emi_does_not_reduce_stress_for_same_samples(
    simulation_input: RiskSimulationInput,
) -> None:
    """Keep a higher EMI at least as stressful on identical income samples."""
    comparison = compare_emi_affordability(simulation_input, 22000)

    assert (
        comparison["alternative"]["stress_probability"]
        >= comparison["current"]["stress_probability"]
    )


def test_zero_volatility_uses_constant_income() -> None:
    """Generate identical income values and a binary stress outcome at zero volatility."""
    input_data = RiskSimulationInput(60000, 20000, 18000, 0, 100, 42)
    result = simulate_emi_affordability(input_data)

    assert result["mean_simulated_income"] == 60000
    assert result["stress_probability"] == 0
    assert np.all(generate_income_simulation(input_data) == 60000)


def test_clips_simulated_income_to_zero() -> None:
    """Never return negative income values even under extreme volatility."""
    input_data = RiskSimulationInput(100, 0, 10, 100, 10000, 42)

    assert np.min(generate_income_simulation(input_data)) >= 0


def test_rejects_invalid_income() -> None:
    """Reject zero monthly income."""
    with pytest.raises(ValueError):
        RiskSimulationInput(0, 20000, 18000, 20)


def test_rejects_negative_fixed_expenses() -> None:
    """Reject negative fixed monthly expenses."""
    with pytest.raises(ValueError):
        RiskSimulationInput(60000, -1, 18000, 20)


def test_rejects_zero_emi() -> None:
    """Reject zero EMI."""
    with pytest.raises(ValueError):
        RiskSimulationInput(60000, 20000, 0, 20)


def test_rejects_volatility_greater_than_100() -> None:
    """Reject volatility outside the permitted upper bound."""
    with pytest.raises(ValueError):
        RiskSimulationInput(60000, 20000, 18000, 101)


def test_rejects_negative_volatility() -> None:
    """Reject negative income volatility."""
    with pytest.raises(ValueError):
        RiskSimulationInput(60000, 20000, 18000, -1)


def test_rejects_zero_simulations() -> None:
    """Reject a zero simulation count."""
    with pytest.raises(ValueError):
        RiskSimulationInput(60000, 20000, 18000, 20, 0)


def test_compares_current_and_alternative_on_same_samples(
    simulation_input: RiskSimulationInput,
) -> None:
    """Return both summaries from one reproducible income distribution."""
    comparison = compare_emi_affordability(simulation_input, 14000)
    current = comparison["current"]
    alternative = comparison["alternative"]

    assert current["mean_simulated_income"] == alternative["mean_simulated_income"]
    assert current["min_simulated_income"] == alternative["min_simulated_income"]
    assert current["max_simulated_income"] == alternative["max_simulated_income"]
    assert comparison["stress_probability_change"] == pytest.approx(
        alternative["stress_probability"] - current["stress_probability"]
    )
    assert comparison["stress_probability_change_percentage_points"] == pytest.approx(
        comparison["stress_probability_change"] * 100
    )
