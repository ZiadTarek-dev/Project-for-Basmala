import json
import os
import threading
import datetime
from typing import Final

from flask import Flask, request, jsonify
from flask_cors import CORS
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# --- put your NEW (rotated) token in an env var, don't hardcode it ---
TOKEN: Final = "8685228535:AAEy1ASywhERTppxQ3H6tvLbfDKu4MWbNnQ"
BOT_USERNAME: Final = "@Engagement_RSVP_BOT"

DATA_FILE = os.path.join(os.path.dirname(__file__), "rsvps.json")
lock = threading.Lock()


def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------
# Flask app — the website POSTs RSVP submissions here
# ---------------------------------------------------------------------
app = Flask(__name__)
CORS(app)


@app.route("/api/rsvp", methods=["POST"])
def api_rsvp():
    payload = request.get_json(force=True, silent=True) or {}
    name = (payload.get("name") or "").strip()
    attending = payload.get("attending")
    guests = payload.get("guests")
    note = (payload.get("note") or "").strip()

    if not name or attending not in ("yes", "no"):
        return jsonify({"error": "name and attending are required"}), 400

    entry = {
        "name": name,
        "attending": attending,
        "guests": guests if attending == "yes" else None,
        "note": note,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }

    with lock:
        data = load_data()
        # if the same name RSVPs again, replace their old answer
        data = [d for d in data if d["name"].strip().lower() != name.lower()]
        data.append(entry)
        save_data(data)

    return jsonify({"ok": True}), 200


def run_flask():
    app.run(host="0.0.0.0", port=5000)


# ---------------------------------------------------------------------
# Telegram bot
# ---------------------------------------------------------------------
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Hello! I track RSVPs for Ahmed & Basmala's engagement.\n\n"
        "Commands:\n"
        "/showall - list all RSVPs\n"
        '/delete "name" - delete one RSVP by name\n'
        "/deleteall - delete every RSVP"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await start_command(update, context)


async def showall_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    with lock:
        data = load_data()

    if not data:
        await update.message.reply_text("No RSVPs yet.")
        return

    yes_list = [d for d in data if d["attending"] == "yes"]
    no_list = [d for d in data if d["attending"] == "no"]
    total_guests = sum(int(d.get("guests") or 1) for d in yes_list)

    lines = [f"RSVPs: {len(data)} total, {total_guests} attending (incl. guests)\n"]

    if yes_list:
        lines.append("✅ Attending:")
        for d in yes_list:
            g_count = int(d.get("guests") or 1)
            g = f" (+{g_count - 1} guest{'s' if g_count - 1 != 1 else ''})" if g_count > 1 else ""
            note = f' — "{d["note"]}"' if d.get("note") else ""
            lines.append(f"  • {d['name']}{g}{note}")

    if no_list:
        lines.append("\n❌ Not attending:")
        for d in no_list:
            note = f' — "{d["note"]}"' if d.get("note") else ""
            lines.append(f"  • {d['name']}{note}")

    text = "\n".join(lines)
    # Telegram caps messages at 4096 chars — chunk just in case
    for i in range(0, len(text), 4000):
        await update.message.reply_text(text[i:i + 4000])


async def deleteall_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    with lock:
        save_data([])
    await update.message.reply_text("All RSVPs deleted.")


async def delete_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text('Usage: /delete "name" (e.g. /delete "John Smith")')
        return

    target = " ".join(context.args).strip().strip('"').lower()

    with lock:
        data = load_data()
        remaining = [d for d in data if d["name"].strip().lower() != target]
        deleted = len(data) - len(remaining)
        save_data(remaining)

    if deleted:
        await update.message.reply_text(f'Deleted {deleted} RSVP(s) matching "{target}".')
    else:
        await update.message.reply_text(f'No RSVP found matching "{target}".')


def main():
    if not TOKEN:
        raise SystemExit(
            "BOT_TOKEN environment variable is not set. "
            "Set it before running (and make sure you rotated the old exposed token)."
        )

    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("showall", showall_command))
    application.add_handler(CommandHandler("deleteall", deleteall_command))
    application.add_handler(CommandHandler("delete", delete_command))

    print("Bot running... (Flask API on port 5000)")
    application.run_polling()


if __name__ == "__main__":
    main()