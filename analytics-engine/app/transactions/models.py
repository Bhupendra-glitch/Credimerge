"""Normalized data models for bank-statement transactions."""

from dataclasses import dataclass
from datetime import date
from math import isfinite
from numbers import Real


@dataclass(frozen=True)
class Transaction:
    """One normalized incoming or outgoing bank-statement transaction.

    Attributes:
        date: Calendar date on which the transaction occurred.
        description: Cleaned human-readable transaction narration.
        amount: Positive transaction magnitude, independent of direction.
        transaction_type: Either ``"CREDIT"`` or ``"DEBIT"``.
        source: Statement source, such as ``"csv"``, ``"pdf"``, or
            ``"manual"``.
        balance: Actual optional statement balance at this transaction. It is
            ``None`` when the source did not provide a usable balance value.

    Raises:
        ValueError: If a field is invalid or the transaction direction is not
            ``"CREDIT"`` or ``"DEBIT"``.
    """

    date: date
    description: str
    amount: float
    transaction_type: str
    source: str | None = None
    balance: float | None = None

    def __post_init__(self) -> None:
        """Validate normalized transaction fields."""
        if not isinstance(self.date, date):
            raise ValueError("date must be a datetime.date instance")
        if not isinstance(self.description, str) or not self.description:
            raise ValueError("description must be a non-empty string")
        if isinstance(self.amount, bool) or not isinstance(self.amount, Real):
            raise ValueError("amount must be numeric")
        if not isfinite(float(self.amount)) or float(self.amount) <= 0:
            raise ValueError("amount must be a positive finite number")
        if self.transaction_type not in {"CREDIT", "DEBIT"}:
            raise ValueError("transaction_type must be CREDIT or DEBIT")
        if self.source is not None and self.source not in {"csv", "pdf", "manual"}:
            raise ValueError("source must be csv, pdf, manual, or None")
        if self.balance is not None:
            if isinstance(self.balance, bool) or not isinstance(self.balance, Real):
                raise ValueError("balance must be numeric or None")
            if not isfinite(float(self.balance)):
                raise ValueError("balance must be finite or None")
            object.__setattr__(self, "balance", float(self.balance))
