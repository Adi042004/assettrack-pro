import sqlite3
import qrcode
import base64
import io
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Absolute paths ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DB_PATH  = BASE_DIR / "assets.db"
QR_DIR   = BASE_DIR / "qr_codes"
QR_DIR.mkdir(exist_ok=True)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="AssetTrack Pro API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/qr_codes", StaticFiles(directory=str(QR_DIR)), name="qr_codes")

# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS assets (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL,
            value    TEXT    NOT NULL,
            location TEXT    NOT NULL DEFAULT 'Office',
            status   TEXT    NOT NULL DEFAULT 'Active'
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── Pydantic models ───────────────────────────────────────────────────────────
class AssetIn(BaseModel):
    name:     str
    value:    str
    location: Optional[str] = "Office"
    status:   Optional[str] = "Active"

class ScanIn(BaseModel):
    value: str   # the decoded QR string coming from the browser

# ── QR helper ─────────────────────────────────────────────────────────────────
def generate_qr(asset_id: int, value: str) -> str:
    filename = f"asset_{asset_id}.png"
    img = qrcode.make(value)
    img.save(str(QR_DIR / filename))
    return filename

def asset_row_to_dict(row, base_url: str = "http://127.0.0.1:8000") -> dict:
    qr_filename = f"asset_{row['id']}.png"
    qr_exists   = (QR_DIR / qr_filename).exists()
    return {
        "id":       row["id"],
        "name":     row["name"],
        "value":    row["value"],
        "location": row["location"],
        "status":   row["status"],
        "qr_code":  f"{base_url}/qr_codes/{qr_filename}" if qr_exists else None,
    }

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "AssetTrack Pro API is running 🚀", "version": "2.0.0"}


@app.post("/add_asset")
def add_asset(asset: AssetIn):
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO assets (name, value, location, status) VALUES (?, ?, ?, ?)",
            (asset.name, asset.value, asset.location, asset.status),
        )
        conn.commit()
        asset_id = cur.lastrowid
        generate_qr(asset_id, asset.value)
        row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
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
        rows = conn.execute("SELECT * FROM assets ORDER BY id DESC").fetchall()
        return {"assets": [asset_row_to_dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/asset/{asset_id}")
def get_asset(asset_id: int):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        return {"asset": asset_row_to_dict(row)}
    finally:
        conn.close()


@app.get("/stats")
def get_stats():
    conn = get_db()
    try:
        total = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
        status_rows   = conn.execute(
            "SELECT status, COUNT(*) as count FROM assets GROUP BY status"
        ).fetchall()
        location_rows = conn.execute(
            "SELECT location, COUNT(*) as count FROM assets GROUP BY location"
        ).fetchall()
        return {
            "total":           total,
            "status_counts":   {r["status"]:   r["count"] for r in status_rows},
            "location_counts": {r["location"]: r["count"] for r in location_rows},
        }
    finally:
        conn.close()


@app.post("/scan")
def scan_qr(body: ScanIn):
    """
    Receives the decoded QR string from the browser camera and looks up
    the matching asset by its value field.
    """
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM assets WHERE value = ?", (body.value.strip(),)
        ).fetchone()
        if not row:
            return {
                "found":   False,
                "message": f"No asset found with value '{body.value}'",
                "asset":   None,
            }
        return {
            "found":   True,
            "message": "Asset located successfully",
            "asset":   asset_row_to_dict(row),
        }
    finally:
        conn.close()


@app.put("/asset/{asset_id}")
def update_asset(asset_id: int, asset: AssetIn):
    conn = get_db()
    try:
        conn.execute(
            "UPDATE assets SET name=?, value=?, location=?, status=? WHERE id=?",
            (asset.name, asset.value, asset.location, asset.status, asset_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Asset not found")
        # Regenerate QR if value changed
        generate_qr(asset_id, asset.value)
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
        conn.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
        conn.commit()
        qr_path = QR_DIR / f"asset_{asset_id}.png"
        if qr_path.exists():
            qr_path.unlink()
        return {"success": True, "message": f"Asset {asset_id} deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
