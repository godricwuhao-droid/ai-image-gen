#!/bin/bash

set -e

echo "Starting AI Image Generator..."

cd "$(dirname "$0")"

echo "Starting infrastructure services (MySQL, Redis, MinIO)..."
cd infrastructure
docker compose up -d mysql redis minio

echo "Waiting for services to be ready..."
sleep 10

echo "Infrastructure started successfully!"
echo ""
echo "Next steps:"
echo "1. Backend: cd ../backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "2. Frontend: cd ../frontend && npm install && npm run dev"
echo ""
echo "Services:"
echo "- MySQL: localhost:3306"
echo "- Redis: localhost:6379"
echo "- MinIO: localhost:9000 (console: localhost:9001)"
echo "- API: http://localhost:8000"
echo "- API Docs: http://localhost:8000/docs"
echo "- Frontend: http://localhost:5173"
