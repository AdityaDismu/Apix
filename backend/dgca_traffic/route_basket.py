from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from .config import (
    DIRECTIONAL_ROUTES_CSV,
    ROUTE_BASKET_JSON,
    REFERENCE_PERIOD,
    EFFECTIVE_FROM,
    TOP_BILATERAL_ROUTES,
)


# ============================================================
# CITY → IATA MAPPING
# ============================================================

CITY_TO_IATA = {
    "DELHI": "DEL",
    "MUMBAI": "BOM",
    "BENGALURU": "BLR",
    "HYDERABAD": "HYD",
    "PUNE": "PNQ",
    "KOLKATA": "CCU",
    "AHMEDABAD": "AMD",
    "CHENNAI": "MAA",
    "SRINAGAR": "SXR",
    "GOA": "GOI",
    "DABOLIM": "GOI",
    "GUWAHATI": "GAU",
    "KOCHI": "COK",
    "JAIPUR": "JAI",
    "LUCKNOW": "LKO",
    "NAGPUR": "NAG",
    "PATNA": "PAT",
    "VARANASI": "VNS",
    "SURAT": "STV",
    "BHUBANESWAR": "BBI",
    "INDORE": "IDR",
    "CHANDIGARH": "IXC",
    "RAIPUR": "RPR",
    "RANCHI": "IXR",
    "DEHRADUN": "DED",
    "TRIVANDRUM": "TRV",
    "KOZHIKODE": "CCJ",
    "MANGALORE": "IXE",
    "VISAKHAPATNAM": "VTZ",
    "COIMBATORE": "CJB",
    "MADURAI": "IXM",
    "TIRUPATI": "TIR",
    "VIJAYAWADA": "VGA",
    "JAMMU": "IXJ",
    "LEH": "IXL",
    "JODHPUR": "JDH",
    "UDAIPUR": "UDR",
    "AMRITSAR": "ATQ",
    "BHOPAL": "BHO",
    "BHUBANESWAR": "BBI",
    "BAGDOGRA": "IXB",
    "PORT BLAIR": "IXZ",
    "DIBRUGARH": "DIB",
    "SILCHAR": "IXS",
    "SHILLONG": "SHL",
    "AGARTALA": "IXA",
    "AIZAWL": "AJL",
    "IMPHAL": "IMF",
    "DIMAPUR": "DMU",
    "KANNUR": "CNN",
    "RAJAHMUNDRY": "RJA",
    "HINDON AIRPORT": "HDO",
    "RAJKOT INTERNATIONAL AIRPORT": "HSR",
    "AYODHYA INTERNATIONAL AIRPORT": "AYJ",
    "SHIVAMOGGA AIRPORT": "SWR",
    "AMBIKAPUR AIRPORT": "AHA",
    "AGRA": "AGR",
    "BELGAUM": "IXG",
    "JABALPUR": "JLR",
    "KISHANGARH": "KQH",
}


def city_to_iata(city: str) -> str | None:
    normalized = city.strip().upper()

    if normalized == "DABOLIM":
        return "GOI"

    return CITY_TO_IATA.get(
        normalized
    )


def build_bilateral_markets(
    city_pair_rows: list[dict],
) -> list[dict]:

    markets = []

    for row in city_pair_rows:
        origin_city = row["city_1"]
        destination_city = row["city_2"]

        origin_iata = city_to_iata(
            origin_city
        )

        destination_iata = city_to_iata(
            destination_city
        )

        if not origin_iata or not destination_iata:
            continue

        total_volume = (
            row["passengers_to_city_2"]
            + row["passengers_from_city_2"]
        )

        if total_volume <= 0:
            continue

        markets.append(
            {
                "origin_city": origin_city,
                "destination_city":
                    destination_city,
                "origin": origin_iata,
                "destination":
                    destination_iata,
                "passengers_forward":
                    row[
                        "passengers_to_city_2"
                    ],
                "passengers_reverse":
                    row[
                        "passengers_from_city_2"
                    ],
                "bilateral_volume":
                    total_volume,
                "source_serial_number":
                    row["serial_number"],
            }
        )

    markets.sort(
        key=lambda row:
            row["bilateral_volume"],
        reverse=True,
    )

    return markets


def build_directional_routes(
    top_markets: list[dict],
) -> list[dict]:

    routes = []

    for market in top_markets:

        forward = {
            "origin":
                market["origin"],
            "destination":
                market["destination"],
            "passenger_volume":
                market["passengers_forward"],
            "city_origin":
                market["origin_city"],
            "city_destination":
                market["destination_city"],
            "direction":
                "forward",
            "reference_period":
                REFERENCE_PERIOD,
            "source":
                "DGCA Table 5.01",
            "effective_from":
                EFFECTIVE_FROM,
        }

        reverse = {
            "origin":
                market["destination"],
            "destination":
                market["origin"],
            "passenger_volume":
                market["passengers_reverse"],
            "city_origin":
                market["destination_city"],
            "city_destination":
                market["origin_city"],
            "direction":
                "reverse",
            "reference_period":
                REFERENCE_PERIOD,
            "source":
                "DGCA Table 5.01",
            "effective_from":
                EFFECTIVE_FROM,
        }

        if forward["passenger_volume"] > 0:
            routes.append(forward)

        if reverse["passenger_volume"] > 0:
            routes.append(reverse)

    return routes


def calculate_weights(
    routes: list[dict],
) -> list[dict]:

    total_volume = sum(
        route["passenger_volume"]
        for route in routes
    )

    if total_volume <= 0:
        raise ValueError(
            "Selected route basket has zero "
            "passenger volume."
        )

    for route in routes:
        route["weight"] = (
            route["passenger_volume"]
            / total_volume
        )

    return routes


def write_directional_csv(
    routes: list[dict],
) -> None:

    DIRECTIONAL_ROUTES_CSV.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    fieldnames = [
        "origin",
        "destination",
        "city_origin",
        "city_destination",
        "direction",
        "passenger_volume",
        "weight",
        "reference_period",
        "source",
        "effective_from",
    ]

    with DIRECTIONAL_ROUTES_CSV.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        for route in routes:
            writer.writerow(
                {
                    field: route[field]
                    for field in fieldnames
                }
            )


def write_basket_json(
    markets: list[dict],
    routes: list[dict],
) -> None:

    selected_volume = sum(
        market["bilateral_volume"]
        for market in markets
    )

    basket = {
        "reference_period":
            REFERENCE_PERIOD,
        "source":
            "DGCA Table 5.01",
        "selection_method":
            "Top bilateral passenger-volume markets",
        "top_bilateral_routes":
            len(markets),
        "directional_routes":
            len(routes),
        "selected_bilateral_passenger_volume":
            selected_volume,
        "routes": routes,
    }

    ROUTE_BASKET_JSON.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    ROUTE_BASKET_JSON.write_text(
        json.dumps(
            basket,
            indent=2,
        ),
        encoding="utf-8",
    )


def build_route_basket(
    city_pair_rows: list[dict],
) -> list[dict]:

    markets = build_bilateral_markets(
        city_pair_rows
    )

    if len(markets) < TOP_BILATERAL_ROUTES:
        raise ValueError(
            "Not enough mapped high-volume "
            "markets to construct the route basket."
        )

    selected_markets = markets[
        :TOP_BILATERAL_ROUTES
    ]

    routes = build_directional_routes(
        selected_markets
    )

    routes = calculate_weights(
        routes
    )

    write_directional_csv(
        routes
    )

    write_basket_json(
        selected_markets,
        routes,
    )

    return routes