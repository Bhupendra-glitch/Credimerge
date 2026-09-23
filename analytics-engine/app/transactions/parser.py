"""CSV and text-based PDF parsers for normalized bank-statement transactions."""

import csv
from datetime import date, datetime
from math import isfinite
from pathlib import Path
import re
from typing import Any

import pdfplumber

from app.transactions.models import Transaction


_DATE_COLUMNS = ("date", "transaction_date", "txn_date")
_DESCRIPTION_COLUMNS = (
    "description",
    "particulars",
    "narration",
    "transaction_description",
)
_AMOUNT_COLUMNS = ("amount", "transaction_amount")
_TYPE_COLUMNS = ("type", "transaction_type", "credit_debit")
_DEBIT_COLUMNS = ("debit", "debit_amount")
_CREDIT_COLUMNS = ("credit", "credit_amount")
_BALANCE_COLUMNS = (
    "balance",
    "closing_balance",
    "available_balance",
    "running_balance",
)
_DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")


def parse_csv_statement(file_path: str) -> list[Transaction]:
    """Parse a practical CSV bank statement into ordered transactions.

    Supported column layouts are ``Date, Description, Amount, Type`` using
    common header variants, and ``Date, Description, Debit, Credit`` using
    common amount-column variants. Each malformed transaction row raises a
    ``ValueError``; rows are never silently discarded.

    Args:
        file_path: Path to a CSV bank statement.

    Returns:
        Normalized transactions in ascending date order with ``source="csv"``.

    Raises:
        ValueError: If the file is missing, its column structure is unsupported,
            a row is malformed, or it contains no transactions.
    """
    path = _validate_existing_file(file_path, "CSV")

    try:
        with path.open("r", encoding="utf-8-sig", newline="") as statement_file:
            reader = csv.DictReader(statement_file)
            if not reader.fieldnames:
                raise ValueError("CSV statement must include a header row")
            layout = _identify_layout(reader.fieldnames)
            transactions = [
                _parse_csv_row(row, reader.fieldnames, layout, row_number)
                for row_number, row in enumerate(reader, start=2)
            ]
    except UnicodeDecodeError as error:
        raise ValueError("CSV statement must be UTF-8 encoded") from error

    return _sort_and_require_transactions(transactions, "CSV")


def parse_pdf_statement(file_path: str) -> list[Transaction]:
    """Parse a simple text-based PDF statement into ordered transactions.

    The prototype supports tables or pipe-delimited text with either
    ``Date | Description | Amount | Type`` or
    ``Date | Description | Debit | Credit`` columns. It does not support OCR,
    image-only PDFs, or arbitrary bank-specific layouts.

    Args:
        file_path: Path to a text-based PDF bank statement.

    Returns:
        Normalized transactions in ascending date order with ``source="pdf"``.

    Raises:
        ValueError: If the file is missing, unreadable, uses no supported layout,
            or includes a malformed recognized transaction row.
    """
    path = _validate_existing_file(file_path, "PDF")
    transactions: list[Transaction] = []
    recognized_layout = False

    try:
        with pdfplumber.open(path) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                page_transactions, page_recognized = _parse_pdf_tables(
                    page, page_number
                )
                transactions.extend(page_transactions)
                recognized_layout = recognized_layout or page_recognized

                if not page_recognized:
                    text_transactions, text_recognized = _parse_pdf_text(
                        page, page_number
                    )
                    transactions.extend(text_transactions)
                    recognized_layout = recognized_layout or text_recognized
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("Unable to read PDF statement") from error

    if not recognized_layout:
        raise ValueError("PDF statement layout could not be recognized")
    return _sort_and_require_transactions(transactions, "PDF")


def parse_date(value: str) -> date:
    """Parse a supported date string into a ``datetime.date`` object.

    Args:
        value: Date in ``YYYY-MM-DD``, ``DD-MM-YYYY``, ``DD/MM/YYYY``, or
            ``YYYY/MM/DD`` format.

    Returns:
        Parsed calendar date.

    Raises:
        ValueError: If the value is blank or does not use a supported format.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("date must be a non-empty supported date string")

    cleaned_value = value.strip()
    for date_format in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned_value, date_format).date()
        except ValueError:
            continue
    raise ValueError(f"date could not be parsed: {value!r}")


def parse_amount(value: Any) -> float:
    """Parse a currency-formatted amount into a positive float magnitude.

    Args:
        value: Number or numeric string such as ``"40,000"`` or
            ``"₹ 40,000.50"``. A negative sign is treated as direction metadata
            and removed because direction is stored separately.

    Returns:
        Positive finite amount magnitude.

    Raises:
        ValueError: If the amount is blank, non-numeric, non-finite, or zero.
    """
    if isinstance(value, bool) or value is None:
        raise ValueError("amount must be numeric")

    if isinstance(value, str):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("amount must not be blank")
        cleaned_value = re.sub(r"[₹$€£,\s]", "", cleaned_value)
    else:
        cleaned_value = str(value)

    try:
        amount = abs(float(cleaned_value))
    except (TypeError, ValueError) as error:
        raise ValueError(f"amount could not be parsed: {value!r}") from error

    if not isfinite(amount) or amount == 0:
        raise ValueError("amount must be a positive finite number")
    return amount


def parse_balance(value: Any) -> float:
    """Parse an optional statement balance while preserving its sign.

    Args:
        value: Numeric balance or a currency-formatted string such as
            ``"₹ 40,000.50"``.

    Returns:
        Finite balance as a float. Unlike transaction amounts, negative values
        are preserved because they can represent an overdraft.

    Raises:
        ValueError: If the balance is blank, non-numeric, or non-finite.
    """
    if isinstance(value, bool) or value is None:
        raise ValueError("balance must be numeric")

    if isinstance(value, str):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("balance must not be blank")
        cleaned_value = re.sub(r"[₹$€£,\s]", "", cleaned_value)
    else:
        cleaned_value = str(value)

    try:
        balance = float(cleaned_value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"balance could not be parsed: {value!r}") from error
    if not isfinite(balance):
        raise ValueError("balance must be finite")
    return balance


def normalize_transaction_type(value: str) -> str:
    """Normalize common credit/debit labels to a canonical transaction type.

    Args:
        value: Direction label such as ``"credit"``, ``"debit"``, ``"CR"``,
            or ``"DR"``.

    Returns:
        Either ``"CREDIT"`` or ``"DEBIT"``.

    Raises:
        ValueError: If the transaction direction is blank or unsupported.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("transaction_type must be a non-empty string")

    normalized_value = re.sub(r"[\s_-]+", "", value).upper()
    if normalized_value in {"CREDIT", "CR", "C"}:
        return "CREDIT"
    if normalized_value in {"DEBIT", "DR", "D"}:
        return "DEBIT"
    raise ValueError(f"unsupported transaction_type: {value!r}")


def normalize_description(value: str) -> str:
    """Trim and collapse whitespace while preserving transaction narration.

    Args:
        value: Raw statement description.

    Returns:
        Description with leading, trailing, and repeated whitespace removed.

    Raises:
        ValueError: If the description is blank or not a string.
    """
    if not isinstance(value, str):
        raise ValueError("description must be a string")
    normalized_value = " ".join(value.split())
    if not normalized_value:
        raise ValueError("description must not be blank")
    return normalized_value


def _parse_pdf_tables(page: Any, page_number: int) -> tuple[list[Transaction], bool]:
    """Parse supported PDF table layouts from one page."""
    transactions: list[Transaction] = []
    recognized_layout = False

    for table_number, table in enumerate(page.extract_tables() or [], start=1):
        if not table or len(table) < 2:
            continue
        headers = table[0]
        try:
            layout = _identify_layout(headers)
        except ValueError:
            continue

        recognized_layout = True
        for row_number, row in enumerate(table[1:], start=2):
            transactions.append(
                _parse_positional_row(
                    row,
                    layout,
                    f"PDF page {page_number}, table {table_number}, row {row_number}",
                )
            )
    return transactions, recognized_layout


def _parse_pdf_text(page: Any, page_number: int) -> tuple[list[Transaction], bool]:
    """Parse a pipe-delimited statement layout from one PDF text page."""
    text = page.extract_text() or ""
    lines = [line for line in text.splitlines() if "|" in line]
    transactions: list[Transaction] = []

    for line_index, line in enumerate(lines):
        headers = [value.strip() for value in line.split("|")]
        try:
            layout = _identify_layout(headers)
        except ValueError:
            continue

        for row_number, row_line in enumerate(lines[line_index + 1 :], start=line_index + 2):
            values = [value.strip() for value in row_line.split("|")]
            transactions.append(
                _parse_positional_row(
                    values, layout, f"PDF page {page_number}, text row {row_number}"
                )
            )
        return transactions, True

    return transactions, False


def _identify_layout(headers: list[Any]) -> dict:
    """Identify supported headers and return their normalized column positions."""
    normalized_headers = [_normalize_column_name(header) for header in headers]
    if any(not header for header in normalized_headers):
        raise ValueError("statement headers must not be blank")
    if len(set(normalized_headers)) != len(normalized_headers):
        raise ValueError("statement headers must be unique")

    header_positions = {header: index for index, header in enumerate(normalized_headers)}
    date_column = _find_column(header_positions, _DATE_COLUMNS)
    description_column = _find_column(header_positions, _DESCRIPTION_COLUMNS)
    amount_column = _find_column(header_positions, _AMOUNT_COLUMNS)
    type_column = _find_column(header_positions, _TYPE_COLUMNS)
    debit_column = _find_column(header_positions, _DEBIT_COLUMNS)
    credit_column = _find_column(header_positions, _CREDIT_COLUMNS)
    balance_column = _find_column(header_positions, _BALANCE_COLUMNS)

    if date_column is None or description_column is None:
        raise ValueError("statement must include date and description columns")
    if amount_column is not None and type_column is not None:
        layout = {
            "layout_type": "amount_and_type",
            "date": date_column,
            "description": description_column,
            "amount": amount_column,
            "transaction_type": type_column,
        }
        if balance_column is not None:
            layout["balance"] = balance_column
        return layout
    if debit_column is not None and credit_column is not None:
        layout = {
            "layout_type": "debit_and_credit",
            "date": date_column,
            "description": description_column,
            "debit": debit_column,
            "credit": credit_column,
        }
        if balance_column is not None:
            layout["balance"] = balance_column
        return layout
    raise ValueError(
        "statement must include amount and type columns or separate debit and credit columns"
    )


def _parse_csv_row(
    row: dict[str | None, str],
    headers: list[str],
    layout: dict,
    row_number: int,
) -> Transaction:
    """Parse one CSV DictReader row and include its number in validation errors."""
    if None in row:
        raise ValueError(f"CSV row {row_number} contains more values than headers")
    return _parse_positional_row(
        [row[header] for header in headers], layout, f"CSV row {row_number}", "csv"
    )


def _parse_positional_row(
    row: list[Any], layout: dict, row_context: str, source: str = "pdf"
) -> Transaction:
    """Parse one PDF table/text row using recognized header positions."""
    if len(row) < max(index for key, index in layout.items() if key != "layout_type") + 1:
        raise ValueError(f"{row_context} has fewer values than its header")
    mapping = {str(index): value for index, value in enumerate(row)}
    position_layout = {
        key: str(value) if key != "layout_type" else value for key, value in layout.items()
    }
    return _build_transaction_from_mapping(mapping, position_layout, row_context, source)


def _build_transaction_from_mapping(
    values: dict[Any, Any], layout: dict, row_context: str, source: str
) -> Transaction:
    """Build one normalized transaction from recognized fields and a source."""
    try:
        transaction_date = parse_date(values[layout["date"]])
        description = normalize_description(values[layout["description"]])
        if layout["layout_type"] == "amount_and_type":
            amount = parse_amount(values[layout["amount"]])
            transaction_type = normalize_transaction_type(
                values[layout["transaction_type"]]
            )
        else:
            amount, transaction_type = _parse_debit_credit_values(
                values[layout["debit"]], values[layout["credit"]]
            )
        balance = None
        if "balance" in layout and _has_value(values[layout["balance"]]):
            balance = parse_balance(values[layout["balance"]])
        return Transaction(
            date=transaction_date,
            description=description,
            amount=amount,
            transaction_type=transaction_type,
            source=source,
            balance=balance,
        )
    except (KeyError, ValueError, TypeError) as error:
        raise ValueError(f"{row_context} is invalid: {error}") from error


def _parse_debit_credit_values(debit_value: Any, credit_value: Any) -> tuple[float, str]:
    """Determine transaction direction from exactly one populated split column."""
    debit_present = _has_value(debit_value)
    credit_present = _has_value(credit_value)
    if debit_present == credit_present:
        raise ValueError("exactly one of debit or credit must contain an amount")
    if debit_present:
        return parse_amount(debit_value), "DEBIT"
    return parse_amount(credit_value), "CREDIT"


def _has_value(value: Any) -> bool:
    """Return whether a statement cell contains a non-whitespace value."""
    return value is not None and (not isinstance(value, str) or bool(value.strip()))


def _find_column(header_positions: dict[str, int], variants: tuple[str, ...]) -> int | None:
    """Find the first recognized header variant in a normalized header map."""
    for variant in variants:
        if variant in header_positions:
            return header_positions[variant]
    return None


def _normalize_column_name(value: Any) -> str:
    """Normalize a statement header for resilient common-variant matching."""
    if not isinstance(value, str):
        return ""
    return re.sub(r"[\s-]+", "_", value.strip().lower())


def _validate_existing_file(file_path: str, statement_kind: str) -> Path:
    """Return an existing statement file path or raise a clear ValueError."""
    if not isinstance(file_path, str) or not file_path.strip():
        raise ValueError(f"{statement_kind} file_path must be a non-empty string")
    path = Path(file_path)
    if not path.is_file():
        raise ValueError(f"{statement_kind} statement file does not exist: {file_path}")
    return path


def _sort_and_require_transactions(
    transactions: list[Transaction], statement_kind: str
) -> list[Transaction]:
    """Reject empty input and return transactions in ascending date order."""
    if not transactions:
        raise ValueError(f"{statement_kind} statement contains no transactions")
    return sorted(transactions, key=lambda transaction: transaction.date)
