"""
Test API endpoints functionality
"""
import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "message": "AI Chatbot Backend is running"}


def test_root_endpoint(client: TestClient):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "AI Chatbot Backend API"
    assert data["version"] == "1.0.0"


def test_auth_endpoints_exist(client: TestClient):
    """Test that auth endpoints are accessible"""
    # Test register endpoint exists (will fail validation but endpoint should exist)
    response = client.post("/api/v1/auth/register", json={})
    assert response.status_code != 404  # Should not be "Not Found"
    
    # Test login endpoint exists
    response = client.post("/api/v1/auth/login", data={})
    assert response.status_code != 404  # Should not be "Not Found"


def test_chat_endpoints_exist(client: TestClient):
    """Test that chat endpoints are accessible"""
    response = client.get("/api/v1/chat/")
    assert response.status_code == 200
    assert "chats" in response.json()


def test_documents_endpoints_exist(client: TestClient):
    """Test that document endpoints are accessible"""
    response = client.get("/api/v1/documents/")
    assert response.status_code == 200
    assert "documents" in response.json()


def test_api_documentation(client: TestClient):
    """Test that API documentation is accessible"""
    response = client.get("/docs")
    assert response.status_code == 200
    
    response = client.get("/openapi.json")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_user_registration():
    """Test user registration functionality"""
    # This is a placeholder for when we implement full user registration
    # For now, just ensure the test framework works
    assert True


@pytest.mark.asyncio 
async def test_database_models():
    """Test database models can be imported"""
    from app.models.user import User
    from app.models.chat import Chat
    from app.models.message import Message
    from app.models.document import Document
    
    # Test models can be instantiated
    user = User(
        id="test-id",
        email="test@example.com",
        hashed_password="hashed",
        is_guest=False
    )
    assert user.email == "test@example.com"
    assert user.is_guest == False