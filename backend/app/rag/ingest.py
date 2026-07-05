"""
Schema ingestion into Qdrant.
Converts database schema metadata into vector-searchable documents.
"""
import datetime
import uuid
import logging
from typing import List, Dict, Any
from app.db.schema_introspector import SchemaIntrospector
from app.db.connection import get_engine
from app.rag.qdrant_client import get_qdrant_client, ensure_collection, recreate_collection
from qdrant_client.http import models
from app.config import settings

logger = logging.getLogger(__name__)


def build_schema_document(schema: Dict[str, Any]) -> str:
    """
    Convert schema metadata into a text document for embedding.

    Args:
        schema: Schema dictionary from introspector

    Returns:
        Formatted schema document string
    """
    table_name = schema["table_name"]
    columns = schema["columns"]
    primary_keys = schema["primary_keys"]
    foreign_keys = schema["foreign_keys"]

    # Build document
    doc_lines = [f"Table: {table_name}"]

    # Add columns
    doc_lines.append("\nColumns:")
    for col in columns:
        pk_marker = " (Primary Key)" if col["name"] in primary_keys else ""
        nullable = "nullable" if col["nullable"] else "not nullable"
        doc_lines.append(
            f"  - {col['name']}: {col['type']}, {nullable}{pk_marker}"
        )

    # Add foreign keys
    if foreign_keys:
        doc_lines.append("\nRelationships:")
        for fk in foreign_keys:
            doc_lines.append(
                f"  - {', '.join(fk['columns'])} references "
                f"{fk['referred_table']}({', '.join(fk['referred_columns'])})"
            )

    return "\n".join(doc_lines)


def ingest_schema(reset: bool = True) -> Dict[str, Any]:
    """
    Introspect database schema and ingest into Qdrant Cloud.

    Args:
        reset: Whether to reset/recreate collection before ingestion

    Returns:
        Dict with ingestion statistics
    """
    logger.info("Starting schema ingestion to Qdrant...")

    try:
        # Introspect schemas from PostgreSQL
        introspector = SchemaIntrospector(get_engine())
        schemas = introspector.get_all_schemas()

        if not schemas:
            raise Exception("No tables found in PostgreSQL database")

        # Get Qdrant client
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME

        # Recreate or ensure collection exists
        if reset:
            recreate_collection(col_name)
        else:
            ensure_collection(col_name)

        documents = []
        schema_list = []

        for schema in schemas:
            if "error" in schema:
                logger.warning(f"Skipping table {schema['table_name']}: {schema['error']}")
                continue

            table_name = schema["table_name"].lower()
            if table_name in ["querygen_users", "querygen_history", "users"]:
                logger.info(f"Excluding internal table {table_name} from RAG schema indexing")
                continue

            doc = build_schema_document(schema)
            documents.append(doc)
            schema_list.append(schema)

        # Ingest into Qdrant Cloud if there are schemas
        if documents:
            logger.info(f"Generating embeddings for {len(documents)} schema documents...")
            from fastembed import TextEmbedding
            encoder = TextEmbedding(model_name=settings.QDRANT_EMBEDDING_MODEL)
            embeddings = list(encoder.embed(documents))

            points = []
            for i, (doc, emb) in enumerate(zip(documents, embeddings)):
                schema = schema_list[i]
                table_name = schema["table_name"]
                doc_id = f"table_{table_name}"

                # Generate a valid UUID deterministically from table name
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, table_name))

                # Build rich payload as requested by spec
                payload = {
                    "doc_id": doc_id,
                    "table_name": table_name,
                    "content": doc,
                    "columns": schema["columns"],
                    "primary_keys": schema["primary_keys"],
                    "foreign_keys": schema["foreign_keys"],
                    "relationships": [
                        f"{', '.join(fk['columns'])} references {fk['referred_table']}({', '.join(fk['referred_columns'])})"
                        for fk in schema["foreign_keys"]
                    ],
                    "created_at": datetime.datetime.now().isoformat()
                }

                points.append(
                    models.PointStruct(
                        id=point_id,
                        vector=emb,
                        payload=payload
                    )
                )

            logger.info(f"Upserting {len(points)} points into Qdrant collection '{col_name}'...")
            client.upsert(
                collection_name=col_name,
                points=points
            )
            logger.info("Qdrant schema ingestion complete.")

        return {
            "status": "success",
            "tables_indexed": len(documents),
            "documents_created": len(documents),
            "collection": col_name
        }

    except Exception as e:
        logger.error(f"Qdrant schema ingestion failed: {str(e)}")
        raise Exception(f"Schema ingestion failed: {str(e)}")
