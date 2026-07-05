from typing import List, Dict, Any, Optional, Tuple

def is_numeric(value: Any) -> bool:
    """Helper to check if a value is numeric (int or float)."""
    if isinstance(value, (int, float)):
        return True
    # Try converting string to float
    if isinstance(value, str):
        try:
            float(value)
            return True
        except ValueError:
            return False
    return False

def get_numeric_value(value: Any) -> float:
    """Helper to get float representation of a numeric value."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0
    return 0.0

def analyze_columns(columns: List[str], rows: List[List[Any]]) -> Tuple[Optional[int], Optional[int]]:
    """
    Find the first text (category) column index and the first numeric value column index.
    
    Returns:
        A tuple of (text_col_idx, numeric_col_idx)
    """
    if not columns or not rows:
        return None, None
        
    text_idx = None
    numeric_idx = None
    
    # Check first row's data types
    first_row = rows[0]
    
    # 1. Find first numeric column
    for idx, val in enumerate(first_row):
        if is_numeric(val):
            numeric_idx = idx
            break
            
    # 2. Find first text column (not the numeric one, and typically string/varchar)
    for idx, val in enumerate(first_row):
        if idx != numeric_idx:
            # We treat any non-numeric or string column as a category
            text_idx = idx
            break
            
    return text_idx, numeric_idx

def build_chart_config(
    columns: List[str],
    rows: List[List[Any]],
    desired_format: str
) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
    """
    Build chart configuration based on SQL query results.
    
    Args:
        columns: List of column names.
        rows: List of rows (each row is a list of cell values).
        desired_format: The format requested ("bar_chart" or "pie_chart").
        
    Returns:
        A tuple of (final_format, chart_config_dict, fallback_message).
    """
    if not rows or not columns:
        return "table", None, "No data available to generate a chart."
        
    # Analyze columns to identify category and numeric values
    text_idx, numeric_idx = analyze_columns(columns, rows)
    
    if text_idx is None or numeric_idx is None:
        return "table", None, "Charts require at least one category (text) column and one numeric column."
        
    x_or_name_key = columns[text_idx]
    y_or_value_key = columns[numeric_idx]
    
    chart_data = []
    
    if desired_format == "bar_chart":
        # Limit to top 10 rows
        target_rows = rows[:10]
        for r in target_rows:
            chart_data.append({
                x_or_name_key: str(r[text_idx]),
                y_or_value_key: get_numeric_value(r[numeric_idx])
            })
            
        config = {
            "type": "bar",
            "xKey": x_or_name_key,
            "yKey": y_or_value_key,
            "data": chart_data
        }
        return "bar_chart", config, None
        
    elif desired_format == "pie_chart":
        # Limit to top 8 slices
        target_rows = rows[:8]
        for r in target_rows:
            chart_data.append({
                x_or_name_key: str(r[text_idx]),
                y_or_value_key: get_numeric_value(r[numeric_idx])
            })
            
        config = {
            "type": "pie",
            "nameKey": x_or_name_key,
            "valueKey": y_or_value_key,
            "data": chart_data
        }
        return "pie_chart", config, None
        
    return "table", None, None
