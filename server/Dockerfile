FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml .
COPY app/ app/
COPY migrations/ migrations/

RUN pip install --no-cache-dir . \
    && groupadd --system startpage \
    && useradd --system --gid startpage --home-dir /nonexistent --shell /usr/sbin/nologin startpage \
    && mkdir -p /var/lib/startpage \
    && chown -R startpage:startpage /var/lib/startpage

USER startpage

EXPOSE 8800

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8800"]
