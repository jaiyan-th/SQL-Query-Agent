import datetime
import uuid
import logging
from typing import List, Dict, Any
from sqlalchemy.engine import Engine
from app.db.schema_introspect import SchemaIntrospector
from app.rag.qdrant_client import get_qdrant_client, ensure_collection
from qdrant_client.http import models
from app.config import settings

logger = logging.getLogger(__name__)

def ingest_schema(
    engine: Engine,
    user_id: int,
    connection_id: int,
    database_type: str,
    reset: bool = True
) -> Dict[str, Any]:
    """
    Introspect database schema and ingest into Qdrant Cloud.
    Clears existing points matching the (user_id, connection_id) first.
    """
    logger.info(f"Starting schema ingestion for user_id={user_id}, connection_id={connection_id}...")

    try:
        # 1. Introspect schemas from the provided database engine
        introspector = SchemaIntrospector(engine)
        schemas = introspector.get_all_schemas()

        if not schemas:
            raise Exception("No tables found in the connected database to index.")

        # 2. Get Qdrant client
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME

        # Ensure collection exists
        ensure_collection(col_name)

        # 3. Clean up existing points for this specific user/connection to avoid duplicates
        if reset:
            logger.info(f"Clearing old schema vectors for connection_id={connection_id}")
            client.delete(
                collection_name=col_name,
                points_selector=models.Filter(
                    must=[
                        models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                        models.FieldCondition(key="connection_id", match=models.MatchValue(value=connection_id))
                    ]
                )
            )

        documents = []
        schema_list = []

        for schema in schemas:
            doc = introspector.build_schema_document(schema)
            documents.append(doc)
            schema_list.append(schema)

        # 4. Generate embeddings and upsert points
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

                # Generate a valid UUID deterministically from connection_id and table_name
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{connection_id}_{table_name.lower()}"))

                # Build payload matching spec requirements
                payload = {
                    "user_id": user_id,
                    "connection_id": connection_id,
                    "database_type": database_type,
                    "table_name": table_name,
                    "document_type": "table_schema",
                    "doc_id": doc_id,
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
