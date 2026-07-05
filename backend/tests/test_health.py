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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
