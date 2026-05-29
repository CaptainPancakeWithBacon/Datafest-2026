"""
Datafest 2026 — Energy API
FastAPI sidecar that reads the CBS Excel and exposes data + simulation endpoints.
"""

from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Config ─────────────────────────────────────────────────────────────────────

XLSX = Path(__file__).parent.parent / "data" / "energie-en-broeikasgassen.xlsx"

app = FastAPI(title="Datafest 2026 Energy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Data loading ───────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def load_data() -> dict:
    """Parse the CBS Excel once and cache in memory."""
    if not XLSX.exists():
        raise FileNotFoundError(f"Excel not found: {XLSX}")

    xl = pd.ExcelFile(XLSX)

    # Tabel 1b — total domestic energy consumption
    df1b = xl.parse("Tabel1bAanbodUitvoer&Verbruik", header=0)
    df1b.columns = ["jaar", "balanspost", "energiedrager", "waarde"]
    tv = df1b[df1b["balanspost"] == "Totaal energieverbruik"].copy()

    def mix_series(carrier: str) -> list[float]:
        return (
            tv[tv["energiedrager"] == carrier]
            .sort_values("jaar")["waarde"]
            .round(1)
            .tolist()
        )

    mix_years = sorted(tv["jaar"].unique().tolist())
    mix = {
        "years":     mix_years,
        "gas":       mix_series("Aardgas"),
        "oil":       mix_series("Aardoliegrondstoffen en producten"),
        "coal":      mix_series("Kool en koolproducten"),
        "nuclear":   mix_series("Kernenergie"),
        "renewable": mix_series("Hernieuwbare energie"),
        "total":     mix_series("Totaal energiedragers"),
    }

    # Tabel 5 — electricity production
    df5 = xl.parse("Tabel5AanbodElektriciteit", header=0)
    df5.columns = ["jaar", "balanspost", "energiebron", "waarde"]
    bp = df5[df5["balanspost"] == "BrutoProductie"].copy()

    def elec_series(carrier: str) -> list[float]:
        return (
            bp[bp["energiebron"] == carrier]
            .sort_values("jaar")["waarde"]
            .round(2)
            .tolist()
        )

    electricity = {
        "years":   sorted(bp["jaar"].unique().tolist()),
        "wind":    elec_series("Windenergie"),
        "solar":   elec_series("Zonne-energie"),
        "biomass": elec_series("Biomassa"),
        "gas":     elec_series("Aardgas"),
        "coal":    elec_series("Steenkool"),
        "nuclear": elec_series("Kernenergie"),
        "total":   elec_series("Totaal energiedragers"),
    }

    # Tabel 6a — GHG emissions
    df6 = xl.parse("Tabel6aEmissieNaarSector", header=0)
    df6.columns = ["jaar", "broeikasgas", "sector", "emissie"]
    totaal = (
        df6[
            (df6["broeikasgas"] == "TotaalBroeikasgassen")
            & (df6["sector"] == "TotaalSectoren")
        ]
        .sort_values("jaar")
    )
    ghg_years = totaal["jaar"].tolist()
    ghg_total = totaal["emissie"].round(1).tolist()
    ghg_target = [round(227.5 - (227.5 - 102.4) * (y - 1990) / 40, 1) for y in ghg_years]

    by_sector = {}
    for sector in df6["sector"].unique():
        if sector == "TotaalSectoren":
            continue
        sub = (
            df6[
                (df6["broeikasgas"] == "TotaalBroeikasgassen")
                & (df6["sector"] == sector)
            ]
            .sort_values("jaar")
        )
        if not sub.empty:
            by_sector[sector] = sub["emissie"].round(1).tolist()

    ghg = {
        "years":     ghg_years,
        "total":     ghg_total,
        "target":    ghg_target,
        "by_sector": by_sector,
    }

    # Tabel 3b — final energy by sector
    df3b = xl.parse("Tabel3bFinaalEnergieverbruik", header=0)
    df3b.columns = ["jaar", "sector", "energiedrager", "waarde"]
    sector_totals = df3b[df3b["energiedrager"] == "Totaal energiedragers"].copy()
    sector_years = sorted(sector_totals["jaar"].unique().tolist())
    sectors = {}
    for s in sector_totals["sector"].unique():
        sub = sector_totals[sector_totals["sector"] == s].sort_values("jaar")
        sectors[s] = sub["waarde"].round(1).tolist()

    return {
        "mix":             mix,
        "electricity":     electricity,
        "ghg":             ghg,
        "final_by_sector": {"years": sector_years, **sectors},
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/api/data/all")
def get_all():
    """All datasets in one call."""
    return load_data()


@app.get("/api/data/mix")
def get_mix():
    return load_data()["mix"]


@app.get("/api/data/electricity")
def get_electricity():
    return load_data()["electricity"]


@app.get("/api/data/ghg")
def get_ghg():
    return load_data()["ghg"]


@app.get("/api/data/sectors")
def get_sectors():
    return load_data()["final_by_sector"]


@app.get("/api/timelapse")
def get_timelapse(year: int = Query(..., ge=1990, le=2024)):
    """
    Return all datasets sliced up to `year` (inclusive).
    Use this to drive an animated replay of the energy transition.
    """
    d = load_data()

    def slice_to(series_years: list, series_dict: dict) -> dict:
        idx = next((i for i, y in enumerate(series_years) if y > year), len(series_years))
        out = {"years": series_years[:idx]}
        for k, v in series_dict.items():
            if k != "years" and isinstance(v, list):
                out[k] = v[:idx]
            elif k == "by_sector" and isinstance(v, dict):
                out[k] = {s: vals[:idx] for s, vals in v.items()}
        return out

    return {
        "year":        year,
        "mix":         slice_to(d["mix"]["years"],         d["mix"]),
        "electricity": slice_to(d["electricity"]["years"], d["electricity"]),
        "ghg":         slice_to(d["ghg"]["years"],         d["ghg"]),
    }


class SimulateRequest(BaseModel):
    wind_growth: float = 12.0    # PJ/yr added to wind
    solar_growth: float = 10.0   # PJ/yr added to solar
    gas_reduction: float = 20.0  # PJ/yr removed from gas
    horizon: int = 2030


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    """
    Project energy transition from 2024 baseline to req.horizon.
    Returns yearly projections including renewable share % and GHG estimate.
    """
    d = load_data()

    BASE_RENEWABLE   = d["mix"]["renewable"][-1]   # 2024 value
    BASE_TOTAL       = d["mix"]["total"][-1]
    BASE_GHG         = d["ghg"]["total"][-1]
    BASE_WIND        = d["electricity"]["wind"][-1]
    BASE_SOLAR       = d["electricity"]["solar"][-1]
    BASE_ELEC_TOTAL  = d["electricity"]["total"][-1]

    steps = req.horizon - 2024
    if steps <= 0:
        raise HTTPException(status_code=400, detail="horizon must be after 2024")

    proj_years = list(range(2025, req.horizon + 1))
    renewable_share = []
    ghg_proj = []
    wind_proj = []
    solar_proj = []
    elec_renewable_share = []

    for s in range(1, steps + 1):
        new_renewable = BASE_RENEWABLE + (req.wind_growth + req.solar_growth) * s
        new_total = max(BASE_TOTAL - req.gas_reduction * s * 0.5, 1000.0)
        new_ghg = BASE_GHG - req.gas_reduction * s * 0.056 - (req.wind_growth + req.solar_growth) * s * 0.01
        new_wind = BASE_WIND + req.wind_growth * s
        new_solar = BASE_SOLAR + req.solar_growth * s
        new_elec_ren = new_wind + new_solar
        new_elec_total = max(BASE_ELEC_TOTAL - req.gas_reduction * s * 0.3, 200.0)

        renewable_share.append(round(min(new_renewable / new_total * 100, 100), 1))
        ghg_proj.append(round(max(new_ghg, 0), 1))
        wind_proj.append(round(new_wind, 1))
        solar_proj.append(round(new_solar, 1))
        elec_renewable_share.append(round(min(new_elec_ren / new_elec_total * 100, 100), 1))

    # Trend analysis on historical data using linear regression
    hist_years = np.array(d["mix"]["years"])
    hist_ren_share = np.array([
        round(r / t * 100, 2) for r, t in zip(d["mix"]["renewable"], d["mix"]["total"])
    ])
    coeffs = np.polyfit(hist_years[-10:], hist_ren_share[-10:], 1)  # last 10 years
    trend_slope = round(float(coeffs[0]), 3)

    return {
        "baseline_year":      2024,
        "horizon":            req.horizon,
        "trend_slope_pp_yr":  trend_slope,
        "projection": {
            "years":                  proj_years,
            "renewable_share_pct":    renewable_share,
            "ghg_mton":               ghg_proj,
            "wind_pj":                wind_proj,
            "solar_pj":               solar_proj,
            "elec_renewable_share_pct": elec_renewable_share,
        },
        "targets": {
            "renewable_share_2030": 27.0,
            "ghg_2030":            102.4,
            "elec_renewable_2030":  70.0,
        },
        "on_track": {
            "renewable": renewable_share[-1] >= 27.0 if renewable_share else False,
            "ghg":       ghg_proj[-1] <= 102.4 if ghg_proj else False,
            "electricity": elec_renewable_share[-1] >= 70.0 if elec_renewable_share else False,
        },
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "excel_loaded": XLSX.exists()}
