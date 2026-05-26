FROM python:3.11-slim

WORKDIR /app

# Install deps first (layer cache)
COPY pyproject.toml .
RUN pip install --no-cache-dir ".[dev]" 2>/dev/null || pip install --no-cache-dir .

# Copy application
COPY app/ app/
COPY migrations/ migrations/

EXPOSE 8800

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8800"]
