"""
Test configuration and fixtures
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from main import app

# Test database URL (use SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_chatbot.db"


@pytest.fixture
async def async_session():
    """Create async database session for testing"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
async def authenticated_client(client, async_session):
    """Create authenticated test client"""
    # Override dependency
    app.dependency_overrides[get_db] = lambda: async_session
    
    # Create test user and get token
    user_data = {
        "email": "test@example.com",
        "password": "testpassword"
    }
    
    response = client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 200
    
    # Login to get token
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": user_data["email"], "password": user_data["password"]}
    )
    assert login_response.status_code == 200
    
    token = login_response.json()["access_token"]
    
    # Add authorization header to client
    client.headers.update({"Authorization": f"Bearer {token}"})
    
    yield client
    
    # Cleanup
    app.dependency_overrides.clear()