from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json
import os
from pymongo import MongoClient

app = Flask(__name__)

CORS(app)

OLLAMA_URL = os.getenv("OLLAMA_URL")

# MongoDB configuration
MONGO_HOST = os.getenv("MONGO_HOST")
MONGO_PORT = os.getenv("MONGO_PORT")
MONGO_USERNAME = os.getenv("MONGO_USERNAME")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME")


def get_mongo_client():
    """Create and return MongoDB client"""
    connection_string = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB_NAME}?authSource=admin"
    return MongoClient(connection_string)


@app.route("/alerts", methods=["GET"])
def fetch_alerts():
    try:
        client = get_mongo_client()
        db = client[MONGO_DB_NAME]

        # Fetch alerts from MongoDB
        alerts = list(db.alerts.find({}, {"_id": 0}).sort("timestamp", -1).limit(100))

        client.close()

        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts", methods=["POST"])
def store_alert():
    try:
        alert_data = request.json

        client = get_mongo_client()
        db = client[MONGO_DB_NAME]

        # Insert alert into MongoDB
        result = db.alerts.insert_one(alert_data)

        client.close()

        return jsonify(
            {"message": "Alert stored successfully", "id": str(result.inserted_id)}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def analyze_alert_chat():
    try:
        data = request.get_json()

        # 1. REQUIRED: Full alert JSON
        alert = data.get("alert")
        if not alert:
            return (
                "# ❌ Missing alert\nProvide the `alert` field.",
                400,
                {"Content-Type": "text/markdown"},
            )

        # 2. REQUIRED: Current user message
        user_prompt = data.get("prompt")
        if not user_prompt:
            return (
                "# ❌ Missing prompt\nProvide the `prompt` field (your question).",
                400,
                {"Content-Type": "text/markdown"},
            )

        # 3. OPTIONAL: Chat history (list of {role, content})
        messages = data.get("messages", [])

        # --- Build system context ---
        alert_context = f"""<ALERT_CONTEXT>
{json.dumps(alert, indent=2)}
</ALERT_CONTEXT>"""

        system_message = f"""You are a senior cybersecurity analyst. Use the alert context below to answer the user's question professionally in Markdown.

Rules:
- Always base responses on the provided alert.
- Be concise, technical, and actionable.
- Use Markdown: headings, bold, lists, code blocks.
- Never mention the XML-like tags.

{alert_context}"""

        # --- Construct full message history ---
        # Start with system message
        full_messages = [{"role": "system", "content": system_message}]
        # Add chat history
        full_messages.extend(messages)
        # Add current user prompt
        full_messages.append({"role": "user", "content": user_prompt})

        # --- Call Ollama ---
        payload = {
            "model": "phi4-mini",
            "messages": full_messages,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 512,
            },
        }

        ollama_resp = requests.post(OLLAMA_URL, json=payload, timeout=45)
        ollama_resp.raise_for_status()

        ai_response = ollama_resp.json().get("message", {}).get("content", "").strip()

        return ai_response, 200, {"Content-Type": "text/markdown; charset=utf-8"}

    except requests.exceptions.ConnectionError:
        return (
            f"# ❌ Ollama is Unreachable\n\n"
            f"Failed to connect to: `{OLLAMA_URL}`\n\n"
            "Ensure Ollama is running.",
            500,
            {"Content-Type": "text/markdown"},
        )
    except Exception as e:
        return (
            f"# ❌ Error\n\n"
            f"```python\n{str(e)}\n```\n\n"
            "Check your request format.",
            500,
            {"Content-Type": "text/markdown"},
        )


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(host=os.getenv("FLASK_HOST"), port=int(os.getenv("FLASK_PORT")))
