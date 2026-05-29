"""
Challenge 2 — Zeeland: From Province to Postcode
Klimaatmonitor Zeeland dataset (CBS/RVO), 2010-2024.

Hoofdvraag: Hoe heeft het energieverbruik in Zeeland zich tussen 2010 en
2024 ontwikkeld binnen verschillende sectoren?
"""

from functools import lru_cache
from pathlib import Path

import pandas as pd
from fastapi import APIRouter

router = APIRouter(prefix="/api/challenge-2", tags=["Challenge 2"])

DATA_DIR = Path(__file__).parent.parent / "data" / "klimaatmonitor_zeeland"

YEARS = list(range(2010, 2025))


def _csv(filename: str) -> pd.DataFrame:
    path = DATA_DIR / filename
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, sep=";", encoding="utf-8-sig", quotechar='"', index_col=False)
    df["Waarde"] = pd.to_numeric(df["Waarde"].astype(str).str.replace(",", "."), errors="coerce")
    df["Periode"] = pd.to_numeric(df["Periode"], errors="coerce").astype("Int64")
    return df.dropna(subset=["Waarde", "Periode"])


def _series(df: pd.DataFrame, indicator: str) -> pd.Series:
    """Return a Periode-indexed Series for a single indicator, deduplicated."""
    sub = df[df["Indicator"] == indicator]
    if sub.empty:
        sub = df[df["Indicator"].str.startswith(indicator, na=False)]
    return sub.drop_duplicates(subset=["Periode"]).set_index("Periode")["Waarde"]


def _align(s: pd.Series, years: list[int] = YEARS, unit: str = "TJ") -> dict:
    """Return a JSON-serialisable dict aligned to the full year range (None for gaps)."""
    import math

    def _val(y: int):
        if y not in s.index:
            return None
        v = float(s[y])
        return round(v, 1) if math.isfinite(v) else None

    return {"years": years, "values": [_val(y) for y in years], "unit": unit}


def _add_series(a: pd.Series, b: pd.Series) -> pd.Series:
    """Sum two series; a year is null unless BOTH components have data."""
    combined = pd.DataFrame({"a": a, "b": b})
    result = combined.sum(axis=1)
    result[combined.isna().any(axis=1)] = float("nan")
    return result


def _index100(s: pd.Series) -> pd.Series:
    """Re-base a series so that the first non-null value = 100."""
    first = s.dropna().iloc[0] if not s.dropna().empty else None
    if first is None or first == 0:
        return s
    return (s / first * 100).round(1)


@lru_cache(maxsize=1)
def _load() -> dict:
    # ── 2.1 — Total energy consumption ────────────────────────────────────────
    df21 = _csv("2.1 Totaal energieverbruik - Zeeland.csv")

    # Use the "verkeer en vervoer" indicator — covers up to 2024
    total_s = _series(df21, "Totaal bekend energieverbruik (aardgas, elektriciteit, stadswarmte, verkeer en vervoer)")
    total_old = _series(df21, "Totaal bekend energieverbruik (aardgas, elektriciteit, stadswarmte, verkeer/vervoer, overige warmte)")
    for y in total_old.index:
        if y not in total_s.index:
            total_s[y] = total_old[y]
    total_s = total_s.sort_index()

    ren_s = _series(df21, "Totaal bekende hernieuwbare energie")

    total = _align(total_s)
    renewable = _align(ren_s)

    fossil_vals, ren_share_vals = [], []
    for t, r in zip(total["values"], renewable["values"]):
        if t is None or r is None:
            fossil_vals.append(None)
            ren_share_vals.append(None)
        else:
            fossil_vals.append(round(t - r, 1))
            ren_share_vals.append(round(r / t * 100, 1) if t else 0.0)

    # ── 2.2 — Renewable electricity (TWh → TJ) ────────────────────────────────
    df22 = _csv("2.2 Hernieuwbare elektriciteit - Zeeland.csv")
    ren_elec_s = _series(df22, "Totaal bekende hernieuwbare elektriciteit")
    ren_elec_tj = _align(ren_elec_s * 3600)

    # ── 2.3 — Gebouwde omgeving ────────────────────────────────────────────────
    # Both gas and elec cover full 2010-2024 — safe to sum
    df23 = _csv("2.3 Energieverbruik gebouwde omgeving - Zeeland.csv")
    gebouwde_omgeving_s = _add_series(
        _series(df23, "Aardgasverbruik Gebouwde omgeving"),
        _series(df23, "Elektriciteitsverbruik Gebouwde omgeving"),
    )
    gebouwde_omgeving = _align(gebouwde_omgeving_s)

    # ── 2.4 — Mobiliteit ──────────────────────────────────────────────────────
    df24 = _csv("2.4 Energieverbruik mobiliteit - Zeeland.csv")
    mobiliteit_s = _series(df24, "Totaal bekend fossiel energieverbruik Verkeer")
    mobiliteit = _align(mobiliteit_s)

    # ── 2.5 — Industrie ───────────────────────────────────────────────────────
    # Gas missing for 2019, 2020, 2023 — null those years rather than show elec-only
    df25 = _csv("2.5 Energieverbruik industrie - Zeeland.csv")
    industrie_gas_s  = _series(df25, "Totaal bekend aardgasverbruik Industrie")
    industrie_elec_s = _series(df25, "Totaal bekend elektriciteitsverbruik Industrie")
    industrie_s = _add_series(industrie_gas_s, industrie_elec_s)
    industrie = _align(industrie_s)

    # ── 2.6 — Landbouw ────────────────────────────────────────────────────────
    # Gas missing for 2017-2019 — null those years
    df26 = _csv("2.6 Energieverbruik landbouw - Zeeland.csv")
    landbouw_s = _add_series(
        _series(df26, "Aardgas geleverd aan Landbouw"),
        _series(df26, "Elektriciteit geleverd aan Landbouw"),
    )
    landbouw = _align(landbouw_s)

    # ── DV2 indexed (2010 = 100) ──────────────────────────────────────────────
    def _idx(s: pd.Series) -> dict:
        return _align(_index100(s), unit="%")

    dv2_indexed = {
        "gebouwde_omgeving": _idx(gebouwde_omgeving_s),
        "industrie":         _idx(industrie_s),
        "landbouw":          _idx(landbouw_s),
        "mobiliteit":        _idx(mobiliteit_s),
    }

    # ── 3.2 — Renewable capacity & generation ─────────────────────────────────
    df32 = _csv("3.2 Resultaten elektriciteit - Zeeland.csv")

    wind_cap_s  = _series(df32, "Wind op land fysiek opgesteld vermogen")
    solar_dak_s = _series(df32, "Vermogen zonnepanelen (dakopstelling, grote systemen)")
    solar_vld_s = _series(df32, "Vermogen zonnepanelen (veldopstelling, grote systemen)")

    wind_gen_s      = _series(df32, "Wind op land hern. elektriciteit genormaliseerd")
    solar_dak_gen_s = _series(df32, "Zonnestroom (dakopstelling, grote systemen)")
    solar_vld_gen_s = _series(df32, "Zonnestroom (veldopstelling, grote systemen)")

    dv3_capacity = {
        "wind":       _align(wind_cap_s,  unit="MW"),
        "solar_dak":  _align(solar_dak_s, unit="MW"),
        "solar_veld": _align(solar_vld_s, unit="MW"),
    }
    dv3_generation = {
        "wind":       _align(wind_gen_s,      unit="TJ"),
        "solar_dak":  _align(solar_dak_gen_s, unit="TJ"),
        "solar_veld": _align(solar_vld_gen_s, unit="TJ"),
    }

    # ── Industrie deep-dive ────────────────────────────────────────────────────
    # Gas vs electricity split, industry share of total, renewable coverage gap
    total_renewable_gen_s = (
        wind_gen_s.add(solar_dak_gen_s, fill_value=0)
                  .add(solar_vld_gen_s, fill_value=0)
    )

    # Renewable coverage of industrial demand (%)
    ren_coverage_vals = []
    ind_vals  = _align(industrie_s)["values"]
    gen_total = _align(total_renewable_gen_s)["values"]
    for ind, ren in zip(ind_vals, gen_total):
        if ind and ren:
            ren_coverage_vals.append(round(ren / ind * 100, 1))
        else:
            ren_coverage_vals.append(None)

    # Industry share of total sectoral energy (only where all sectors have data)
    sectors_sum_s = (
        industrie_s.add(gebouwde_omgeving_s, fill_value=0)
                   .add(mobiliteit_s, fill_value=0)
                   .add(landbouw_s, fill_value=0)
    )
    ind_share_vals = []
    for y in YEARS:
        ind_v = float(industrie_s[y]) if y in industrie_s.index else None
        tot_v = float(sectors_sum_s[y]) if y in sectors_sum_s.index else None
        if ind_v and tot_v and ind_v == ind_v and tot_v == tot_v:  # nan check
            ind_share_vals.append(round(ind_v / tot_v * 100, 1))
        else:
            ind_share_vals.append(None)

    industrie_diepgang = {
        "gas":  _align(industrie_gas_s,  unit="TJ"),
        "elec": _align(industrie_elec_s, unit="TJ"),
        "total": industrie,
        "renewable_gen_total": _align(total_renewable_gen_s, unit="TJ"),
        "renewable_coverage_pct": {"years": YEARS, "values": ren_coverage_vals, "unit": "%"},
        "share_of_sectors_pct":   {"years": YEARS, "values": ind_share_vals,    "unit": "%"},
    }

    return {
        "years": YEARS,
        "dv1_total": {
            "total":     total,
            "renewable": renewable,
            "fossil":    {**total,    "values": fossil_vals},
            "ren_share": {**total,    "values": ren_share_vals, "unit": "%"},
        },
        "dv2_sectors": {
            "gebouwde_omgeving": gebouwde_omgeving,
            "industrie":         industrie,
            "landbouw":          landbouw,
            "mobiliteit":        mobiliteit,
        },
        "dv2_indexed": dv2_indexed,
        "dv3_fossil_renewable": {
            "renewable_elec_tj": ren_elec_tj,
            "renewable_total":   renewable,
            "fossil":            {**total, "values": fossil_vals},
            "share_pct":         {**total, "values": ren_share_vals, "unit": "%"},
        },
        "dv3_capacity":       dv3_capacity,
        "dv3_generation":     dv3_generation,
        "industrie_diepgang": industrie_diepgang,
    }


@router.get("/status")
def status():
    return {
        "data_loaded": DATA_DIR.exists(),
        "files": [f.name for f in DATA_DIR.glob("*.csv")] if DATA_DIR.exists() else [],
    }


@router.get("/data")
def get_data():
    """All Challenge 2 Zeeland datasets in one call."""
    return _load()


@router.get("/total-consumption")
def total_consumption():
    return _load()["dv1_total"]


@router.get("/sectors")
def sectors():
    return _load()["dv2_sectors"]


@router.get("/fossil-vs-renewable")
def fossil_vs_renewable():
    return _load()["dv3_fossil_renewable"]
