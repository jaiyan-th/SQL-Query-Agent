"""
Schema context retrieval from Qdrant using RAG.
"""
from typing import List, Dict, Any
from app.rag.qdrant_client import get_qdrant_client
from app.schemas import SchemaContext
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def format_schema_context_for_prompt(contexts: List[SchemaContext]) -> str:
    """
    Format schema contexts into a prompt-ready string.

    Args:
        contexts: List of SchemaContext objects

    Returns:
        Formatted schema context string
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
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Retrieve relevant schema context for a question using Qdrant Cloud.

    Args:
        question: Natural language question
        top_k: Number of relevant schema chunks to retrieve

    Returns:
        Dict containing:
            - context_text: formatted string prompt
            - chunks: list of text chunks retrieved
            - table_names: list of table names retrieved
            - vector_store: "Qdrant"
            - schema_contexts: List of SchemaContext Pydantic objects for API responses
    """
    try:
        client = get_qdrant_client()
        col_name = settings.QDRANT_COLLECTION_NAME

        logger.info("Generating embedding for the user question...")
        from fastembed import TextEmbedding
        encoder = TextEmbedding(model_name=settings.QDRANT_EMBEDDING_MODEL)
        embeddings = list(encoder.embed([question]))
        query_vector = embeddings[0]

        logger.info(f"Querying Qdrant collection '{col_name}' for context...")
        # Search Qdrant collection using the official query_points method.
        results = client.query_points(
            collection_name=col_name,
            query=query_vector,
            limit=top_k
        )

        schema_contexts = []
        chunks = []
        table_names = []

        if results and results.points:
            for point in results.points:
                payload = point.payload or {}
                # Relevance score is the cosine similarity search score
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

        logger.info(f"Retrieved {len(schema_contexts)} schema contexts from Qdrant.")
        
        return {
            "context_text": format_schema_context_for_prompt(schema_contexts),
            "chunks": chunks,
            "table_names": table_names,
            "vector_store": "Qdrant",
            "schema_contexts": schema_contexts
        }

    except Exception as e:
        logger.error(f"Qdrant schema retrieval failed: {str(e)}")
        return {
            "context_text": "No relevant schema context found.",
            "chunks": [],
            "table_names": [],
            "vector_store": "Qdrant",
            "schema_contexts": []
        }
