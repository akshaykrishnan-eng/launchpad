.PHONY: start stop restart logs logs-api logs-web logs-db migrate migration test lint create-superadmin

# Start the full development environment (builds images if needed).
start:
	docker compose up --build -d
	@echo "Web:  http://localhost:$${WEB_PORT:-3000}"
	@echo "API:  http://localhost:$${API_PORT:-8000}"
	@echo "Docs: http://localhost:$${API_PORT:-8000}/docs"

stop:
	docker compose down

restart: stop start

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-web:
	docker compose logs -f web

logs-db:
	docker compose logs -f db

# Apply pending Alembic migrations.
migrate:
	docker compose exec api alembic upgrade head

# Create a new Alembic migration: make migration name="add users table"
migration:
	docker compose exec api alembic revision --autogenerate -m "$(name)"

# Run backend and frontend tests. Backend tests run inside the api
# container (not the host venv) since they exercise the real database,
# whose port is deliberately not published to the host.
test:
	docker compose exec api pytest
	cd apps/web && npm run test

# Lint backend and frontend.
lint:
	docker compose exec api ruff check .
	cd apps/web && npm run lint

# Create a new SUPER_ADMIN user, or grant SUPER_ADMIN to an existing one:
#   make create-superadmin email=admin@example.com password=supersecret
# password is only required the first time (i.e. when the user doesn't
# already exist); omit it to just promote an existing user.
create-superadmin:
	docker compose exec api python -m app.scripts.create_superadmin \
		--email "$(email)" $(if $(password),--password "$(password)",)
