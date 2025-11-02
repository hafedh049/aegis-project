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
GRAFANA_PASSWORD = os.getenv("GRAFANA_USER")
OLLAMA_URL = os.getenv("OLLAMA_URL")
GRAFANA_IP = os.getenv("GRAFANA_IP")


def reset_and_create_admin_token(ip):
    """Delete ALL Grafana tokens then create a brand-new admin one"""
    url_keys = f"http://{ip}{KEYS_ENDPOINT}"
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
    ip = os.getenv("GRAFANA_IP")
    if not ip:
        return jsonify({"error": "Arsenal VM not found"}), 404

    try:
        token = reset_and_create_admin_token(ip)
        url = f"http://{ip}{ALERTS_ENDPOINT}"

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


@app.route("/analyze", methods=["POST"])
def analyze_log_with_ollama():
    try:
        data = request.get_json()
        log_line = data.get("log")
        if not log_line:
            return jsonify({"error": "Missing 'log' field in request body"}), 400

        prompt = f"""You are a cyber threat intelligence analyst. Analyze the following honeypot log and respond with ONLY a valid JSON object. Do not include markdown, explanations, or extra text.

Log: "{log_line}"

Respond with this exact structure always:
{{
  "attack_technique": "MITRE ATT&CK technique ID (e.g., T1105)",
  "technique_name": "Full technique name",
  "tactic": "MITRE tactic (e.g., Command and Control)",
  "confidence": 0.0 to 1.0,
  "summary": "1-sentence technical summary",
  "recommendation": "Short actionable advice"
}}

If uncertain, set confidence below 0.5. Use only official MITRE ATT&CK data."""

        # ✅ USE /api/chat FORMAT (NOT /api/generate)
        payload = {
            "model": "phi4-mini",  # or "phi3" if you prefer
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_predict": 256,
            },
        }

        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()

        # ✅ NEW: extract content from .message.content
        ai_response_str = response.json().get("message", {}).get("content", "{}")

        try:
            ai_json = json.loads(ai_response_str)
        except json.JSONDecodeError:
            json_match = re.search(r"\{.*\}", ai_response_str, re.DOTALL)
            if json_match:
                ai_json = json.loads(json_match.group())
            else:
                return (
                    jsonify(
                        {
                            "error": "Ollama did not return valid JSON",
                            "raw_response": ai_response_str,
                        }
                    ),
                    500,
                )

        return jsonify(ai_json)

    except requests.exceptions.ConnectionError:
        return (
            jsonify(
                {
                    "error": f"Failed to connect to Ollama at {OLLAMA_URL}",
                    "tip": "Ensure Ollama is running and OLLAMA_URL = http://127.0.0.1:11434/api/chat",
                }
            ),
            500,
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "error": str(e),
                    "ollama_url": OLLAMA_URL,
                }
            ),
            500,
        )


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


if __name__ == "__main__":
    app.run(host=os.getenv("FLASK_RUN_HOST"), port=os.getenv("FLASK_RUN_PORT"))
