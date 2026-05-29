#!/usr/bin/env python3
"""
Parse CBS 'Energie en broeikasgassen 1990-2024' Excel into energy-data.json.
Usage: python3 scripts/parse_energy_data.py <path-to-xlsx> <output-json>
"""

import json
import sys
from pathlib import Path

import pandas as pd


def series(df, filter_col, filter_val, carrier, year_col="jaar", value_col="waarde"):
    """Extract a sorted list of values for (filter_col=filter_val, carrier)."""
    mask = (df[filter_col] == filter_val) & (df[carrier] == df.columns[df.columns.get_loc(carrier)])
    # fallback: use positional column names
    return None  # replaced below


def pivot_carrier(df, balanspost_col, balanspost_val, carrier_col, value_col, year_col="jaar"):
    """Return a dict {carrier: [val_1990, ..., val_2024]} for a given balanspost."""
    sub = df[df[balanspost_col] == balanspost_val].copy()
    sub = sub.sort_values(year_col)
    result = {}
    for carrier, grp in sub.groupby(carrier_col):
        result[carrier] = grp[value_col].tolist()
    return result


def years_for(df, balanspost_col, balanspost_val, year_col="jaar"):
    sub = df[df[balanspost_col] == balanspost_val]
    return sorted(sub[year_col].unique().tolist())


def main(xlsx_path: str, out_path: str):
    xl = pd.ExcelFile(xlsx_path)

    # ── Tabel 1b — total domestic energy consumption ──────────────────────────
    df1b = xl.parse("Tabel1bAanbodUitvoer&Verbruik", header=0)
    df1b.columns = ["jaar", "balanspost", "energiedrager", "waarde"]
    tv = df1b[df1b["balanspost"] == "Totaal energieverbruik"].copy()
    tv = tv.sort_values("jaar")

    def get1b(carrier):
        return (
            tv[tv["energiedrager"] == carrier]
            .sort_values("jaar")["waarde"]
            .round(1)
            .tolist()
        )

    mix_years = sorted(tv["jaar"].unique().tolist())
    mix = {
        "years": mix_years,
        "gas":       get1b("Aardgas"),
        "oil":       get1b("Aardoliegrondstoffen en producten"),
        "coal":      get1b("Kool en koolproducten"),
        "nuclear":   get1b("Kernenergie"),
        "renewable": get1b("Hernieuwbare energie"),
        "total":     get1b("Totaal energiedragers"),
    }

    # ── Tabel 5 — electricity production ──────────────────────────────────────
    df5 = xl.parse("Tabel5AanbodElektriciteit", header=0)
    df5.columns = ["jaar", "balanspost", "energiebron", "waarde"]
    bp = df5[df5["balanspost"] == "BrutoProductie"].copy()
    bp = bp.sort_values("jaar")

    def get5(carrier):
        return (
            bp[bp["energiebron"] == carrier]
            .sort_values("jaar")["waarde"]
            .round(2)
            .tolist()
        )

    elec_years = sorted(bp["jaar"].unique().tolist())
    electricity = {
        "years":   elec_years,
        "wind":    get5("Windenergie"),
        "solar":   get5("Zonne-energie"),
        "biomass": get5("Biomassa"),
        "gas":     get5("Aardgas"),
        "coal":    get5("Steenkool"),
        "nuclear": get5("Kernenergie"),
        "total":   get5("Totaal energiedragers"),
    }

    # ── Tabel 6a — GHG emissions ───────────────────────────────────────────────
    df6a = xl.parse("Tabel6aEmissieNaarSector", header=0)
    df6a.columns = ["jaar", "broeikasgas", "sector", "emissie"]
    totaal_ghg = (
        df6a[
            (df6a["broeikasgas"] == "TotaalBroeikasgassen")
            & (df6a["sector"] == "TotaalSectoren")
        ]
        .sort_values("jaar")
    )
    ghg_years = sorted(totaal_ghg["jaar"].unique().tolist())
    ghg_total = totaal_ghg["emissie"].round(1).tolist()

    sectors_ghg = {}
    for sector in ["Elektriciteit", "Industrie", "Gebouwde omgeving", "Mobiliteit", "Landbouw", "Landgebruik"]:
        sub = (
            df6a[
                (df6a["broeikasgas"] == "TotaalBroeikasgassen")
                & (df6a["sector"] == sector)
            ]
            .sort_values("jaar")
        )
        if not sub.empty:
            sectors_ghg[sector] = sub["emissie"].round(1).tolist()

    # Linear target path: 227.5 Mton (1990) → 102.4 Mton (2030), –55%
    ghg_target = [round(227.5 - (227.5 - 102.4) * (y - 1990) / 40, 1) for y in ghg_years]

    ghg = {
        "years":      ghg_years,
        "total":      ghg_total,
        "target":     ghg_target,
        "by_sector":  sectors_ghg,
    }

    # ── Tabel 3b — final energy by sector ─────────────────────────────────────
    df3b = xl.parse("Tabel3bFinaalEnergieverbruik", header=0)
    df3b.columns = ["jaar", "sector", "energiedrager", "waarde"]
    sector_years = sorted(df3b["jaar"].unique().tolist())
    final_by_sector = {"years": sector_years}
    for sector in ["Nijverheid", "Mobiliteit", "Woningen", "Diensten", "Landbouw"]:
        sub = (
            df3b[
                (df3b["sector"] == sector)
                & (df3b["energiedrager"] == "Totaal energiedragers")
            ]
            .sort_values("jaar")
        )
        if not sub.empty:
            final_by_sector[sector] = sub["waarde"].round(1).tolist()

    # ── Assemble ───────────────────────────────────────────────────────────────
    out = {
        "mix":             mix,
        "electricity":     electricity,
        "ghg":             ghg,
        "final_by_sector": final_by_sector,
    }

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"Written {Path(out_path).stat().st_size // 1024} KB → {out_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: parse_energy_data.py <xlsx> <output.json>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
