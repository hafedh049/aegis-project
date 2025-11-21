from datetime import datetime
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
    print(connection_string)
    return MongoClient(connection_string)


@app.route("/alerts", methods=["GET"])
def fetch_alerts():
    try:
        client = get_mongo_client()
        db = client[MONGO_DB_NAME]

        # Fetch alerts from MongoDB
        alerts = list(db.alerts.find({}, {"_id": 0}).limit(100))

        alerts.sort(
            key=lambda x: (
                datetime.fromisoformat(x["timestamp"])
                if "timestamp" in x
                else datetime.min
            ),
            reverse=True,
        )

        client.close()

        return jsonify(alerts)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def analyze_alert_chat():
    try:
        data = request.get_json()

        # FRONTEND sends: alert + messages
        alert = data.get("alert")
        user_messages = data.get("messages", [])

        if not alert:
            return "# ❌ Missing alert", 400, {"Content-Type": "text/markdown"}

        if not user_messages or user_messages[-1]["role"] != "user":
            return "# ❌ Missing user message", 400, {"Content-Type": "text/markdown"}

        # Extract last user question
        # user_prompt = user_messages[-1]["content"]

        # System instructions + alert context
        alert_context = json.dumps(alert, indent=2)

        system_message = f"""
        You are a senior cybersecurity analyst.  
        Your job is to generate elite, technically solid, highly structured responses using modern, polished Markdown.

        STYLE REQUIREMENTS:
        - Always use clean headings, subheadings, and sections.
        - Use **bold**, *italic*, and _underline_ for emphasis when helpful.
        - Include bullet points, numbered lists, tables, and callouts when appropriate.
        - Include hyperlinks to reputable sources (RFCs, MITRE ATT&CK, NIST, OWASP, etc.) when relevant.
        - Use concise, high-signal explanations with no filler.
        - Keep a professional tone suitable for SOC, DFIR, and threat-intel workflows.
        - Provide actionable steps, remediation paths, and root-cause insights when needed.
        - If referencing an attack technique, include the MITRE ID (e.g., `T1059`).

        CONTEXT:
        Analyze and respond strictly based on the following alert data.

        <ALERT_CONTEXT>
        {alert_context}
        </ALERT_CONTEXT>
        """

        # Build history for LLM
        full_messages = [{"role": "system", "content": system_message}]

        # Convert frontend message format → LLM format
        for msg in user_messages:
            full_messages.append({"role": msg["role"], "content": msg["content"]})

        # Call Ollama
        payload = {
            "model": "phi4-mini",
            "messages": full_messages,
            "stream": False,  # IMPORTANT → frontend expects non-streamed JSON
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
            f"# ❌ Ollama Unreachable\nFailed to connect to `{OLLAMA_URL}`.",
            500,
            {"Content-Type": "text/markdown"},
        )

    except Exception as e:
        return (
            f"# ❌ Error\n```python\n{str(e)}\n```",
            500,
            {"Content-Type": "text/markdown"},
        )


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Ensure the database and collection exist
    try:
        client = get_mongo_client()
        db = client[MONGO_DB_NAME]
        if "alerts" not in db.list_collection_names():
            db.create_collection("alerts")
            print(f"Created collection 'alerts' in database '{MONGO_DB_NAME}'")
        client.close()
    except Exception as e:
        print(f"Error creating DB/collection: {e}")
    app.run(host=os.getenv("FLASK_HOST"), port=int(os.getenv("FLASK_PORT")))
