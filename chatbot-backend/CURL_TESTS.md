# AI Chatbot Backend API - E2E Testing with Curl

This document provides comprehensive curl examples for testing all API endpoints.

## Prerequisites

1. Start the backend server:
```bash
cd chatbot-backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. Ensure you have a PostgreSQL database running with the correct connection string in your .env file.

## Basic Health Check

```bash
# Test health endpoint
curl -X GET "http://localhost:8000/health" \
  -H "accept: application/json"

# Expected response:
# {"status": "healthy", "message": "AI Chatbot Backend is running"}
```

## Authentication Endpoints

### User Registration
```bash
# Register a new user
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "securepassword123"
  }'

# Expected response:
# {
#   "id": "uuid-string",
#   "email": "testuser@example.com",
#   "is_guest": false,
#   "is_active": true,
#   "created_at": "2024-01-15T10:30:00",
#   "updated_at": "2024-01-15T10:30:00"
# }
```

### User Login
```bash
# Login with credentials
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "accept: application/json" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser@example.com&password=securepassword123"

# Expected response:
# {
#   "access_token": "jwt-token-string",
#   "token_type": "bearer",
#   "user": {
#     "id": "uuid-string",
#     "email": "testuser@example.com",
#     "is_guest": false,
#     "is_active": true,
#     "created_at": "2024-01-15T10:30:00",
#     "updated_at": "2024-01-15T10:30:00"
#   }
# }
```

## Authenticated Requests

For all subsequent requests, you need to include the JWT token in the Authorization header:

```bash
# Set the token as a variable (replace with your actual token)
export TOKEN="your-jwt-token-here"
```

### Chat Endpoints

```bash
# List user's chats
curl -X GET "http://localhost:8000/api/v1/chat/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"chats": []}
```

### Document Endpoints

```bash
# List user's documents
curl -X GET "http://localhost:8000/api/v1/documents/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"documents": []}
```

### File Endpoints

```bash
# List user's files
curl -X GET "http://localhost:8000/api/v1/files/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"files": []}
```

### History Endpoints

```bash
# Get user's chat history
curl -X GET "http://localhost:8000/api/v1/history/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"history": []}
```

### Suggestions Endpoints

```bash
# Get suggestions
curl -X GET "http://localhost:8000/api/v1/suggestions/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"suggestions": []}
```

### Votes Endpoints

```bash
# Get votes
curl -X GET "http://localhost:8000/api/v1/votes/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {"votes": []}
```

## API Documentation

```bash
# Access OpenAPI schema
curl -X GET "http://localhost:8000/openapi.json" \
  -H "accept: application/json"

# Access Swagger UI (open in browser)
# http://localhost:8000/docs

# Access ReDoc (open in browser)  
# http://localhost:8000/redoc
```

## Error Handling Tests

```bash
# Test authentication error (missing token)
curl -X GET "http://localhost:8000/api/v1/chat/" \
  -H "accept: application/json"

# Expected response:
# HTTP 401 Unauthorized

# Test invalid token
curl -X GET "http://localhost:8000/api/v1/chat/" \
  -H "accept: application/json" \
  -H "Authorization: Bearer invalid-token"

# Expected response:
# HTTP 401 Unauthorized

# Test invalid email format for registration
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123"
  }'

# Expected response:
# HTTP 422 Validation Error
```

## Complete Test Script

Here's a complete bash script to test the API:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
TEST_EMAIL="test$(date +%s)@example.com"
TEST_PASSWORD="testpass123"

echo "=== AI Chatbot Backend API E2E Tests ==="

# 1. Health Check
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq .

# 2. User Registration
echo "2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

echo $REGISTER_RESPONSE | jq .

# 3. User Login
echo "3. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$TEST_EMAIL&password=$TEST_PASSWORD")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r .access_token)
echo "Token obtained: ${TOKEN:0:50}..."

# 4. Test authenticated endpoints
echo "4. Testing authenticated endpoints..."

curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/chat/" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/documents/" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/files/" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/v1/history/" | jq .

echo "=== Tests completed ==="
```