"""
Challenge 3 — Zeeland Industrial Decarbonisation Simulator

Challenge 2 showed the gap: Zeeland industry uses ~75 PJ/yr while all
renewable generation covers only ~9 %.  Challenge 3 asks: what combination
of levers closes that gap, and by when?

Levers:
  renewable_growth_tj_per_yr  – extra TJ of wind/solar added each year
  electrification_pct_per_yr  – % of remaining gas demand shifted to
                                 electricity each year (needs clean power)
  hydrogen_pct_per_yr         – % of remaining gas demand replaced by
                                 green hydrogen each year
  efficiency_pct_per_yr       – % annual reduction in total industrial demand
"""

from functools import lru_cache
from pathlib import Path

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/challenge-3", tags=["Challenge 3"])

# ── Baselines from Challenge 2 (Klimaatmonitor 2024) ─────────────────────────
# These are the most recent reliable data points extracted by challenge_2.py
IND_TOTAL_TJ    = 75_450.0   # total industrial energy 2024
IND_GAS_TJ      = 70_507.0   # gas component 2024
IND_ELEC_TJ     =  4_943.0   # electricity component 2024
REN_GEN_TJ      =  7_002.0   # total renewable generation Zeeland 2024
BASELINE_YEAR   = 2024


@lru_cache(maxsize=1)
def _historical_coverage() -> dict:
    """
    Historical coverage % derived from Challenge 2 data.
    Hardcoded from the _load() output to avoid recalculating.
    """
    years    = [2010,2011,2012,2013,2014,2015,2016,2017,2018,2021,2022,2024]
    ind      = [109978,118267,110571,106831,86080,93807,92014,94739,91882,84963,65364,75450]
    ren_gen  = [  1476, 1627, 1775, 2261, 2653, 2869, 2740, 2599, 3424, 4392, 4493, 7002]
    coverage = [round(r / i * 100, 1) for r, i in zip(ren_gen, ind)]
    return {"years": years, "ind_tj": ind, "ren_gen_tj": ren_gen, "coverage_pct": coverage}


class SimRequest(BaseModel):
    renewable_growth_tj_per_yr: float = 500.0
    electrification_pct_per_yr: float = 1.0
    hydrogen_pct_per_yr:        float = 0.5
    efficiency_pct_per_yr:      float = 1.0
    horizon: int = 2050


@router.post("/simulate")
def simulate(req: SimRequest):
    steps = req.horizon - BASELINE_YEAR
    if steps <= 0 or steps > 60:
        return {"error": "horizon must be 2025–2084"}

    # Mutable state
    ind_total = IND_TOTAL_TJ
    ind_gas   = IND_GAS_TJ
    ind_elec  = IND_ELEC_TJ
    ren_gen   = REN_GEN_TJ

    years, total_l, gas_l, elec_l, h2_l, ren_l, coverage_l, fossil_pct_l = (
        [BASELINE_YEAR], [ind_total], [ind_gas], [ind_elec],
        [0.0], [ren_gen],
        [round(ren_gen / ind_total * 100, 1)],
        [round((ind_gas + ind_elec) / ind_total * 100, 1)],
    )

    cumulative_h2 = 0.0

    for s in range(1, steps + 1):
        # 1. Efficiency shrinks overall demand
        ind_total *= (1 - req.efficiency_pct_per_yr / 100)

        # 2. Electrification shifts gas → electric
        #    (only as much gas as remains)
        electrified = ind_gas * (req.electrification_pct_per_yr / 100)
        ind_gas     = max(ind_gas - electrified, 0.0)
        ind_elec   += electrified

        # 3. Hydrogen replaces gas
        h2_this_yr  = ind_gas * (req.hydrogen_pct_per_yr / 100)
        ind_gas     = max(ind_gas - h2_this_yr, 0.0)
        cumulative_h2 += h2_this_yr

        # 4. Renewable generation grows
        ren_gen += req.renewable_growth_tj_per_yr

        # 5. Recalculate totals (efficiency also shrinks the gas/elec fractions)
        ratio = ind_total / (ind_gas + ind_elec + 1e-9)  # should be ~1
        ind_gas  *= ratio if ratio < 1 else 1.0
        ind_elec *= ratio if ratio < 1 else 1.0

        fossil = ind_gas + max(ind_elec - ren_gen, 0)  # elec covered by ren is clean
        fossil_pct = max(fossil / ind_total * 100, 0.0) if ind_total > 0 else 0

        years.append(BASELINE_YEAR + s)
        total_l.append(round(ind_total, 0))
        gas_l.append(round(ind_gas, 0))
        elec_l.append(round(ind_elec, 0))
        h2_l.append(round(cumulative_h2, 0))
        ren_l.append(round(ren_gen, 0))
        coverage_l.append(round(min(ren_gen / ind_total * 100, 100), 1) if ind_total > 0 else 100)
        fossil_pct_l.append(round(fossil_pct, 1))

    # Find milestone years
    def _milestone(series: list[float], threshold: float) -> int | None:
        for y, v in zip(years, series):
            if v >= threshold:
                return y
        return None

    def _fossil_milestone(series: list[float], threshold: float) -> int | None:
        for y, v in zip(years, series):
            if v <= threshold:
                return y
        return None

    hist = _historical_coverage()

    return {
        "baseline": {
            "ind_total_tj": IND_TOTAL_TJ,
            "ind_gas_tj":   IND_GAS_TJ,
            "ind_elec_tj":  IND_ELEC_TJ,
            "ren_gen_tj":   REN_GEN_TJ,
            "coverage_pct": round(REN_GEN_TJ / IND_TOTAL_TJ * 100, 1),
        },
        "historical": hist,
        "years":        years,
        "ind_total_tj": [round(v, 0) for v in total_l],
        "ind_gas_tj":   [round(v, 0) for v in gas_l],
        "ind_elec_tj":  [round(v, 0) for v in elec_l],
        "ind_h2_tj":    [round(v, 0) for v in h2_l],
        "ren_gen_tj":   [round(v, 0) for v in ren_l],
        "coverage_pct": coverage_l,
        "fossil_pct":   fossil_pct_l,
        "milestones": {
            "coverage_25pct": _milestone(coverage_l, 25),
            "coverage_50pct": _milestone(coverage_l, 50),
            "coverage_100pct": _milestone(coverage_l, 100),
            "fossil_50pct":   _fossil_milestone(fossil_pct_l, 50),
            "fossil_10pct":   _fossil_milestone(fossil_pct_l, 10),
        },
        "params": req.model_dump(),
    }


@router.get("/gap-analysis")
def gap_analysis():
    """Summary of the Challenge 2 gap — used to frame the simulator."""
    hist = _historical_coverage()
    # Linear extrapolation of coverage at current pace
    yrs  = np.array(hist["years"], dtype=float)
    cov  = np.array(hist["coverage_pct"])
    slope, intercept = np.polyfit(yrs, cov, 1)
    year_50  = int((50  - intercept) / slope) if slope > 0 else None
    year_100 = int((100 - intercept) / slope) if slope > 0 else None

    return {
        "historical": hist,
        "current_coverage_pct": round(REN_GEN_TJ / IND_TOTAL_TJ * 100, 1),
        "ind_total_tj":  IND_TOTAL_TJ,
        "ren_gen_tj":    REN_GEN_TJ,
        "gap_tj":        round(IND_TOTAL_TJ - REN_GEN_TJ, 0),
        "multiplier":    round(IND_TOTAL_TJ / REN_GEN_TJ, 1),
        "trend_slope_pp_per_yr": round(float(slope), 3),
        "bau_year_50pct":  year_50,
        "bau_year_100pct": year_100,
    }
