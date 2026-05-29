"""
Challenge 1 — The Dutch Energy Turning Point
National CBS data: energy mix, electricity production, GHG emissions.
"""

from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/challenge-1", tags=["Challenge 1"])

XLSX = Path(__file__).parent.parent / "data" / "energie-en-broeikasgassen.xlsx"


@lru_cache(maxsize=1)
def _load() -> dict:
    if not XLSX.exists():
        raise FileNotFoundError(f"Excel not found: {XLSX}")

    xl = pd.ExcelFile(XLSX)

    # Tabel 1b — total domestic energy consumption
    df1b = xl.parse("Tabel1bAanbodUitvoer&Verbruik", header=0)
    df1b.columns = ["jaar", "balanspost", "energiedrager", "waarde"]
    tv = df1b[df1b["balanspost"] == "Totaal energieverbruik"].copy()

    def mix_s(carrier: str):
        return tv[tv["energiedrager"] == carrier].sort_values("jaar")["waarde"].round(1).tolist()

    years = sorted(tv["jaar"].unique().tolist())
    gas       = mix_s("Aardgas")
    oil       = mix_s("Aardoliegrondstoffen en producten")
    coal      = mix_s("Kool en koolproducten")
    nuclear   = mix_s("Kernenergie")
    renewable = mix_s("Hernieuwbare energie")
    total     = mix_s("Totaal energiedragers")
    ren_share = [round(r / t * 100, 2) if t else 0 for r, t in zip(renewable, total)]

    # Transition score: ΔRenewable − ΔFossil per year
    score_years = years[1:]
    score = []
    for i in range(1, len(years)):
        dR = renewable[i] - renewable[i - 1]
        dF = (gas[i] + oil[i] + coal[i]) - (gas[i - 1] + oil[i - 1] + coal[i - 1])
        score.append(round(dR - dF))

    # Tabel 5 — electricity production
    df5 = xl.parse("Tabel5AanbodElektriciteit", header=0)
    df5.columns = ["jaar", "balanspost", "energiebron", "waarde"]
    bp = df5[df5["balanspost"] == "BrutoProductie"].copy()

    def elec_s(carrier: str):
        return bp[bp["energiebron"] == carrier].sort_values("jaar")["waarde"].round(2).tolist()

    elec_years = sorted(bp["jaar"].unique().tolist())

    # Tabel 6a — GHG
    df6 = xl.parse("Tabel6aEmissieNaarSector", header=0)
    df6.columns = ["jaar", "broeikasgas", "sector", "emissie"]
    ghg_total_df = df6[
        (df6["broeikasgas"] == "TotaalBroeikasgassen") & (df6["sector"] == "TotaalSectoren")
    ].sort_values("jaar")
    ghg_years  = ghg_total_df["jaar"].tolist()
    ghg_total  = ghg_total_df["emissie"].round(1).tolist()
    ghg_target = [round(227.5 - (227.5 - 102.4) * (y - 1990) / 40, 1) for y in ghg_years]

    by_sector = {}
    for sector in df6[df6["broeikasgas"] == "TotaalBroeikasgassen"]["sector"].unique():
        if sector == "TotaalSectoren":
            continue
        sub = df6[(df6["broeikasgas"] == "TotaalBroeikasgassen") & (df6["sector"] == sector)].sort_values("jaar")
        by_sector[sector] = sub["emissie"].round(1).tolist()

    return {
        "mix": {
            "years": years, "gas": gas, "oil": oil, "coal": coal,
            "nuclear": nuclear, "renewable": renewable, "total": total,
            "renewable_share_pct": ren_share,
        },
        "transition_score": {"years": score_years, "score": score},
        "electricity": {
            "years": elec_years,
            "wind":    elec_s("Windenergie"),
            "solar":   elec_s("Zonne-energie"),
            "biomass": elec_s("Biomassa"),
            "gas":     elec_s("Aardgas"),
            "coal":    elec_s("Steenkool"),
            "nuclear": elec_s("Kernenergie"),
            "total":   elec_s("Totaal energiedragers"),
        },
        "ghg": {"years": ghg_years, "total": ghg_total, "target": ghg_target, "by_sector": by_sector},
    }


@router.get("/data")
def get_data():
    """All Challenge 1 datasets."""
    return _load()


@router.get("/timelapse")
def timelapse(year: int = Query(..., ge=1990, le=2024)):
    """Slice all series to `year` for animated replay."""
    d = _load()

    def slice_mix(y: int):
        idx = next((i for i, yr in enumerate(d["mix"]["years"]) if yr > y), len(d["mix"]["years"]))
        out = {"years": d["mix"]["years"][:idx]}
        for k, v in d["mix"].items():
            if k != "years":
                out[k] = v[:idx]
        return out

    def slice_elec(y: int):
        idx = next((i for i, yr in enumerate(d["electricity"]["years"]) if yr > y), len(d["electricity"]["years"]))
        out = {"years": d["electricity"]["years"][:idx]}
        for k, v in d["electricity"].items():
            if k != "years":
                out[k] = v[:idx]
        return out

    def slice_ghg(y: int):
        idx = next((i for i, yr in enumerate(d["ghg"]["years"]) if yr > y), len(d["ghg"]["years"]))
        return {
            "years": d["ghg"]["years"][:idx],
            "total": d["ghg"]["total"][:idx],
            "target": d["ghg"]["target"][:idx],
            "by_sector": {s: v[:idx] for s, v in d["ghg"]["by_sector"].items()},
        }

    return {"year": year, "mix": slice_mix(year), "electricity": slice_elec(year), "ghg": slice_ghg(year)}


class SimulateRequest(BaseModel):
    wind_growth: float = 12.0
    solar_growth: float = 10.0
    gas_reduction: float = 20.0
    horizon: int = 2030


@router.post("/simulate")
def simulate(req: SimulateRequest):
    """Project transition to req.horizon from 2024 baseline."""
    d = _load()
    BASE_RENEWABLE  = d["mix"]["renewable"][-1]
    BASE_TOTAL      = d["mix"]["total"][-1]
    BASE_GHG        = d["ghg"]["total"][-1]
    BASE_WIND       = d["electricity"]["wind"][-1]
    BASE_SOLAR      = d["electricity"]["solar"][-1]
    BASE_ELEC_TOTAL = d["electricity"]["total"][-1]

    steps = req.horizon - 2024
    if steps <= 0:
        raise HTTPException(400, "horizon must be after 2024")

    proj_years, ren_share, ghg_proj, wind_proj, solar_proj, elec_ren = [], [], [], [], [], []
    for s in range(1, steps + 1):
        new_ren   = BASE_RENEWABLE + (req.wind_growth + req.solar_growth) * s
        new_total = max(BASE_TOTAL - req.gas_reduction * s * 0.5, 1000.0)
        new_ghg   = BASE_GHG - req.gas_reduction * s * 0.056 - (req.wind_growth + req.solar_growth) * s * 0.01
        new_wind  = BASE_WIND + req.wind_growth * s
        new_solar = BASE_SOLAR + req.solar_growth * s
        new_elec_total = max(BASE_ELEC_TOTAL - req.gas_reduction * s * 0.3, 200.0)

        proj_years.append(2024 + s)
        ren_share.append(round(min(new_ren / new_total * 100, 100), 1))
        ghg_proj.append(round(max(new_ghg, 0), 1))
        wind_proj.append(round(new_wind, 1))
        solar_proj.append(round(new_solar, 1))
        elec_ren.append(round(min((new_wind + new_solar) / new_elec_total * 100, 100), 1))

    hist = np.array(d["mix"]["renewable_share_pct"])
    yrs  = np.array(d["mix"]["years"])
    slope = round(float(np.polyfit(yrs[-10:], hist[-10:], 1)[0]), 3)

    return {
        "baseline_year": 2024,
        "horizon": req.horizon,
        "trend_slope_pp_yr": slope,
        "projection": {
            "years": proj_years,
            "renewable_share_pct": ren_share,
            "ghg_mton": ghg_proj,
            "wind_pj": wind_proj,
            "solar_pj": solar_proj,
            "elec_renewable_share_pct": elec_ren,
        },
        "on_track": {
            "renewable":   ren_share[-1] >= 27.0,
            "ghg":         ghg_proj[-1] <= 102.4,
            "electricity": elec_ren[-1] >= 70.0,
        },
    }
