"""
Unit tests for SQL guardrails.
"""
import pytest
from app.sql.guardrails import validate_sql_guardrails, strip_sql_comments


def test_safe_select_query():
    """Test that safe SELECT query passes."""
    sql = "SELECT * FROM students WHERE cgpa > 8"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == True


def test_with_select_query():
    """Test that WITH...SELECT query passes."""
    sql = "WITH high_scorers AS (SELECT * FROM students WHERE cgpa > 8) SELECT * FROM high_scorers"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == True


def test_dangerous_delete_query():
    """Test that DELETE query is blocked."""
    sql = "DELETE FROM students WHERE id = 1"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False
    assert "DELETE" in result["reason"]


def test_dangerous_drop_query():
    """Test that DROP query is blocked."""
    sql = "DROP TABLE students"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False
    assert "DROP" in result["reason"]


def test_dangerous_insert_query():
    """Test that INSERT query is blocked."""
    sql = "INSERT INTO students (name) VALUES ('Hacker')"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False
    assert "INSERT" in result["reason"]


def test_dangerous_update_query():
    """Test that UPDATE query is blocked."""
    sql = "UPDATE students SET cgpa = 10 WHERE id = 1"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False
    assert "UPDATE" in result["reason"]


def test_multiple_statements():
    """Test that multiple statements are blocked."""
    sql = "SELECT * FROM students; DROP TABLE students;"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False
    assert "Multiple" in result["reason"] or "DROP" in result["reason"]


def test_sql_comment_stripping():
    """Test that SQL comments are stripped."""
    sql = "SELECT * FROM students -- comment"
    stripped = strip_sql_comments(sql)
    assert "--" not in stripped


def test_empty_query():
    """Test that empty query is blocked."""
    sql = ""
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False


def test_comment_only_query():
    """Test that comment-only query is blocked."""
    sql = "-- just a comment"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == False


def test_select_with_join():
    """Test that SELECT with JOIN passes."""
    sql = "SELECT s.name, c.company FROM students s JOIN placements p ON s.id = p.student_id JOIN companies c ON p.company_id = c.id"
    result = validate_sql_guardrails(sql)
    assert result["is_safe"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
