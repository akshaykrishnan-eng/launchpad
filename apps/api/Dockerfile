FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e ".[dev]"

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# Applies pending migrations before the server starts, so a fresh
# database (first `make start`, or a wiped dev volume) never crashes on
# the app's own startup seeding hitting tables that don't exist yet.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
