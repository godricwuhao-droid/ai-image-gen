#!/bin/bash

echo "=== AI Image Generator - API Test Script ==="
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s http://localhost:8000/health | jq .
echo ""

# Test 2: Register a test user
echo "2. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123"
  }')

echo "Register response:"
echo "$REGISTER_RESPONSE" | jq .
echo ""

# Test 3: Login
echo "3. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }')

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq .

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
echo ""
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 4: Get current user
echo "4. Getting current user info..."
curl -s http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# Test 5: Create generation (will fail without valid OpenAI API key, but tests the endpoint)
echo "5. Testing generation endpoint..."
curl -s -X POST http://localhost:8000/api/v1/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "size": "1024x1024",
    "quality": "standard",
    "n": 1
  }' | jq .
echo ""

echo "=== Test Complete ==="
