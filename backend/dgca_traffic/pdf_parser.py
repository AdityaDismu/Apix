from __future__ import annotations

import csv
from pathlib import Path

from openpyxl import load_workbook

from .config import CITY_PAIR_CSV


EXPECTED_TOTAL_PASSENGERS = 165_541_692
EXPECTED_RECORDS = 835
KNOWN_SOURCE_ANOMALIES = {162}


def clean_city_name(value: object) -> str:
    if value is None:
        return ""

    value = str(value).strip()

    replacements = {
        "DehraDun": "DEHRADUN",
        "Dehra Dun": "DEHRADUN",
        "Goa": "GOA",
        "Kishangarh": "KISHANGARH",
        "Cuddapah": "CUDDAPAH",
        "Itanagar": "ITANAGAR",
        "Malvan": "MALVAN",
        "Pondicherry": "PONDICHERRY",
        "Rajkot International Airport": "RAJKOT INTERNATIONAL AIRPORT",
        "Ayodhya International Airport": "AYODHYA INTERNATIONAL AIRPORT",
        "HINDON AIRPORT": "HINDON AIRPORT",
        "Shivamogga Airport": "SHIVAMOGGA AIRPORT",
        "Ambikapur Airport": "AMBIKAPUR AIRPORT",
        "Utkela": "UTKELA",
    }

    if value in replacements:
        return replacements[value]

    return value.upper()


def parse_passenger_value(value: object) -> int:
    if value is None:
        return 0

    if isinstance(value, (int, float)):
        return int(value)

    value = str(value).strip()

    if value in {"", "-"}:
        return 0

    value = value.replace(",", "")

    return int(float(value))


def find_header_row(worksheet) -> int:
    for row_number in range(
        1,
        worksheet.max_row + 1,
    ):
        values = [
            str(cell.value).strip().upper()
            if cell.value is not None
            else ""
            for cell in worksheet[row_number]
        ]

        joined = " | ".join(values)

        if (
            "CITY 1" in joined
            and "CITY 2" in joined
        ):
            return row_number

    raise ValueError(
        "Could not locate the DGCA city-pair table header "
        "containing CITY 1 and CITY 2."
    )


def find_column_indexes(
    worksheet,
    header_row: int,
) -> dict[str, int]:
    headers = {}

    for column_number in range(
        1,
        worksheet.max_column + 1,
    ):
        value = worksheet.cell(
            row=header_row,
            column=column_number,
        ).value

        if value is None:
            continue

        header = " ".join(
            str(value)
            .replace("\n", " ")
            .replace("\r", " ")
            .split()
        ).upper()

        headers[header] = column_number

    def find_column(*possible_names: str) -> int:
        normalized_names = {
            " ".join(
                name
                .replace("\n", " ")
                .replace("\r", " ")
                .split()
            ).upper()
            for name in possible_names
        }

        for header, column_number in headers.items():
            if header in normalized_names:
                return column_number

        raise ValueError(
            "Required DGCA Excel column not found. "
            f"Expected one of: {possible_names}. "
            f"Available columns: {list(headers.keys())}"
        )

    return {
        "serial_number": find_column(
            "S.NO.",
            "S.NO",
            "S NO.",
            "S NO",
            "SERIAL NUMBER",
        ),
        "city_1": find_column(
            "CITY 1",
        ),
        "city_2": find_column(
            "CITY 2",
        ),
        "passengers_to": find_column(
            "PASSENGERS TO CITY 2",
            "PASSENGERS TO",
        ),
        "passengers_from": find_column(
            "PASSENGERS FROM CITY 2",
            "PASSENGERS FROM",
        ),
    }


def extract_city_pair_rows(
    excel_path: Path,
) -> list[dict]:

    if not excel_path.exists():
        raise FileNotFoundError(
            f"DGCA city-pair Excel file not found: {excel_path}"
        )

    workbook = load_workbook(
        excel_path,
        read_only=True,
        data_only=True,
    )

    worksheet = workbook.active

    header_row = find_header_row(worksheet)

    columns = find_column_indexes(
        worksheet,
        header_row,
    )

    rows = []

    for row_number in range(
        header_row + 1,
        worksheet.max_row + 1,
    ):
        values = [
            worksheet.cell(
                row=row_number,
                column=column_number,
            ).value
            for column_number in range(
                1,
                worksheet.max_column + 1,
            )
        ]

        serial_value = values[
            columns["serial_number"] - 1
        ]

        city_1_value = values[
            columns["city_1"] - 1
        ]

        city_2_value = values[
            columns["city_2"] - 1
        ]

        pax_to_value = values[
            columns["passengers_to"] - 1
        ]

        pax_from_value = values[
            columns["passengers_from"] - 1
        ]

        if all(
            value is None
            for value in values
        ):
            continue

        if serial_value is None:
            continue

        try:
            serial_number = int(
                float(
                    str(serial_value).replace(",", "")
                )
            )
        except (
            ValueError,
            TypeError,
        ):
            continue

        city_1 = clean_city_name(city_1_value)
        city_2 = clean_city_name(city_2_value)

        if not city_1 or not city_2:
            continue

        if (
            serial_number in KNOWN_SOURCE_ANOMALIES
            and city_1 == city_2
        ):
            continue

        rows.append(
            {
                "serial_number": serial_number,
                "city_1": city_1,
                "city_2": city_2,
                "passengers_to_city_2":
                    parse_passenger_value(
                        pax_to_value
                    ),
                "passengers_from_city_2":
                    parse_passenger_value(
                        pax_from_value
                    ),
                "source_row": row_number,
            }
        )

    workbook.close()

    return rows


def validate_rows(
    rows: list[dict],
) -> None:

    if not rows:
        raise ValueError(
            "No DGCA city-pair records were extracted."
        )

    print(
        f"Extracted city-pair rows: {len(rows)}"
    )

    expected_valid_records = (
        EXPECTED_RECORDS
        - len(KNOWN_SOURCE_ANOMALIES)
    )

    if len(rows) != expected_valid_records:
        raise ValueError(
            "Unexpected DGCA city-pair record count. "
            f"Expected {expected_valid_records} valid records "
            f"after known source anomalies, "
            f"got {len(rows)}."
        )

    serials = [
        row["serial_number"]
        for row in rows
    ]

    duplicate_serials = sorted(
        {
            serial
            for serial in serials
            if serials.count(serial) > 1
        }
    )

    if duplicate_serials:
        raise ValueError(
            "Duplicate DGCA serial numbers found: "
            f"{duplicate_serials}"
        )

    expected_serials = set(
        range(
            1,
            EXPECTED_RECORDS + 1,
        )
    )

    actual_serials = set(serials)

    missing_serials = sorted(
        expected_serials
        - actual_serials
        - KNOWN_SOURCE_ANOMALIES
    )

    unexpected_serials = sorted(
        actual_serials
        - expected_serials
    )

    if missing_serials:
        raise ValueError(
            "Missing DGCA serial numbers: "
            f"{missing_serials}"
        )

    if unexpected_serials:
        raise ValueError(
            "Unexpected DGCA serial numbers: "
            f"{unexpected_serials}"
        )

    total_passengers = 0

    for row in rows:

        if not row["city_1"]:
            raise ValueError(
                "Empty CITY 1 encountered: "
                f"{row}"
            )

        if not row["city_2"]:
            raise ValueError(
                "Empty CITY 2 encountered: "
                f"{row}"
            )

        if row["city_1"] == row["city_2"]:
            raise ValueError(
                "Origin and destination are identical: "
                f"{row}"
            )

        if (
            row["passengers_to_city_2"] < 0
            or row["passengers_from_city_2"] < 0
        ):
            raise ValueError(
                "Negative passenger count encountered: "
                f"{row}"
            )

        total_passengers += (
            row["passengers_to_city_2"]
            + row["passengers_from_city_2"]
        )

    print(
        "City-pair passenger total: "
        f"{total_passengers:,}"
    )

    print(
        "DGCA airline-table total: "
        f"{EXPECTED_TOTAL_PASSENGERS:,}"
    )

    expected_analytical_total = (
        EXPECTED_TOTAL_PASSENGERS - 2
    )

    if total_passengers != expected_analytical_total:
        difference = (
            total_passengers
            - expected_analytical_total
        )

        print(
            "Passenger total difference: "
            f"{difference:,}"
        )

        raise ValueError(
            "DGCA city-pair passenger total does not "
            "match the expected analytical total after "
            "excluding known source anomaly 162."
        )

    print(
        "SOURCE TOTAL: "
        f"{EXPECTED_TOTAL_PASSENGERS:,}"
    )

    print(
        "ANALYTICAL TOTAL: "
        f"{expected_analytical_total:,}"
    )

    print(
        "TOTAL CROSS-CHECK: PASS"
    )


def write_city_pair_csv(
    rows: list[dict],
    output_path: Path = CITY_PAIR_CSV,
) -> None:

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=[
                "serial_number",
                "city_1",
                "city_2",
                "passengers_to_city_2",
                "passengers_from_city_2",
                "source_row",
            ],
        )

        writer.writeheader()

        writer.writerows(rows)


def parse_city_pair_pdf(
    pdf_path: Path,
) -> list[dict]:

    rows = extract_city_pair_rows(
        pdf_path
    )

    validate_rows(rows)

    write_city_pair_csv(rows)

    return rows