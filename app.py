from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import requests

app = Flask(__name__)
DB_PATH = os.environ.get("DATABASE_PATH", "quotes.db")
QUOTE_API = "https://dummyjson.com/quotes/random"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_id TEXT UNIQUE,
                quote TEXT NOT NULL,
                author TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/quote")
def random_quote():
    try:
        response = requests.get(QUOTE_API, timeout=8)
        response.raise_for_status()
        data = response.json()
        return jsonify({
            "quote_id": str(data.get("id", "")),
            "quote": data.get("quote", ""),
            "author": data.get("author", "Unknown")
        })
    except (requests.RequestException, ValueError):
        # Keep the app usable if the public API is temporarily unavailable.
        fallback = [
            {"quote_id": "local-1", "quote": "Great things are done by a series of small things brought together.", "author": "Vincent van Gogh"},
            {"quote_id": "local-2", "quote": "It always seems impossible until it's done.", "author": "Nelson Mandela"},
            {"quote_id": "local-3", "quote": "Believe you can and you're halfway there.", "author": "Theodore Roosevelt"},
        ]
        import random
        return jsonify(random.choice(fallback))


@app.get("/api/favorites")
def list_favorites():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, quote_id, quote, author, created_at FROM favorites ORDER BY id DESC"
        ).fetchall()
    return jsonify([dict(row) for row in rows])


@app.post("/api/favorites")
def add_favorite():
    data = request.get_json(silent=True) or {}
    quote = str(data.get("quote", "")).strip()
    author = str(data.get("author", "Unknown")).strip() or "Unknown"
    quote_id = str(data.get("quote_id", "")).strip()

    if not quote:
        return jsonify({"error": "Quote is required."}), 400
    if len(quote) > 2000 or len(author) > 200:
        return jsonify({"error": "Quote or author is too long."}), 400
    if not quote_id:
        quote_id = quote[:100]

    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO favorites (quote_id, quote, author) VALUES (?, ?, ?)",
                (quote_id, quote, author)
            )
        return jsonify({"message": "Added to favorites."}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "This quote is already in your favorites."}), 409


@app.delete("/api/favorites/<int:favorite_id>")
def delete_favorite(favorite_id):
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM favorites WHERE id = ?", (favorite_id,))
    if cursor.rowcount == 0:
        return jsonify({"error": "Favorite not found."}), 404
    return jsonify({"message": "Favorite removed."})


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
