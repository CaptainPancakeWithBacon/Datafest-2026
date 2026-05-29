"""
Challenge 3 — 2030 Target Tracker
Advanced scenario explorer: project Dutch energy transition to 2030 and beyond.
"""

from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/challenge-3", tags=["Challenge 3"])

XLSX = Path(__file__).parent.parent / "data" / "energie-en-broeikasgassen.xlsx"


@lru_cache(maxsize=1)
def _baselines() -> dict:
    if not XLSX.exists():
        raise FileNotFoundError(str(XLSX))
    xl = pd.ExcelFile(XLSX)

    df1b = xl.parse("Tabel1bAanbodUitvoer&Verbruik", header=0)
    df1b.columns = ["jaar", "balanspost", "energiedrager", "waarde"]
    tv = df1b[df1b["balanspost"] == "Totaal energieverbruik"]

    def last(carrier):
        return float(tv[tv["energiedrager"] == carrier].sort_values("jaar")["waarde"].iloc[-1])

    df5 = xl.parse("Tabel5AanbodElektriciteit", header=0)
    df5.columns = ["jaar", "balanspost", "energiebron", "waarde"]
    bp = df5[df5["balanspost"] == "BrutoProductie"]

    def last5(carrier):
        return float(bp[bp["energiebron"] == carrier].sort_values("jaar")["waarde"].iloc[-1])

    df6 = xl.parse("Tabel6aEmissieNaarSector", header=0)
    df6.columns = ["jaar", "broeikasgas", "sector", "emissie"]
    ghg_series = (
        df6[(df6["broeikasgas"] == "TotaalBroeikasgassen") & (df6["sector"] == "TotaalSectoren")]
        .sort_values("jaar")
    )
    ghg_vals   = ghg_series["emissie"].tolist()
    ghg_years  = ghg_series["jaar"].tolist()

    ren_series = tv[tv["energiedrager"] == "Hernieuwbare energie"].sort_values("jaar")["waarde"].tolist()
    tot_series = tv[tv["energiedrager"] == "Totaal energiedragers"].sort_values("jaar")["waarde"].tolist()
    mix_years  = sorted(tv["jaar"].unique().tolist())
    ren_share  = [round(r / t * 100, 2) if t else 0 for r, t in zip(ren_series, tot_series)]

    return {
        "renewable":    last("Hernieuwbare energie"),
        "total":        last("Totaal energiedragers"),
        "ghg":          ghg_vals[-1],
        "wind":         last5("Windenergie"),
        "solar":        last5("Zonne-energie"),
        "elec_total":   last5("Totaal energiedragers"),
        "ren_share_series": ren_share,
        "mix_years":    mix_years,
        "ghg_series":   ghg_vals,
        "ghg_years":    ghg_years,
    }


class SimulateRequest(BaseModel):
    wind_growth: float = 12.0    # PJ/yr
    solar_growth: float = 10.0   # PJ/yr
    gas_reduction: float = 20.0  # PJ/yr
    horizon: int = 2030


@router.post("/simulate")
def simulate(req: SimulateRequest):
    """
    Project Dutch energy transition from 2024 to req.horizon.
    Uses real 2024 baselines from the CBS Excel.
    Includes linear trend analysis on the last 10 years of historical data.
    """
    b = _baselines()
    steps = req.horizon - 2024
    if steps <= 0:
        raise HTTPException(400, "horizon must be after 2024")

    proj_years, ren_share, ghg_proj, wind_proj, solar_proj, elec_ren = [], [], [], [], [], []
    for s in range(1, steps + 1):
        new_ren        = b["renewable"] + (req.wind_growth + req.solar_growth) * s
        new_total      = max(b["total"] - req.gas_reduction * s * 0.5, 1000.0)
        new_ghg        = b["ghg"] - req.gas_reduction * s * 0.056 - (req.wind_growth + req.solar_growth) * s * 0.01
        new_wind       = b["wind"] + req.wind_growth * s
        new_solar      = b["solar"] + req.solar_growth * s
        new_elec_total = max(b["elec_total"] - req.gas_reduction * s * 0.3, 200.0)

        proj_years.append(2024 + s)
        ren_share.append(round(min(new_ren / new_total * 100, 100), 1))
        ghg_proj.append(round(max(new_ghg, 0), 1))
        wind_proj.append(round(new_wind, 1))
        solar_proj.append(round(new_solar, 1))
        elec_ren.append(round(min((new_wind + new_solar) / new_elec_total * 100, 100), 1))

    yrs   = np.array(b["mix_years"])
    hist  = np.array(b["ren_share_series"])
    slope = round(float(np.polyfit(yrs[-10:], hist[-10:], 1)[0]), 3)

    ghg_yrs  = np.array(b["ghg_years"])
    ghg_hist = np.array(b["ghg_series"])
    ghg_slope = round(float(np.polyfit(ghg_yrs[-10:], ghg_hist[-10:], 1)[0]), 2)

    return {
        "baseline_year":          2024,
        "horizon":                req.horizon,
        "trend_ren_slope_pp_yr":  slope,
        "trend_ghg_slope_mton_yr": ghg_slope,
        "projection": {
            "years":                    proj_years,
            "renewable_share_pct":      ren_share,
            "ghg_mton":                 ghg_proj,
            "wind_pj":                  wind_proj,
            "solar_pj":                 solar_proj,
            "elec_renewable_share_pct": elec_ren,
        },
        "targets": {
            "renewable_share_2030": 27.0,
            "ghg_2030":             102.4,
            "elec_renewable_2030":  70.0,
        },
        "on_track": {
            "renewable":   ren_share[-1] >= 27.0,
            "ghg":         ghg_proj[-1] <= 102.4,
            "electricity": elec_ren[-1] >= 70.0,
        },
    }


@router.get("/required-pace")
def required_pace():
    """
    How much annual change is needed in each metric to hit 2030 targets?
    Compares required pace against recent trend.
    """
    b = _baselines()
    years_left = 2030 - 2024

    current_ren_share = b["ren_share_series"][-1]
    required_ren_per_yr = round((27.0 - current_ren_share) / years_left, 2)

    yrs  = np.array(b["mix_years"])
    hist = np.array(b["ren_share_series"])
    actual_ren_slope = round(float(np.polyfit(yrs[-5:], hist[-5:], 1)[0]), 3)

    current_ghg = b["ghg"]
    required_ghg_per_yr = round((current_ghg - 102.4) / years_left, 2)
    ghg_yrs  = np.array(b["ghg_years"])
    ghg_hist = np.array(b["ghg_series"])
    actual_ghg_slope = round(float(np.polyfit(ghg_yrs[-5:], ghg_hist[-5:], 1)[0]), 2)

    return {
        "renewable_share": {
            "current":         round(current_ren_share, 1),
            "target_2030":     27.0,
            "required_pp_yr":  required_ren_per_yr,
            "recent_pp_yr":    actual_ren_slope,
            "on_track":        actual_ren_slope >= required_ren_per_yr,
        },
        "ghg": {
            "current":            round(current_ghg, 1),
            "target_2030":        102.4,
            "required_mton_yr":  -required_ghg_per_yr,
            "recent_mton_yr":     actual_ghg_slope,
            "on_track":           actual_ghg_slope <= -required_ghg_per_yr,
        },
    }
