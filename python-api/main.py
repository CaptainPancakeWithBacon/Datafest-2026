"""
Datafest 2026 — Energy API
One router per challenge. Add endpoints to the relevant challenge file.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from challenge_1 import router as c1_router
from challenge_2 import router as c2_router
from challenge_3 import router as c3_router

app = FastAPI(title="Datafest 2026 Energy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(c1_router)
app.include_router(c2_router)
app.include_router(c3_router)


@app.get("/api/health")
def health():
    from pathlib import Path
    xlsx = Path(__file__).parent.parent / "data" / "energie-en-broeikasgassen.xlsx"
    return {"status": "ok", "excel_loaded": xlsx.exists()}
