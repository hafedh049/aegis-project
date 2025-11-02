# -----------------------------
# Base image
# -----------------------------
FROM python:3.12-slim

# -----------------------------
# Set environment variables with defaults
# -----------------------------
ENV OLLAMA_URL="http://localhost:11434/api/chat" \
    GRAFANA_IP="http://127.0.0.1:3000" \
    GRAFANA_USER="admin" \
    GRAFANA_PASSWORD="admin" \
    FLASK_PORT="12345" \ 
    FLASK_HOST="0.0.0.0"

# -----------------------------
# Set working directory
# -----------------------------
WORKDIR /app

# -----------------------------
# Copy application code
# -----------------------------
COPY . .

# -----------------------------
# Install dependencies
# -----------------------------
RUN apt update && \
    apt install -y curl wget dnsutils iputils-ping && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /var/lib/apt/lists/*
# -----------------------------
# Expose the Flask port
# -----------------------------
EXPOSE 12345

# -----------------------------
# Run the Flask app
# -----------------------------
CMD ["python", "app.py"]
