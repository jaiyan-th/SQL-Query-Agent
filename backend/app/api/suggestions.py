from fastapi import APIRouter, Depends
from app.api.auth import get_current_user
from app.db.connection import get_engine
from sqlalchemy import inspect
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/suggestions")
async def get_database_suggestions(current_user = Depends(get_current_user)):
    """
    Dynamically generate RAG query suggestions based on connected PostgreSQL database tables.
    """
    try:
        engine = get_engine()
        inspector = inspect(engine)
        tables = [t for t in inspector.get_table_names() if t.lower() not in ["querygen_users", "querygen_history", "users"]]
    except Exception as e:
        logger.error(f"Failed to introspect table names for suggestions: {str(e)}")
        return {"suggestions": []}

    suggestions = []
    
    # 1. Match specific university placement domain tables
    if "companies" in tables:
        suggestions.append({
            "question": "Show companies offering more than 8 LPA as table",
            "table": "companies",
            "output_format": "table"
        })
        suggestions.append({
            "question": "Show top 5 companies by package as bar graph",
            "table": "companies",
            "output_format": "bar_chart"
        })
        
    if "students" in tables or "placements" in tables:
        suggestions.append({
            "question": "Show placement count by department as pie chart",
            "table": "students" if "students" in tables else "placements",
            "output_format": "pie_chart"
        })
        suggestions.append({
            "question": "Generate a report on student placements",
            "table": "students" if "students" in tables else "placements",
            "output_format": "report"
        })

    # 2. Match general customer/sales domain tables
    if "customers" in tables:
        suggestions.append({
            "question": "Show all customers from Chennai as table",
            "table": "customers",
            "output_format": "table"
        })
        
    if "orders" in tables or "sales" in tables:
        suggestions.append({
            "question": "Show top 5 products by revenue as bar chart",
            "table": "orders" if "orders" in tables else "sales",
            "output_format": "bar_chart"
        })
        suggestions.append({
            "question": "Generate a report on monthly sales",
            "table": "orders" if "orders" in tables else "sales",
            "output_format": "report"
        })

    # 3. Fallback: Generate table inspection queries for first 2 tables if no match
    if not suggestions and tables:
        for t in tables[:2]:
            suggestions.append({
                "question": f"Show all records from {t} as table",
                "table": t,
                "output_format": "table"
            })
            suggestions.append({
                "question": f"Explain total count of records in {t} in text",
                "table": t,
                "output_format": "text"
            })

    return {"suggestions": suggestions}
