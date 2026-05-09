# AI Image Generator

A third-party API-based AI image generation platform built with React, FastAPI, and MySQL.

## Features

- Text-to-image generation using OpenAI GPT Images 2.0
- User authentication (register/login with JWT)
- Multiple image sizes and quality options
- Style presets for various artistic styles
- Daily generation limits for free tier (10 images/day)
- Image download functionality
- Generation history

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Vite
- **Backend**: Python FastAPI, SQLAlchemy, Celery
- **Database**: MySQL 8.0
- **Cache/Queue**: Redis 7
- **Object Storage**: MinIO
- **AI Provider**: OpenAI GPT Images 2.0

## Project Structure

```
ai-image-gen/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API services
│   │   ├── store/            # Zustand store
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript types
│   │   └── App.tsx
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── core/             # Core config, security
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   │   └── provider/     # Third-party providers
│   │   ├── tasks/            # Celery tasks
│   │   └── main.py
│   └── requirements.txt
└── infrastructure/           # Infrastructure
    └── docker-compose.yml
```

## Quick Start

### Prerequisites

- Docker Desktop 24+
- Node.js 18+
- Python 3.11+
- OpenAI API Key

### 1. Start Infrastructure

```bash
cd ai-image-gen/infrastructure
docker compose up -d mysql redis minio
```

### 2. Backend Setup

```bash
cd ai-image-gen/backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit .env and add your OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd ai-image-gen/frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

## Environment Variables

### Backend (.env)

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
DATABASE_URL=mysql+aiomysql://ai_image_user:dev_password@localhost:3306/ai_image_gen?charset=utf8mb4
REDIS_URL=redis://localhost:6379/0
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ai-images
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user info

### Image Generation

- `POST /api/v1/generations` - Create generation task
- `GET /api/v1/generations/{id}` - Get generation status
- `GET /api/v1/generations` - List generations
- `DELETE /api/v1/generations/{id}` - Delete generation

## License

MIT
