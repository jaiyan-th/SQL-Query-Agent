from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.auth import get_current_user
from app.db.connection import get_db
from app.db.models import Connection
from app.db.connection_manager import create_user_engine
from app.db.schema_introspect import SchemaIntrospector
from app.security.encryption import decrypt_text
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/suggestions")
async def get_database_suggestions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Dynamically generate RAG query suggestions based on the user's active database tables.
    """
    # 1. Fetch user's active database connection
    active_conn = db.query(Connection).filter(
        Connection.user_id == current_user.id,
        Connection.is_active == True
    ).first()
    
    if not active_conn:
        return {"suggestions": []}
        
    try:
        # 2. Compile dynamic engine and introspect table names
        decrypted_url = decrypt_text(active_conn.encrypted_database_url)
        engine = create_user_engine(decrypted_url)
        introspector = SchemaIntrospector(engine)
        tables = [t.lower() for t in introspector.get_table_names()]
    except Exception as e:
        logger.error(f"Failed to introspect table names for suggestions: {str(e)}")
        return {"suggestions": []}

    suggestions = []
    
    # 1. Match specific university placement domain tables (e.g. from sample datasets)
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

    # 2. Match general customer/sales/product domain tables
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
        
    if "products" in tables:
        suggestions.append({
            "question": "Analyze product catalog data",
            "table": "products",
            "output_format": "analysis"
        })

    # 3. Fallback generic query recommendations if no match
    if not suggestions and tables:
        # Pick the first table for recommendations
        sample_table = tables[0]
        suggestions.append({
            "question": f"Show top 5 records from {sample_table} as table",
            "table": sample_table,
            "output_format": "table"
        })
        suggestions.append({
            "question": f"Summarize {sample_table} table structure",
            "table": sample_table,
            "output_format": "text"
        })

    return {"suggestions": suggestions}
