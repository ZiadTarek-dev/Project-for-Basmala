"""
FastAPI backend for Ahmed & Basmala's RSVP site + Telegram bot.
Runs as a single Vercel serverless function (see vercel.json), using
Telegram WEBHOOK mode instead of polling, and Postgres instead of a
local JSON file (serverless functions have no persistent disk).
"""
import os
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telegram import Update, Bot

BOT_TOKEN = os.environ["BOT_TOKEN"]
DATABASE_URL = os.environ["POSTGRES_URL"]  # auto-set by Vercel Postgres
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET")  # optional but recommended

bot = Bot(token=BOT_TOKEN)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Frontend's Vercel URL once it's live
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Database helpers
# --------------------------------------------------------------------------
def get_conn():
    return psycopg2.connect(DATABASE_URL)


def ensure_table():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS rsvps (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    name_lower TEXT NOT NULL UNIQUE,
                    attending TEXT NOT NULL,
                    guests INTEGER,
                    note TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        conn.commit()


def upsert_rsvp(name: str, attending: str, guests: Optional[int], note: str):
    name_lower = name.strip().lower()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rsvps (name, name_lower, attending, guests, note)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name_lower)
                DO UPDATE SET attending = EXCLUDED.attending,
                              guests = EXCLUDED.guests,
                              note = EXCLUDED.note,
                              created_at = now()
                """,
                (name.strip(), name_lower, attending, guests, note),
            )
        conn.commit()


def fetch_all():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM rsvps ORDER BY created_at ASC")
            return cur.fetchall()


def delete_all():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM rsvps")
        conn.commit()


def delete_by_name(name: str) -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM rsvps WHERE name_lower = %s", (name.strip().lower(),))
            deleted = cur.rowcount
        conn.commit()
    return deleted


# --------------------------------------------------------------------------
# RSVP endpoint — called by the website
# --------------------------------------------------------------------------
class RSVPPayload(BaseModel):
    name: str
    attending: str  # "yes" or "no"
    guests: Optional[str] = None
    note: Optional[str] = ""


@app.post("/api/rsvp")
async def api_rsvp(payload: RSVPPayload):
    ensure_table()

    name = payload.name.strip()
    if not name or payload.attending not in ("yes", "no"):
        raise HTTPException(status_code=400, detail="name and attending are required")

    guests_int = None
    if payload.attending == "yes":
        try:
            guests_int = int(payload.guests or 1)
        except (TypeError, ValueError):
            guests_int = 1

    upsert_rsvp(name, payload.attending, guests_int, (payload.note or "").strip())
    return {"ok": True}


# --------------------------------------------------------------------------
# Telegram webhook — Telegram POSTs each update here instead of us polling
# --------------------------------------------------------------------------
@app.post("/api/telegram")
async def telegram_webhook(request: Request):
    if WEBHOOK_SECRET:
        header = request.headers.get("x-telegram-bot-api-secret-token")
        if header != WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="bad secret token")

    ensure_table()

    body = await request.json()
    update = Update.de_json(body, bot)

    if not update.message or not update.message.text:
        return {"ok": True}

    text = update.message.text.strip()
    chat_id = update.message.chat_id

    if text in ("/start", "/help"):
        await bot.send_message(
            chat_id,
            "Hello! I track RSVPs for Ahmed & Basmala's engagement.\n\n"
            "Commands:\n"
            "/showall - list all RSVPs\n"
            '/delete "name" - delete one RSVP by name\n'
            "/deleteall - delete every RSVP",
        )

    elif text == "/showall":
        rows = fetch_all()
        if not rows:
            await bot.send_message(chat_id, "No RSVPs yet.")
        else:
            yes_list = [r for r in rows if r["attending"] == "yes"]
            no_list = [r for r in rows if r["attending"] == "no"]
            total_guests = sum(r["guests"] or 1 for r in yes_list)

            lines = [f"RSVPs: {len(rows)} total, {total_guests} attending (incl. guests)\n"]
            if yes_list:
                lines.append("✅ Attending:")
                for r in yes_list:
                    g = r["guests"] or 1
                    extra = f" (+{g - 1} guest{'s' if g - 1 != 1 else ''})" if g > 1 else ""
                    note = f' — "{r["note"]}"' if r["note"] else ""
                    lines.append(f"  • {r['name']}{extra}{note}")
            if no_list:
                lines.append("\n❌ Not attending:")
                for r in no_list:
                    note = f' — "{r["note"]}"' if r["note"] else ""
                    lines.append(f"  • {r['name']}{note}")

            full_text = "\n".join(lines)
            for i in range(0, len(full_text), 4000):
                await bot.send_message(chat_id, full_text[i:i + 4000])

    elif text == "/deleteall":
        delete_all()
        await bot.send_message(chat_id, "All RSVPs deleted.")

    elif text.startswith("/delete"):
        target = text[len("/delete"):].strip().strip('"')
        if not target:
            await bot.send_message(chat_id, 'Usage: /delete "name" (e.g. /delete "John Smith")')
        else:
            deleted = delete_by_name(target)
            if deleted:
                await bot.send_message(chat_id, f'Deleted RSVP matching "{target}".')
            else:
                await bot.send_message(chat_id, f'No RSVP found matching "{target}".')

    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"ok": True}