"""
Unit tests for SQL LIMIT injector.
"""
import pytest
from app.sql.limit_injector import inject_limit, has_limit_clause, is_aggregation_only


def test_inject_limit_basic():
    """Test that LIMIT is injected into basic query."""
    sql = "SELECT * FROM students"
    result = inject_limit(sql, limit=10)
    assert "LIMIT 10" in result


def test_no_duplicate_limit():
    """Test that LIMIT is not duplicated if already present."""
    sql = "SELECT * FROM students LIMIT 5"
    result = inject_limit(sql, limit=10)
    assert result.count("LIMIT") == 1
    assert "LIMIT 5" in result


def test_aggregation_only_no_limit():
    """Test that aggregation-only queries don't get LIMIT."""
    sql = "SELECT COUNT(*) FROM students"
    result = inject_limit(sql, limit=10)
    assert "LIMIT" not in result


def test_aggregation_with_group_by_gets_limit():
    """Test that aggregation with GROUP BY gets LIMIT."""
    sql = "SELECT department, COUNT(*) FROM students GROUP BY department"
    result = inject_limit(sql, limit=10)
    assert "LIMIT 10" in result


def test_has_limit_detection():
    """Test LIMIT detection."""
    assert has_limit_clause("SELECT * FROM students LIMIT 10") == True
    assert has_limit_clause("SELECT * FROM students") == False


def test_is_aggregation_detection():
    """Test aggregation detection."""
    assert is_aggregation_only("SELECT COUNT(*) FROM students") == True
    assert is_aggregation_only("SELECT * FROM students") == False
    assert is_aggregation_only("SELECT COUNT(*) FROM students GROUP BY dept") == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
