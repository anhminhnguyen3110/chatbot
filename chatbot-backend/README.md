# AI Chatbot Backend

A FastAPI-based backend for an AI-powered chatbot application using LangGraph for conversation management.

## Features

- **FastAPI Framework**: Modern, fast web framework for building APIs
- **LangGraph Integration**: Advanced AI conversation workflows
- **JWT Authentication**: Secure user authentication with JWT tokens
- **PostgreSQL Database**: Async SQLAlchemy with PostgreSQL
- **User Management**: Support for registered users and guest sessions
- **Chat Management**: Create, update, and manage conversation threads
- **Document Management**: Upload and manage user documents
- **Comprehensive Testing**: Unit tests with 80%+ coverage
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Project Structure

```
chatbot-backend/
├── app/
│   ├── api/
│   │   └── endpoints/       # API route handlers
│   ├── core/               # Core configuration and utilities
│   ├── models/             # SQLAlchemy database models
│   ├── schemas/            # Pydantic request/response schemas
│   └── services/           # Business logic services
├── tests/                  # Test suite
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
└── CURL_TESTS.md          # API testing examples
```

## Installation

### Option 1: Local Development

1. **Clone and setup**:
   ```bash
   cd chatbot-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and API keys
   ```

3. **Setup database**:
   ```bash
   # Install PostgreSQL and create database
   createdb chatbot_db
   ```

4. **Run the application**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Option 2: Docker

1. **Using Docker Compose** (recommended):
   ```bash
   # Set your OpenAI API key
   export OPENAI_API_KEY=your-api-key-here
   
   # Start all services
   docker-compose up -d
   ```

2. **Using Docker only**:
   ```bash
   docker build -t chatbot-backend .
   docker run -p 8000:8000 chatbot-backend
   ```

## API Documentation

Once running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/guest` - Create guest session

### Chat Management
- `GET /api/v1/chat/` - List user's chats
- `POST /api/v1/chat` - Create new chat
- `GET /api/v1/chat/{chat_id}` - Get specific chat
- `PUT /api/v1/chat/{chat_id}` - Update chat
- `DELETE /api/v1/chat/{chat_id}` - Delete chat
- `POST /api/v1/chat/{chat_id}/stream` - Stream AI responses

### Document Management
- `GET /api/v1/documents/` - List documents
- `POST /api/v1/documents` - Create document
- `GET /api/v1/documents/{doc_id}` - Get document
- `PUT /api/v1/documents/{doc_id}` - Update document
- `DELETE /api/v1/documents/{doc_id}` - Delete document

### Other Endpoints
- `GET /api/v1/history/` - Chat history
- `POST /api/v1/files/upload` - File upload
- `GET /health` - Health check

## Testing

### Run Unit Tests
```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app --cov-report=html

# Run specific test file
python -m pytest tests/test_api.py -v
```

### Run E2E Tests
```bash
# Start the server first
uvicorn main:app --reload &

# Run curl tests (requires jq)
bash test_api.sh

# Or follow CURL_TESTS.md for manual testing
```

## Configuration

Key environment variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/chatbot_db

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI
OPENAI_API_KEY=your-openai-api-key
DEFAULT_MODEL=gpt-4o-mini

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

## Deployment

### Production Deployment

1. **Update environment variables**:
   - Set strong `SECRET_KEY`
   - Configure production `DATABASE_URL`
   - Set `DEBUG=false`

2. **Deploy with Docker**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Or deploy to cloud platforms**:
   - AWS ECS/Fargate
   - Google Cloud Run
   - Azure Container Instances
   - Railway, Render, or similar

## Architecture

### Core Components

1. **FastAPI Application** (`main.py`): Application entry point with middleware
2. **Database Layer** (`app/models/`): SQLAlchemy async models
3. **API Layer** (`app/api/`): REST endpoints with dependency injection
4. **Business Logic** (`app/services/`): Service classes for complex operations
5. **AI Integration** (`app/services/ai_service.py`): LangGraph conversation workflows

### Key Features

- **Async/Await**: Full async support for high concurrency
- **Dependency Injection**: FastAPI's built-in DI for clean architecture
- **JWT Authentication**: Stateless authentication with refresh tokens
- **Input Validation**: Pydantic schemas for request/response validation
- **Database Migrations**: SQLAlchemy for schema management
- **Structured Logging**: JSON logging for production observability

## Development

### Adding New Endpoints

1. Create endpoint in `app/api/endpoints/`
2. Add schemas in `app/schemas/`
3. Implement service logic in `app/services/`
4. Add tests in `tests/`
5. Update router in `app/api/routes.py`

### Database Changes

1. Update models in `app/models/`
2. Create migration (if using Alembic)
3. Update corresponding schemas
4. Add tests for new functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

## License

[Add your license information here]