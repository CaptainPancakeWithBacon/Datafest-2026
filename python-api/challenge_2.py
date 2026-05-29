"""
Challenge 2 — Zeeland: From Province to Postcode
Stedin microdata: electricity + gas connections per postcode, 2013-2025.

Drop the Stedin CSV/Excel into data/stedin-zeeland.csv and the endpoints
below will start returning real data. Until then they return 404 with a
helpful message so the frontend degrades gracefully.
"""

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/challenge-2", tags=["Challenge 2"])

STEDIN_CSV = Path(__file__).parent.parent / "data" / "stedin-zeeland.csv"

# Expected columns (Stedin open data format)
YEAR_COL    = "LEVERINGSJAAR"
PC_COL      = "POSTCODE"
ELK_COL     = "ELK_SJV_KWH"
GAS_COL     = "GAS_SJV_M3"
LEVER_COL   = "LEVERINGSRICHTING_PERC"
SMART_COL   = "SLIMME_METER_PERC"
TYPE_COL    = "SOORT_AANSLUITING"
GEMEENTE_COL = "GEMEENTE"


def _require_stedin():
    if not STEDIN_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Stedin dataset not found. Place stedin-zeeland.csv in data/. "
                   f"Download from: https://www.stedin.net/zakelijk/open-data/verbruiksgegevens",
        )
    return pd.read_csv(STEDIN_CSV, low_memory=False)


@router.get("/status")
def status():
    """Check whether the Stedin dataset is present."""
    return {"stedin_loaded": STEDIN_CSV.exists(), "path": str(STEDIN_CSV)}


@router.get("/trends")
def trends():
    """
    Step 2: Electricity and gas consumption per municipality over time.
    Returns median ELK_SJV_KWH and GAS_SJV_M3 per year per gemeente.
    """
    df = _require_stedin()
    result = (
        df.groupby([YEAR_COL, GEMEENTE_COL])[[ELK_COL, GAS_COL]]
        .median()
        .round(0)
        .reset_index()
        .rename(columns={YEAR_COL: "year", GEMEENTE_COL: "gemeente", ELK_COL: "elk_kwh_median", GAS_COL: "gas_m3_median"})
    )
    return result.to_dict(orient="records")


@router.get("/solar-proxy")
def solar_proxy():
    """
    Step 3: Solar adoption proxy.
    Returns % of connections with LEVERINGSRICHTING_PERC < 100 per postcode per year.
    """
    df = _require_stedin()
    df["solar_proxy"] = df[LEVER_COL] < 100
    result = (
        df.groupby([YEAR_COL, PC_COL])["solar_proxy"]
        .mean()
        .mul(100)
        .round(1)
        .reset_index()
        .rename(columns={YEAR_COL: "year", PC_COL: "postcode", "solar_proxy": "solar_pct"})
    )
    return result.to_dict(orient="records")


@router.get("/slopes")
def slopes():
    """
    Step 4: Linear trend slope of ELK_SJV_KWH per postcode (kWh/year).
    Positive slope = consumption rising. Negative = falling.
    """
    import numpy as np
    df = _require_stedin()
    records = []
    for pc, grp in df.groupby(PC_COL):
        grp = grp.sort_values(YEAR_COL)
        if len(grp) < 3:
            continue
        coeffs = np.polyfit(grp[YEAR_COL], grp[ELK_COL].fillna(grp[ELK_COL].median()), 1)
        records.append({"postcode": pc, "slope_kwh_per_year": round(float(coeffs[0]), 1)})
    return sorted(records, key=lambda r: r["slope_kwh_per_year"])


@router.get("/projection")
def projection():
    """
    Step 5: Project each postcode to when it reaches 20% below 2013 baseline.
    Returns year of milestone (or None if not reached by 2040).
    """
    import numpy as np
    df = _require_stedin()
    baseline = df[df[YEAR_COL] == df[YEAR_COL].min()].set_index(PC_COL)[ELK_COL]
    records = []
    for pc, grp in df.groupby(PC_COL):
        grp = grp.sort_values(YEAR_COL)
        if len(grp) < 3 or pc not in baseline.index:
            continue
        target = baseline[pc] * 0.80
        coeffs = np.polyfit(grp[YEAR_COL], grp[ELK_COL].fillna(grp[ELK_COL].median()), 1)
        slope, intercept = coeffs
        if slope >= 0:
            milestone_year = None
        else:
            milestone_year_float = (target - intercept) / slope
            milestone_year = int(milestone_year_float) if 2013 < milestone_year_float < 2040 else None
        net_producer = bool((grp[LEVER_COL] < 50).any())
        records.append({"postcode": pc, "milestone_year": milestone_year, "net_producer": net_producer})
    return records
