from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json
import os
import re

app = Flask(__name__)
CORS(app)

GRAFANA_TOKEN_NAME = "grafana_alerts_fetch"
ALERTS_ENDPOINT = "/api/alertmanager/grafana/api/v2/alerts"
KEYS_ENDPOINT = "/api/auth/keys"
GRAFANA_USER = os.getenv("GRAFANA_USER")
GRAFANA_PASSWORD = os.getenv("GRAFANA_PASSWORD")
OLLAMA_URL = os.getenv("OLLAMA_URL")
GRAFANA_IP = os.getenv("GRAFANA_IP")


def reset_and_create_admin_token():
    """Delete ALL Grafana tokens then create a brand-new admin one"""
    url_keys = f"http://{GRAFANA_IP}{KEYS_ENDPOINT}"
    resp = requests.get(url_keys, auth=(GRAFANA_USER, GRAFANA_PASSWORD))
    resp.raise_for_status()
    keys = resp.json()

    for key in keys:
        key_id = key.get("id")
        del_url = f"{url_keys}/{key_id}"
        requests.delete(del_url, auth=(GRAFANA_USER, GRAFANA_PASSWORD))

    payload = {"name": GRAFANA_TOKEN_NAME, "role": "Admin", "secondsToLive": 0}
    headers = {"Content-Type": "application/json"}

    resp_create = requests.post(
        url_keys,
        auth=(GRAFANA_USER, GRAFANA_PASSWORD),
        headers=headers,
        json=payload,
    )
    resp_create.raise_for_status()
    token_json = resp_create.json()
    return token_json.get("key")


@app.route("/alerts", methods=["GET"])
def fetch_alerts():
    try:
        token = reset_and_create_admin_token()
        url = f"http://{GRAFANA_IP}{ALERTS_ENDPOINT}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()

        alerts = resp.json()
        if not isinstance(alerts, list):
            alerts = [alerts]

        return jsonify(alerts)
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
            f"# ❌ Ollama Unreachable\n\n"
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
