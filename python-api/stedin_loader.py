"""
Stedin Zeeland kleinverbruik data loader.
Handles format differences across years 2013-2025.

- 2013-2023: tab-separated, header row, column = SJV_GEMIDDELD
- 2021:      semicolon-separated, no header, same columns
- 2024-2025: tab-separated, header row, column = SJA_GEMIDDELD
- 2022:      no Zeeland file (transition year Enduris → Stedin)
"""

from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data" / "stedin"

COLS = [
    "NETBEHEERDER", "NETGEBIED", "STRAATNAAM", "POSTCODE_VAN", "POSTCODE_TOT",
    "WOONPLAATS", "LANDCODE", "PRODUCTSOORT", "VERBRUIKSSEGMENT",
    "AANSLUITINGEN_AANTAL", "LEVERINGSRICHTING_PERC", "FYSIEKE_STATUS_PERC",
    "SOORT_AANSLUITING_PERC", "SOORT_AANSLUITING", "SJV_GEMIDDELD",
    "SJV_LAAG_TARIEF_PERC", "SLIMME_METER_PERC",
]

AVAILABLE_YEARS = [y for y in range(2013, 2026) if y != 2022]


def _parse_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.replace(",", "."), errors="coerce")


def _load_year(year: int) -> pd.DataFrame | None:
    path = DATA_DIR / f"zeeland-{year}.csv"
    if not path.exists():
        return None

    try:
        if year == 2021:
            # Semicolon-sep, no header, extra quote layers
            df = pd.read_csv(
                path, sep=";", header=None, names=COLS,
                encoding="utf-8-sig", quotechar='"',
                skipinitialspace=True,
            )
            for col in df.columns:
                df[col] = df[col].astype(str).str.strip('"')
        else:
            df = pd.read_csv(
                path, sep="\t", encoding="utf-8-sig", quotechar='"',
            )
            # Normalise column name (SJA → SJV)
            df = df.rename(columns={"SJA_GEMIDDELD": "SJV_GEMIDDELD",
                                    "SJA_LAAG_TARIEF_PERC": "SJV_LAAG_TARIEF_PERC"})
    except Exception:
        return None

    # Parse numeric columns
    for col in ["AANSLUITINGEN_AANTAL", "LEVERINGSRICHTING_PERC",
                "SJV_GEMIDDELD", "SLIMME_METER_PERC"]:
        if col in df.columns:
            df[col] = _parse_num(df[col])

    df["JAAR"] = year
    df["PRODUCTSOORT"] = df["PRODUCTSOORT"].str.strip('"').str.upper()
    df["WOONPLAATS"] = df["WOONPLAATS"].str.strip('"').str.title()
    df["POSTCODE_VAN"] = df["POSTCODE_VAN"].str.strip('"').str.upper()

    return df


@lru_cache(maxsize=1)
def load_all() -> pd.DataFrame:
    frames = []
    for year in AVAILABLE_YEARS:
        df = _load_year(year)
        if df is not None:
            frames.append(df)
    return pd.concat(frames, ignore_index=True)
