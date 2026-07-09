from sqlalchemy import inspect, MetaData
from sqlalchemy.engine import Engine
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class SchemaIntrospector:
    """Introspects database schema metadata for RAG-grounded query generation."""
    
    def __init__(self, engine: Engine):
        """
        Initialize introspector.
        
        Args:
            engine: SQLAlchemy engine connected to the target database
        """
        self.engine = engine
        self.inspector = inspect(self.engine)
        self.metadata = MetaData()
    
    def get_table_names(self) -> List[str]:
        """
        Get all table names, excluding platform internal metadata tables.
        """
        try:
            raw_tables = self.inspector.get_table_names()
            exclude_tables = {"querygen_users", "querygen_connections", "querygen_history", "users"}
            return [t for t in raw_tables if t.lower() not in exclude_tables and not t.lower().startswith("sqlite_")]
        except Exception as e:
            logger.error(f"Failed to get table names: {str(e)}")
            return []
    
    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """
        Get columns, keys, types, nullable attributes, and relationships.
        """
        try:
            columns = self.inspector.get_columns(table_name)
            pk_constraint = self.inspector.get_pk_constraint(table_name)
            foreign_keys = self.inspector.get_foreign_keys(table_name)
            
            # Extract column properties
            column_info = []
            for col in columns:
                column_info.append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True)
                })
            
            # Extract primary keys
            primary_keys = pk_constraint.get("constrained_columns", []) if pk_constraint else []
            
            # Extract foreign keys
            fk_info = []
            for fk in foreign_keys:
                fk_info.append({
                    "columns": fk.get("constrained_columns", []),
                    "referred_table": fk.get("referred_table"),
                    "referred_columns": fk.get("referred_columns", [])
                })
            
            return {
                "table_name": table_name,
                "columns": column_info,
                "primary_keys": primary_keys,
                "foreign_keys": fk_info
            }
        
        except Exception as e:
            logger.error(f"Failed to introspect table '{table_name}': {str(e)}")
            return {
                "table_name": table_name,
                "columns": [],
                "primary_keys": [],
                "foreign_keys": [],
                "error": str(e)
            }
    
    def build_schema_document(self, schema: Dict[str, Any]) -> str:
        """
        Build text document from schema dictionary suitable for Qdrant RAG.
        """
        table_name = schema["table_name"]
        columns = schema["columns"]
        primary_keys = schema["primary_keys"]
        foreign_keys = schema["foreign_keys"]

        lines = [f"Table: {table_name}"]
        
        # Add Columns
        lines.append("Columns:")
        for col in columns:
            pk_marker = " (Primary Key)" if col["name"] in primary_keys else ""
            nullable = "nullable" if col["nullable"] else "not nullable"
            lines.append(f"  - {col['name']}: {col['type']}, {nullable}{pk_marker}")

        # Add Relationships / Foreign Keys
        if foreign_keys:
            lines.append("Relationships:")
            for fk in foreign_keys:
                lines.append(
                    f"  - {', '.join(fk['columns'])} references "
                    f"{fk['referred_table']}({', '.join(fk['referred_columns'])})"
                )

        return "\n".join(lines)

    def get_all_schemas(self) -> List[Dict[str, Any]]:
        """
        Introspect and compile all active schemas.
        """
        table_names = self.get_table_names()
        schemas = []
        for name in table_names:
            schema = self.get_table_schema(name)
            if "error" not in schema:
                schemas.append(schema)
        return schemas
