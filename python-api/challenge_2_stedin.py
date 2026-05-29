"""
Challenge 2 — Stedin postcode microdata endpoints.
Covers residential + small-business connections in Zeeland, 2013-2025 (excl. 2022).
"""

from functools import lru_cache

import numpy as np
import pandas as pd
from fastapi import APIRouter

from stedin_loader import AVAILABLE_YEARS, load_all

router = APIRouter(prefix="/api/challenge-2/stedin", tags=["Challenge 2 – Stedin"])

YEARS = AVAILABLE_YEARS

# Top municipalities to show (by total connections in latest year)
TOP_N = 10


def _float(x) -> float | None:
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), 2)


@lru_cache(maxsize=1)
def _summary() -> dict:
    df = load_all()
    elk = df[df["PRODUCTSOORT"] == "ELK"]
    gas = df[df["PRODUCTSOORT"] == "GAS"]

    # Top cities by total ELK connections (latest year)
    latest = elk[elk["JAAR"] == elk["JAAR"].max()]
    top_cities = (
        latest.groupby("WOONPLAATS")["AANSLUITINGEN_AANTAL"]
        .sum()
        .nlargest(TOP_N)
        .index.tolist()
    )

    # ── Trends per year (all Zeeland) ─────────────────────────────────────────
    def _yearly(subset: pd.DataFrame, value_col: str = "SJV_GEMIDDELD") -> dict:
        grp = (
            subset.groupby("JAAR")
            .apply(lambda g: np.average(g[value_col].dropna(),
                                        weights=g.loc[g[value_col].notna(), "AANSLUITINGEN_AANTAL"]),
                   include_groups=False)
            .reset_index(name="avg")
        )
        return {
            "years":  grp["JAAR"].tolist(),
            "values": [_float(v) for v in grp["avg"]],
        }

    elk_trend = _yearly(elk)
    gas_trend = _yearly(gas)

    # ── Solar proxy (% connections with net backfeed) ─────────────────────────
    solar_global = (
        elk.groupby("JAAR")
        .apply(lambda g: _float(100 - np.average(
            g["LEVERINGSRICHTING_PERC"].dropna(),
            weights=g.loc[g["LEVERINGSRICHTING_PERC"].notna(), "AANSLUITINGEN_AANTAL"]
        )), include_groups=False)
        .reset_index(name="solar_pct")
    )

    # ── Per-city breakdown ────────────────────────────────────────────────────
    cities: dict[str, dict] = {}
    for city in top_cities:
        ce = elk[elk["WOONPLAATS"] == city]
        cg = gas[gas["WOONPLAATS"] == city]

        elk_y = ce.groupby("JAAR").apply(
            lambda g: _float(np.average(g["SJV_GEMIDDELD"].dropna(),
                                        weights=g.loc[g["SJV_GEMIDDELD"].notna(), "AANSLUITINGEN_AANTAL"]))
            if not g["SJV_GEMIDDELD"].dropna().empty else None,
            include_groups=False,
        ).reset_index(name="avg_kwh")

        gas_y = cg.groupby("JAAR").apply(
            lambda g: _float(np.average(g["SJV_GEMIDDELD"].dropna(),
                                        weights=g.loc[g["SJV_GEMIDDELD"].notna(), "AANSLUITINGEN_AANTAL"]))
            if not g["SJV_GEMIDDELD"].dropna().empty else None,
            include_groups=False,
        ).reset_index(name="avg_m3")

        solar_y = ce.groupby("JAAR").apply(
            lambda g: _float(100 - np.average(
                g["LEVERINGSRICHTING_PERC"].dropna(),
                weights=g.loc[g["LEVERINGSRICHTING_PERC"].notna(), "AANSLUITINGEN_AANTAL"]
            )) if not g["LEVERINGSRICHTING_PERC"].dropna().empty else None,
            include_groups=False,
        ).reset_index(name="solar_pct")

        smart_y = ce.groupby("JAAR").apply(
            lambda g: _float(np.average(
                g["SLIMME_METER_PERC"].dropna(),
                weights=g.loc[g["SLIMME_METER_PERC"].notna(), "AANSLUITINGEN_AANTAL"]
            )) if not g["SLIMME_METER_PERC"].dropna().empty else None,
            include_groups=False,
        ).reset_index(name="smart_pct")

        # Align all to full YEARS range
        def _align(grp: pd.DataFrame, col: str) -> list:
            m = dict(zip(grp["JAAR"], grp[col]))
            return [m.get(y) for y in YEARS]

        cities[city] = {
            "elk_kwh":   _align(elk_y,   "avg_kwh"),
            "gas_m3":    _align(gas_y,   "avg_m3"),
            "solar_pct": _align(solar_y, "solar_pct"),
            "smart_pct": _align(smart_y, "smart_pct"),
        }

    # ── Trend slopes (linear regression kWh per year per city) ───────────────
    slopes: dict[str, dict] = {}
    for city in top_cities:
        ce = elk[elk["WOONPLAATS"] == city]
        grp = ce.groupby("JAAR").apply(
            lambda g: np.average(g["SJV_GEMIDDELD"].dropna(),
                                 weights=g.loc[g["SJV_GEMIDDELD"].notna(), "AANSLUITINGEN_AANTAL"])
            if not g["SJV_GEMIDDELD"].dropna().empty else np.nan,
            include_groups=False,
        ).dropna()

        if len(grp) >= 3:
            slope, intercept = np.polyfit(grp.index.astype(float), grp.values, 1)
            val_2013 = intercept + slope * 2013
            pct_change = slope / val_2013 * 100 if val_2013 else 0
            # Project year to reach -20% vs 2013 baseline
            target = val_2013 * 0.80
            year_to_target = (target - intercept) / slope if slope < 0 else None
            slopes[city] = {
                "slope_kwh_per_year": _float(slope),
                "pct_change_per_year": _float(pct_change),
                "val_2013": _float(val_2013),
                "val_latest": _float(grp.iloc[-1]),
                "year_to_minus20pct": int(year_to_target) if year_to_target and 2013 < year_to_target < 2060 else None,
            }

    # ── Overview stats ────────────────────────────────────────────────────────
    latest_elk = elk[elk["JAAR"] == elk["JAAR"].max()]
    overview = {
        "year_range": [min(YEARS), max(YEARS)],
        "years_available": YEARS,
        "total_elk_connections": int(latest_elk["AANSLUITINGEN_AANTAL"].sum()),
        "unique_postcodes": int(elk["POSTCODE_VAN"].nunique()),
        "unique_cities": int(elk["WOONPLAATS"].nunique()),
        "top_cities": top_cities,
    }

    return {
        "overview": overview,
        "years": YEARS,
        "elk_trend": elk_trend,
        "gas_trend": gas_trend,
        "solar_global": {
            "years":  solar_global["JAAR"].tolist(),
            "values": solar_global["solar_pct"].tolist(),
        },
        "cities": cities,
        "slopes": slopes,
    }


@router.get("/data")
def get_data():
    """All Stedin Zeeland analytics in one call."""
    return _summary()


@router.get("/overview")
def overview():
    return _summary()["overview"]


@router.get("/trends")
def trends():
    s = _summary()
    return {"years": s["years"], "elk": s["elk_trend"], "gas": s["gas_trend"]}


@router.get("/solar")
def solar():
    s = _summary()
    return {"years": s["years"], "global": s["solar_global"], "cities": {
        c: {"years": YEARS, "values": v["solar_pct"]} for c, v in s["cities"].items()
    }}


@router.get("/slopes")
def slopes():
    return _summary()["slopes"]
