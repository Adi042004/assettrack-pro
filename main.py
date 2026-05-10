import qrcode
import base64
import io
import os
from pathlib import Path
from typing import Optional

import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="AssetTrack Pro API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB ────────────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db():
    return psycopg2.connect(DATABASE_URL)

def fetchall_dict(cur):
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def fetchone_dict(cur):
    cols = [d[0] for d in cur.description]
    row  = cur.fetchone()
    return dict(zip(cols, row)) if row else None

# ── QR helper ─────────────────────────────────────────────────────────────────
def generate_qr_base64(value: str) -> str:
    img = qrcode.make(value)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def asset_row_to_dict(row) -> dict:
    return {
        "id":       row["id"],
        "name":     row["name"],
        "value":    row["value"],
        "location": row["location"],
        "status":   row["status"],
        "qr_code":  row.get("qr_base64"),
    }

# ── Pydantic models ───────────────────────────────────────────────────────────
class AssetIn(BaseModel):
    name:     str
    value:    str
    location: Optional[str] = "Office"
    status:   Optional[str] = "Active"

class ScanIn(BaseModel):
    value: str

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "AssetTrack Pro API is running 🚀", "version": "2.0.0"}


@app.post("/add_asset")
def add_asset(asset: AssetIn):
    conn = get_db()
    try:
        qr_base64 = generate_qr_base64(asset.value)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO assets (name, value, location, status, qr_base64) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (asset.name, asset.value, asset.location, asset.status, qr_base64),
        )
        asset_id = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT * FROM assets WHERE id = %s", (asset_id,))
        row = fetchone_dict(cur)
        return {"success": True, "asset": asset_row_to_dict(row)}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/assets")
def get_assets():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM assets ORDER BY id DESC")
        rows = fetchall_dict(cur)
        return {"assets": [asset_row_to_dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/asset/{asset_id}")
def get_asset(asset_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM assets WHERE id = %s", (asset_id,))
        row = fetchone_dict(cur)
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return {"asset": asset_row_to_dict(row)}
    finally:
        conn.close()


@app.get("/stats")
def get_stats():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM assets")
        total = cur.fetchone()[0]
        cur.execute("SELECT status, COUNT(*) as count FROM assets GROUP BY status")
        status_rows = fetchall_dict(cur)
        cur.execute("SELECT location, COUNT(*) as count FROM assets GROUP BY location")
        location_rows = fetchall_dict(cur)
        return {
            "total":           total,
            "status_counts":   {r["status"]:   r["count"] for r in status_rows},
            "location_counts": {r["location"]: r["count"] for r in location_rows},
        }
    finally:
        conn.close()


@app.post("/scan")
def scan_qr(body: ScanIn):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM assets WHERE value = %s", (body.value.strip(),))
        row = fetchone_dict(cur)
        if not row:
            return {"found": False, "message": f"No asset found with value '{body.value}'", "asset": None}
        return {"found": True, "message": "Asset located successfully", "asset": asset_row_to_dict(row)}
    finally:
        conn.close()


@app.put("/asset/{asset_id}")
def update_asset(asset_id: int, asset: AssetIn):
    conn = get_db()
    try:
        qr_base64 = generate_qr_base64(asset.value)
        cur = conn.cursor()
        cur.execute(
            "UPDATE assets SET name=%s, value=%s, location=%s, status=%s, qr_base64=%s WHERE id=%s",
            (asset.name, asset.value, asset.location, asset.status, qr_base64, asset_id),
        )
        conn.commit()
        cur.execute("SELECT * FROM assets WHERE id = %s", (asset_id,))
        row = fetchone_dict(cur)
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return {"success": True, "asset": asset_row_to_dict(row)}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/asset/{asset_id}")
def delete_asset(asset_id: int):
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM assets WHERE id = %s", (asset_id,))
        conn.commit()
        return {"success": True, "message": f"Asset {asset_id} deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
