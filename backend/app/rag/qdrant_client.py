"""
Qdrant client for persistent cloud vector storage and retrieval.
Production implementation using qdrant-client and fastembed.
"""
from qdrant_client import QdrantClient
from qdrant_client.http import models
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Global Qdrant client instance
_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """
    Get or create QdrantClient instance.

    Raises:
        ValueError: If QDRANT_URL is not configured.
        Exception: If Qdrant client fails to initialize.
    """
    global _qdrant_client

    if _qdrant_client is None:
        url = settings.QDRANT_URL
        api_key = settings.QDRANT_API_KEY

        if not url:
            raise ValueError(
                "QDRANT_URL is not configured. "
                "Set QDRANT_URL=https://your-qdrant-cloud-url in your environment variables. "
                "Local/in-memory vector DB is not supported in production."
            )

        try:
            # Initialize QdrantClient
            _qdrant_client = QdrantClient(
                url=url,
                api_key=api_key
            )
            # Initialize fastembed model
            _qdrant_client.set_model(settings.QDRANT_EMBEDDING_MODEL)
            logger.info(f"Initialized QdrantClient for: {url}")
        except Exception as e:
            logger.error(f"Failed to initialize QdrantClient: {str(e)}")
            raise Exception(f"Qdrant client initialization failed: {str(e)}")

    return _qdrant_client


def ensure_collection(collection_name: Optional[str] = None):
    """
    Ensure the Qdrant collection exists and is configured with correct dimensions.

    Args:
        collection_name: Optional collection name override
    """
    client = get_qdrant_client()
    col_name = collection_name or settings.QDRANT_COLLECTION_NAME

    # Retrieve vector dimension dynamically
    vector_size = client.get_embedding_size(settings.QDRANT_EMBEDDING_MODEL)

    try:
        collections_response = client.get_collections()
        exists = any(c.name == col_name for c in collections_response.collections)
    except Exception as e:
        logger.error(f"Failed to check collections: {e}")
        exists = False

    if not exists:
        logger.info(f"Creating Qdrant collection '{col_name}' with size {vector_size}...")
        client.create_collection(
            collection_name=col_name,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE
            )
        )

    # Always ensure payload indexes exist for filter fields.
    try:
        collection_info = client.get_collection(collection_name=col_name)
        existing_indexes = collection_info.payload_schema or {}
        
        fields_to_index = {
            "user_id": models.PayloadSchemaType.KEYWORD,
            "workspace_id": models.PayloadSchemaType.KEYWORD,
            "database_type": models.PayloadSchemaType.KEYWORD,
            "table_name": models.PayloadSchemaType.KEYWORD,
            "chunk_type": models.PayloadSchemaType.KEYWORD,
        }
        
        for field, schema_type in fields_to_index.items():
            if field in existing_indexes:
                logger.info(f"Payload index for '{field}' already exists in '{col_name}'")
                continue
            try:
                client.create_payload_index(
                    collection_name=col_name,
                    field_name=field,
                    field_schema=schema_type,
                )
                logger.info(f"Created payload index for '{field}' in '{col_name}'")
            except Exception as e:
                err_msg = str(e).lower()
                if "already exists" in err_msg or "duplicate" in err_msg or "already indexed" in err_msg:
                    logger.info(f"Payload index for '{field}' already exists (caught exception)")
                else:
                    logger.warning(f"Failed to create payload index for '{field}': {e}")
        logger.info(f"Payload indexes verified/created for workspace multi-tenancy in '{col_name}'")
    except Exception as idx_err:
        logger.warning(f"Could not verify or create payload indexes: {idx_err}")



def recreate_collection(collection_name: Optional[str] = None):
    """
    Recreate the Qdrant collection.

    Args:
        collection_name: Optional collection name override
    """
    client = get_qdrant_client()
    col_name = collection_name or settings.QDRANT_COLLECTION_NAME
    vector_size = client.get_embedding_size(settings.QDRANT_EMBEDDING_MODEL)

    logger.info(f"Recreating Qdrant collection '{col_name}'...")
    client.recreate_collection(
        collection_name=col_name,
        vectors_config=models.VectorParams(
            size=vector_size,
            distance=models.Distance.COSINE
        )
    )


def get_collection_status(collection_name: Optional[str] = None) -> dict:
    """
    Get Qdrant collection status.

    Args:
        collection_name: Optional collection name override

    Returns:
        Dict with collection status info
    """
    try:
        client = get_qdrant_client()
        col_name = collection_name or settings.QDRANT_COLLECTION_NAME

        # Ensure collection exists before querying stats
        ensure_collection(col_name)

        info = client.get_collection(collection_name=col_name)
        return {
            "status": "ready",
            "collection": col_name,
            "document_count": info.points_count,
            "vector_store": "Qdrant",
            "indexed": info.points_count > 0
        }
    except Exception as e:
        logger.error(f"Qdrant status check failed: {e}")
        return {
            "status": "error",
            "collection": collection_name or settings.QDRANT_COLLECTION_NAME,
            "document_count": 0,
            "vector_store": "Qdrant",
            "indexed": False,
            "error": str(e)
        }
