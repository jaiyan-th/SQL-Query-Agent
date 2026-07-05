"""
Schema ingestion into Qdrant.

Supports SQLite workspaces. Extracts schema via SQLAlchemy inspect,
generates embeddings via fastembed, and upserts into Qdrant Cloud.
Qdrant payload always includes user_id, workspace_id, database_type,
table_name, and chunk_type.
"""
import datetime
import uuid
import logging
from typing import Dict, Any

from sqlalchemy.engine import Engine

from app.db.schema_introspect import SchemaIntrospector
from app.rag.qdrant_client import get_qdrant_client, ensure_collection
from qdrant_client.http import models
from app.config import settings

logger = logging.getLogger(__name__)


def ingest_schema_sqlite(
    engine: Engine,
    user_id: int,
    workspace_id: str,
    reset: bool = True,
) -> Dict[str, Any]:
    """
    Introspect SQLite schema and ingest into Qdrant Cloud.

    Args:
        engine: SQLAlchemy engine connected to the user's SQLite file.
        user_id: Platform user id (for tenant isolation in Qdrant).
        workspace_id: UUID of the SqliteWorkspace record.
        reset: If True, delete existing Qdrant points for this workspace first.
    """
    logger.info(f"Starting SQLite schema ingestion: user_id={user_id}, workspace_id={workspace_id}")

    introspector = SchemaIntrospector(engine)
    schemas = introspector.get_all_schemas()

    if not schemas:
        raise ValueError("No tables found in the uploaded SQLite database.")

    client = get_qdrant_client()
    col_name = settings.QDRANT_COLLECTION_NAME
    ensure_collection(col_name)

    # Remove old points for this workspace
    if reset:
        logger.info(f"Clearing old schema vectors for workspace_id={workspace_id}")
        client.delete(
            collection_name=col_name,
            points_selector=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                    models.FieldCondition(key="workspace_id", match=models.MatchValue(value=workspace_id)),
                ]
            ),
        )

    documents = []
    schema_list = []
    for schema in schemas:
        doc = introspector.build_schema_document(schema)
        documents.append(doc)
        schema_list.append(schema)

    if not documents:
        raise ValueError("Schema introspection produced no documents.")

    logger.info(f"Generating embeddings for {len(documents)} schema documents...")
    from fastembed import TextEmbedding
    encoder = TextEmbedding(model_name=settings.QDRANT_EMBEDDING_MODEL)
    embeddings = list(encoder.embed(documents))

    points = []
    for i, (doc, emb) in enumerate(zip(documents, embeddings)):
        schema = schema_list[i]
        table_name = schema["table_name"]

        # Deterministic UUID from workspace_id + table_name
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{workspace_id}_{table_name.lower()}"))

        payload = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "database_type": "sqlite",
            "table_name": table_name,
            "chunk_type": "table_schema",
            "content": doc,
            "columns": schema["columns"],
            "primary_keys": schema["primary_keys"],
            "foreign_keys": schema["foreign_keys"],
            "relationships": [
                f"{', '.join(fk['columns'])} references "
                f"{fk['referred_table']}({', '.join(fk['referred_columns'])})"
                for fk in schema["foreign_keys"]
            ],
            "created_at": datetime.datetime.now().isoformat(),
        }

        points.append(
            models.PointStruct(id=point_id, vector=emb, payload=payload)
        )

    logger.info(f"Upserting {len(points)} points into Qdrant '{col_name}'...")
    client.upsert(collection_name=col_name, points=points)
    logger.info("Qdrant SQLite schema ingestion complete.")

    return {
        "status": "success",
        "tables_indexed": len(documents),
        "documents_created": len(documents),
        "collection": col_name,
    }
