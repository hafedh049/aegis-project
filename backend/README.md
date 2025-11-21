---

# 🛡️ Cyber Log Analyzer API

A Flask-powered API to fetch Grafana alerts and analyze honeypot logs using **Ollama AI**. Ideal for cybersecurity analysts and automation pipelines.

---

## 🚀 Features

* Fetch alerts from Grafana (`/alerts` endpoint)
* Analyze honeypot logs with Ollama (`/analyze` endpoint)
* Contextual chat analysis of alerts (`/chat` endpoint)
* Automatic Grafana admin token management
* Environment-configurable via `.env`
* Fully JSON-based API, ready for automation

---

## 🧰 Tech Stack

* **Python 3.11+**
* **Flask** – lightweight web framework
* **Flask-CORS** – handle cross-origin requests
* **Requests** – interact with Grafana & Ollama APIs
* **python-dotenv** – manage environment variables
* **Ollama** – AI model for log analysis
* **Grafana** – alert source

---

## ⚙️ Installation

1. Clone the repo:

```bash
git clone <repo_url>
cd <repo_dir>
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file:

```env
VMS_FILE=...
ALERTS_ENDPOINT=...
KEYS_ENDPOINT=...
GRAFANA_TOKEN_NAME=...
GRAFANA_USER=...
GRAFANA_PASSWORD=...
OLLAMA_URL=...
```

4. Start the API:

```bash
python app.py
```

You should see:

```
🚀 Starting Flask app...
   Alerts endpoint: http://localhost:5005/alerts
   Analyze endpoint: http://localhost:5005/analyze
   Ollama URL: http://localhost:11434/api/generate
```

---

## 🛠️ Endpoints

### 1️⃣ Fetch Alerts

```http
GET /alerts
```

* Returns Grafana alerts from the "Arsenal" VM.
* Auto-creates a fresh admin token for secure access.
* Response:

```json
[
  {
    "id": 1,
    "title": "High CPU Usage",
    "state": "alerting",
    "tags": ["cpu", "server"]
  }
]
```

---

### 2️⃣ Analyze Log

```http
POST /analyze
Content-Type: application/json

{
  "log": "Failed login attempt from 192.168.1.50"
}
```

* Analyzes honeypot logs using Ollama AI.
* Returns structured MITRE ATT&CK analysis:

```json
{
  "attack_technique": "T1110",
  "technique_name": "Brute Force",
  "tactic": "Credential Access",
  "confidence": 0.85,
  "summary": "Repeated login attempts detected from external IP.",
  "recommendation": "Implement rate-limiting and account lockout policies."
}
```

---

### 3️⃣ Chat Alert Analysis

```http
POST /chat
Content-Type: application/json

{
  "alert": { /* full alert JSON */ },
  "prompt": "Summarize the risk and mitigation steps.",
  "messages": [ /* optional chat history */ ]
}
```

* Context-aware AI chat analysis using the alert JSON.
* Returns **Markdown-formatted advice**.
* Example output:

```markdown
### 🔔 Alert Analysis

**Risk Level:** High  
**Mitigation:** Enable IP blocking and MFA for affected systems.
```

---

## ⚡ Notes

* Ensure **Ollama** is running at `OLLAMA_URL`.
* Grafana "Arsenal" VM must exist in `VMS_FILE`.
* Ollama responses are parsed as JSON; malformed responses are reported.
* Customize AI model & parameters in `.env` or code (`phi4-mini` recommended).

---

## 📈 Roadmap

* [ ] Add multi-VM support
* [ ] Stream alerts & log analysis
* [ ] Web dashboard with real-time visualizations
* [ ] Fine-tune AI prompts for specific alert types

---

## 📝 License

MIT License – use freely for internal cybersecurity automation.

---