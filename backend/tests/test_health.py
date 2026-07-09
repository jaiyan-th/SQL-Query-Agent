"""
Test health endpoint
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Test that health endpoint returns success."""
    response = client.get("/api/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "QueryGen AI"
    assert "environment" in data


def test_llm_status_endpoint():
    """Test that /api/settings/llm-status returns configuration statuses."""
    response = client.get("/api/settings/llm-status")
    assert response.status_code == 200
    
    data = response.json()
    assert "groq_configured" in data
    assert "gemini_configured" in data
    assert data["primary_provider"] == "groq"
    assert data["fallback_provider"] == "gemini"
    assert isinstance(data["groq_configured"], bool)
    assert isinstance(data["gemini_configured"], bool)



if __name__ == "__main__":
    pytest.main([__file__, "-v"])
