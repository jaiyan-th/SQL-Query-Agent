"""
Qdrant RAG retrieval — filters strictly by user_id + workspace_id.
"""
from typing import List, Dict, Any

from app.rag.qdrant_client import get_qdrant_client
from app.schemas import SchemaContext
from app.config import settings
from qdrant_client.http import models
import logging

logger = logging.getLogger(__name__)


def format_schema_context_for_prompt(contexts: List[SchemaContext]) -> str:
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
    workspace_id: str,
    top_k: int = 3,
) -> Dict[str, Any]:
    """
    Retrieve relevant schema context from Qdrant.
    Filters by user_id and workspace_id to enforce multi-tenant isolation.
    """
    try:
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME

        logger.info(
            f"RAG lookup: user_id={user_id}, workspace_id={workspace_id}"
        )

        from fastembed import TextEmbedding
        encoder = TextEmbedding(model_name=settings.QDRANT_EMBEDDING_MODEL)
        query_vector = list(encoder.embed([question]))[0]

        query_filter = models.Filter(
            must=[
                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                models.FieldCondition(key="workspace_id", match=models.MatchValue(value=workspace_id)),
            ]
        )

        results = client.query_points(
            collection_name=col_name,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
        )

        schema_contexts: List[SchemaContext] = []
        chunks: List[str] = []
        table_names: List[str] = []

        if results and results.points:
            for point in results.points:
                payload = point.payload or {}
                content = payload.get("content", "")
                table_name = payload.get("table_name", "unknown")
                chunks.append(content)
                table_names.append(table_name)
                schema_contexts.append(
                    SchemaContext(
                        table_name=table_name,
                        content=content,
                        relevance_score=round(point.score, 3),
                    )
                )

        logger.info(
            f"Retrieved {len(schema_contexts)} schema contexts for workspace_id={workspace_id}"
        )

        return {
            "context_text": format_schema_context_for_prompt(schema_contexts),
            "chunks": chunks,
            "table_names": table_names,
            "vector_store": "Qdrant",
            "schema_contexts": schema_contexts,
        }

    except Exception as e:
        logger.error(f"Qdrant retrieval failed: {str(e)}")
        raise Exception(f"Schema retrieval failed: {str(e)}")
