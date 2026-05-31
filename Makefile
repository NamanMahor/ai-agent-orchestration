.PHONY: help dev backend frontend install install-backend install-frontend lint format clean

BACKEND_PORT ?= 8080
FRONTEND_PORT ?= 5173

help:
	@echo "Available commands:"
	@echo "  make dev"
	@echo "  make backend"
	@echo "  make frontend"
	@echo "  make install"
	@echo "  make lint"
	@echo "  make format"
	@echo "  make clean"

backend:
	cd backend && PYTHONPATH=. ./venv/bin/uvicorn api.main:app --reload --port $(BACKEND_PORT)

frontend:
	cd frontend && npm run dev -- --port $(FRONTEND_PORT)

dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) backend & \
	$(MAKE) frontend & \
	wait

install: install-backend install-frontend

install-backend:
	cd backend && python3 -m venv venv && \
	./venv/bin/pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

lint:
	cd backend && ./venv/bin/ruff check .

format:
	cd backend && ./venv/bin/ruff format .

clean:
	pkill -f uvicorn || true
	pkill -f vite || true
