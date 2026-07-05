"""
Database schema introspection.
Reads table names, columns, types, keys, and relationships.
"""
from sqlalchemy import inspect, MetaData, text
from sqlalchemy.engine import Engine
from typing import List, Dict, Any
from app.db.connection import get_engine
import logging

logger = logging.getLogger(__name__)


class SchemaIntrospector:
    """Introspects database schema metadata."""
    
    def __init__(self, engine: Engine = None):
        """
        Initialize introspector.
        
        Args:
            engine: SQLAlchemy engine, defaults to default engine
        """
        self.engine = engine or get_engine()
        self.inspector = inspect(self.engine)
        self.metadata = MetaData()
    
    def get_table_names(self) -> List[str]:
        """
        Get all table names in the database.
        
        Returns:
            List of table names
        """
        try:
            return self.inspector.get_table_names()
        except Exception as e:
            logger.error(f"Failed to get table names: {str(e)}")
            return []
    
    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """
        Get comprehensive schema information for a table.
        
        Args:
            table_name: Name of the table
            
        Returns:
            Dict containing table schema metadata
        """
        try:
            columns = self.inspector.get_columns(table_name)
            pk_constraint = self.inspector.get_pk_constraint(table_name)
            foreign_keys = self.inspector.get_foreign_keys(table_name)
            indexes = self.inspector.get_indexes(table_name)
            
            # Build column information
            column_info = []
            for col in columns:
                col_data = {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "default": str(col.get("default")) if col.get("default") else None,
                }
                column_info.append(col_data)
            
            # Build primary key info
            primary_keys = pk_constraint.get("constrained_columns", []) if pk_constraint else []
            
            # Build foreign key info
            fk_info = []
            for fk in foreign_keys:
                fk_data = {
                    "columns": fk.get("constrained_columns", []),
                    "referred_table": fk.get("referred_table"),
                    "referred_columns": fk.get("referred_columns", []),
                }
                fk_info.append(fk_data)
            
            return {
                "table_name": table_name,
                "columns": column_info,
                "primary_keys": primary_keys,
                "foreign_keys": fk_info,
                "indexes": [idx["name"] for idx in indexes],
            }
        
        except Exception as e:
            logger.error(f"Failed to get schema for table {table_name}: {str(e)}")
            return {
                "table_name": table_name,
                "columns": [],
                "primary_keys": [],
                "foreign_keys": [],
                "indexes": [],
                "error": str(e)
            }
    
    def get_all_schemas(self) -> List[Dict[str, Any]]:
        """
        Get schema information for all tables.
        
        Returns:
            List of table schema dictionaries
        """
        table_names = self.get_table_names()
        schemas = []
        
        for table_name in table_names:
            schema = self.get_table_schema(table_name)
            schemas.append(schema)
        
        logger.info(f"Introspected {len(schemas)} tables")
        return schemas
    
    def get_schema_summary(self) -> str:
        """
        Get human-readable schema summary.
        
        Returns:
            Formatted schema summary string
        """
        schemas = self.get_all_schemas()
        summary_lines = []
        
        for schema in schemas:
            table_name = schema["table_name"]
            columns = schema["columns"]
            pks = schema["primary_keys"]
            fks = schema["foreign_keys"]
            
            summary_lines.append(f"\nTable: {table_name}")
            summary_lines.append("Columns:")
            
            for col in columns:
                pk_marker = " [PK]" if col["name"] in pks else ""
                nullable = "NULL" if col["nullable"] else "NOT NULL"
                summary_lines.append(
                    f"  - {col['name']}: {col['type']} {nullable}{pk_marker}"
                )
            
            if fks:
                summary_lines.append("Foreign Keys:")
                for fk in fks:
                    summary_lines.append(
                        f"  - {', '.join(fk['columns'])} -> "
                        f"{fk['referred_table']}({', '.join(fk['referred_columns'])})"
                    )
        
        return "\n".join(summary_lines)
    
    def get_sample_data(self, table_name: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get sample rows from a table.
        
        Args:
            table_name: Name of the table
            limit: Number of sample rows
            
        Returns:
            List of sample row dictionaries
        """
        try:
            with self.engine.connect() as conn:
                query = text(f"SELECT * FROM {table_name} LIMIT :limit")
                result = conn.execute(query, {"limit": limit})
                columns = result.keys()
                rows = result.fetchall()
                
                return [dict(zip(columns, row)) for row in rows]
        
        except Exception as e:
            logger.error(f"Failed to get sample data from {table_name}: {str(e)}")
            return []
