"""Tests for normalized CSV and text-based PDF statement parsing."""

from datetime import date

import pytest

from app.transactions.parser import (
    normalize_description,
    parse_amount,
    parse_csv_statement,
    parse_pdf_statement,
)


FIXTURE_PATH = (
    __import__("pathlib").Path(__file__).parent
    / "fixtures"
    / "sample_bank_statement.csv"
)


def test_parses_csv_statement() -> None:
    """Parse all synthetic CSV rows into normalized transactions."""
    transactions = parse_csv_statement(str(FIXTURE_PATH))

    assert len(transactions) == 6
    assert transactions[0].source == "csv"


def test_converts_dates_to_date_objects() -> None:
    """Normalize CSV dates to datetime.date values."""
    transaction = parse_csv_statement(str(FIXTURE_PATH))[0]

    assert transaction.date == date(2026, 1, 1)
    assert isinstance(transaction.date, date)


def test_normalizes_credit_transactions() -> None:
    """Preserve credit direction in canonical uppercase form."""
    transactions = parse_csv_statement(str(FIXTURE_PATH))

    assert transactions[0].transaction_type == "CREDIT"


def test_normalizes_debit_transactions() -> None:
    """Preserve debit direction in canonical uppercase form."""
    transactions = parse_csv_statement(str(FIXTURE_PATH))

    assert next(item for item in transactions if item.description == "Rent").transaction_type == "DEBIT"


def test_parses_amount_with_commas() -> None:
    """Accept comma-formatted numeric amounts."""
    assert parse_amount("40,000") == 40000


def test_parses_amount_with_rupee_symbol() -> None:
    """Accept rupee-formatted numeric amounts."""
    assert parse_amount("₹ 40,000.50") == 40000.5


def test_cleans_description_whitespace() -> None:
    """Trim and collapse repeated transaction-description whitespace."""
    assert normalize_description("  UPI   ZOMATO   PAYMENT  ") == "UPI ZOMATO PAYMENT"


def test_sorts_transactions_by_date() -> None:
    """Return transaction records in ascending date order."""
    transactions = parse_csv_statement(str(FIXTURE_PATH))

    assert [transaction.date for transaction in transactions] == sorted(
        transaction.date for transaction in transactions
    )


def test_rejects_invalid_file_path() -> None:
    """Reject a statement file that does not exist."""
    with pytest.raises(ValueError, match="does not exist"):
        parse_csv_statement("missing-statement.csv")


def test_rejects_missing_required_columns(tmp_path: pytest.TempPathFactory) -> None:
    """Reject a CSV without a recognizable amount/type layout."""
    statement_path = tmp_path / "missing_columns.csv"
    statement_path.write_text("Date,Description\n2026-01-01,Salary\n", encoding="utf-8")

    with pytest.raises(ValueError, match="amount and type"):
        parse_csv_statement(str(statement_path))


def test_rejects_invalid_amount(tmp_path: pytest.TempPathFactory) -> None:
    """Reject a malformed transaction amount without skipping its row."""
    statement_path = tmp_path / "invalid_amount.csv"
    statement_path.write_text(
        "Date,Description,Amount,Type\n2026-01-01,Salary,not-a-number,CREDIT\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="amount could not be parsed"):
        parse_csv_statement(str(statement_path))


def test_rejects_invalid_transaction_type(tmp_path: pytest.TempPathFactory) -> None:
    """Reject an unsupported transaction direction without skipping its row."""
    statement_path = tmp_path / "invalid_type.csv"
    statement_path.write_text(
        "Date,Description,Amount,Type\n2026-01-01,Salary,40000,TRANSFER\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="unsupported transaction_type"):
        parse_csv_statement(str(statement_path))


def test_rejects_empty_statement(tmp_path: pytest.TempPathFactory) -> None:
    """Reject a header-only CSV statement."""
    statement_path = tmp_path / "empty_statement.csv"
    statement_path.write_text("Date,Description,Amount,Type\n", encoding="utf-8")

    with pytest.raises(ValueError, match="contains no transactions"):
        parse_csv_statement(str(statement_path))


def test_rejects_unsupported_pdf_layout(monkeypatch: pytest.MonkeyPatch, tmp_path: pytest.TempPathFactory) -> None:
    """Report a clear error when text-based PDF content has no supported layout."""
    pdf_path = tmp_path / "unsupported.pdf"
    pdf_path.touch()

    class FakePage:
        """Minimal unrecognized PDF page."""

        def extract_tables(self) -> list:
            return []

        def extract_text(self) -> str:
            return "Unrecognized bank statement layout"

    class FakePdf:
        """Minimal context-managed PDF containing one fake page."""

        pages = [FakePage()]

        def __enter__(self) -> "FakePdf":
            return self

        def __exit__(self, *args: object) -> None:
            return None

    monkeypatch.setattr("app.transactions.parser.pdfplumber.open", lambda _: FakePdf())

    with pytest.raises(ValueError, match="layout could not be recognized"):
        parse_pdf_statement(str(pdf_path))
