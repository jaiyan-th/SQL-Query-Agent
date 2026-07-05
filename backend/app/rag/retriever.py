from typing import List, Dict, Any
from app.rag.qdrant_client import get_qdrant_client
from app.schemas import SchemaContext
from app.config import settings
from qdrant_client.http import models
import logging

logger = logging.getLogger(__name__)

def format_schema_context_for_prompt(contexts: List[SchemaContext]) -> str:
    """
    Format schema contexts into a prompt-ready string.
    """
    if not contexts:
        return "No relevant schema context found."

    lines = ["=== RELEVANT DATABASE SCHEMA ===\n"]

    for i, ctx in enumerate(contexts, 1):
        lines.append(f"Schema {i} (Relevance: {ctx.relevance_score}):")
        lines.append(ctx.content)
        lines.append("")

    lines.append("=== END SCHEMA CONTEXT ===")

    return "\n".join(lines)

def retrieve_schema_context(
    question: str,
    user_id: int,
    connection_id: int,
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Retrieve relevant schema context for a question using Qdrant Cloud.
    Filters strictly by user_id and connection_id.
    """
    try:
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME

        logger.info(f"Generating query embedding for RAG schema lookup (user_id={user_id}, connection_id={connection_id})...")
        from fastembed import TextEmbedding
        encoder = TextEmbedding(model_name=settings.QDRANT_EMBEDDING_MODEL)
        embeddings = list(encoder.embed([question]))
        query_vector = embeddings[0]

        logger.info(f"Querying Qdrant collection '{col_name}' with tenant isolating filters...")
        
        # Enforce multi-tenant access controls
        query_filter = models.Filter(
            must=[
                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                models.FieldCondition(key="connection_id", match=models.MatchValue(value=connection_id))
            ]
        )

        results = client.query_points(
            collection_name=col_name,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k
        )

        schema_contexts = []
        chunks = []
        table_names = []

        if results and results.points:
            for point in results.points:
                payload = point.payload or {}
                relevance_score = point.score
                content = payload.get("content", "")
                table_name = payload.get("table_name", "unknown")

                chunks.append(content)
                table_names.append(table_name)

                schema_contexts.append(
                    SchemaContext(
                        table_name=table_name,
                        content=content,
                        relevance_score=round(relevance_score, 3)
                    )
                )

        logger.info(f"Retrieved {len(schema_contexts)} schema contexts from Qdrant for connection_id={connection_id}.")
        
        return {
            "context_text": format_schema_context_for_prompt(schema_contexts),
            "chunks": chunks,
            "table_names": table_names,
            "vector_store": "Qdrant",
            "schema_contexts": schema_contexts
        }

    except Exception as e:
        logger.error(f"Qdrant schema retrieval failed: {str(e)}")
        raise Exception(f"Schema retrieval failed: {str(e)}")
