# -----------------------------
# Base image
# -----------------------------
FROM python:3.12-slim

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
# Run the Flask app
# -----------------------------
CMD ["python", "app.py"]
