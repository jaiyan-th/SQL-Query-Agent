import re
from typing import Tuple

def detect_and_clean_format(question: str, request_format: str = "auto") -> Tuple[str, str]:
    """
    Detect the desired output format from the user's question, and return
    a cleaned version of the question with the formatting request removed.

    Args:
        question: The raw natural language question.
        request_format: The format requested in the API payload (e.g., "auto").

    Returns:
        A tuple of (cleaned_question, detected_format).
    """
    q_lower = question.lower()
    
    # 1. Detect Format
    detected_format = "table"
    
    # Bar Chart patterns
    if any(p in q_lower for p in ["bar graph", "bar chart", "as bar"]):
        detected_format = "bar_chart"
    # Pie Chart patterns
    elif any(p in q_lower for p in ["pie chart", "pie", "distribution", "percentage", "share"]):
        detected_format = "pie_chart"
    # Report patterns
    elif any(p in q_lower for p in ["detailed report", "generate report", "report on"]):
        detected_format = "report"
    # Analysis patterns
    elif any(p in q_lower for p in ["analyze", "analysis", "insights", "observations", "trends"]):
        detected_format = "analysis"
    # Text patterns
    elif any(p in q_lower for p in ["explain in text", "in text", "as text", "explain in words", "paragraph", "summary"]):
        detected_format = "text"
    # Table patterns
    elif any(p in q_lower for p in ["table", "tabular", "rows", "list"]):
        detected_format = "table"
    
    # If the user explicitly requested a non-auto format in the API payload, override it
    if request_format and request_format != "auto" and request_format in ["table", "bar_chart", "pie_chart", "text", "report", "analysis"]:
        detected_format = request_format

    # 2. Clean Question by removing formatting phrases
    # Order patterns from longest to shortest to avoid partial replacements
    remove_patterns = [
        r"\bgenerate a report on\b",
        r"\bgenerate report on\b",
        r"\bshow a report on\b",
        r"\bshow report on\b",
        r"\bget a report on\b",
        r"\bget report on\b",
        r"\b(detailed|structure|mini) report on\b",
        r"\breport on\b",
        r"\banalyze\b",
        r"\banalysis on\b",
        r"\banalysis of\b",
        r"\bwith analysis\b",
        r"\bas a bar graph\b",
        r"\bas bar graph\b",
        r"\bas a bar chart\b",
        r"\bas bar chart\b",
        r"\bas a bar\b",
        r"\bas bar\b",
        r"\bas a pie chart\b",
        r"\bas pie chart\b",
        r"\bas a pie\b",
        r"\bas pie\b",
        r"\bin a pie chart\b",
        r"\bin pie chart\b",
        r"\bexplain in text\b",
        r"\bin text\b",
        r"\bas text\b",
        r"\bexplain in words\b",
        r"\bin words\b",
        r"\bas a summary\b",
        r"\bas summary\b",
        r"\bas a table\b",
        r"\bas table\b",
        r"\bas tabular\b",
        r"\bas a list\b",
        r"\bas list\b",
        r"\bas rows\b"
    ]
    
    cleaned = question
    for pat in remove_patterns:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE)
    
    # Clean up double spaces, leading/trailing whitespace, and trailing helper punctuation
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Remove leading/trailing "on " or "of " if they were left over
    if cleaned.lower().startswith("on "):
        cleaned = cleaned[3:]
    if cleaned.lower().startswith("of "):
        cleaned = cleaned[3:]
    cleaned = cleaned.strip(" ,.?!")
    
    # Fallback to original if we cleaned it to nothing
    if not cleaned:
        cleaned = question
        
    return cleaned, detected_format
