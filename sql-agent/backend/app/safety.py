DIALECT = {"postgresql": "postgres", "sqlite": "sqlite", "mysql": "mysql"}
# Restrict database functions to ordinary analytics. Unknown routines may have side effects.
FUNCTIONS = set("""
ABS AVG CAST CEIL CEILING COALESCE CONCAT COUNT CURRENT_DATE CURRENT_TIMESTAMP
DATE DATE_ADD DATE_DIFF DATE_FORMAT DATE_TRUNC DATE_SUB DATETIME DENSE_RANK
EXTRACT FLOOR GROUP_CONCAT IF IIF IFNULL JULIANDAY LAG LEAD LENGTH LOWER
LTRIM MAX MIN MONTH NULLIF NUMBER_TO_STR POWER RANK REPLACE ROUND ROW_NUMBER
RTRIM STRFTIME STR_TO_DATE SUBSTR SUBSTRING SUM TIME_TO_STR TIMESTAMP_TRUNC
TO_CHAR TOTAL TRIM UPPER YEAR TS_OR_DS_TO_TIMESTAMP TS_OR_DS_TO_DATE
AND OR CASE EXISTS TIME_STR_TO_TIME UNIX_TO_TIME
""".split())


def validate(query, dialect):
    from sqlglot import exp, parse
    from sqlglot.errors import SqlglotError

    if not isinstance(query, str) or not query.strip() or len(query) > 16000:
        raise ValueError("Provide one SELECT statement under 16,000 characters.")
    parser = DIALECT[dialect]
    try:
        statements = parse(query, read=parser)
    except (SqlglotError, RecursionError) as exc:
        raise ValueError("SQL could not be parsed for this database.") from exc
    if len(statements) != 1 or not isinstance(statements[0], (exp.Select, exp.SetOperation)):
        raise ValueError("Only one read-only SELECT or WITH ... SELECT is allowed.")
    tree = statements[0]
    for node in tree.walk():
        if isinstance(node, (exp.DML, exp.DDL)) or node.key in {
            "into", "lock", "command", "pragma", "attach", "detach", "transaction",
            "set", "propertyeq", "sessionparameter", "parameter", "hint", "use", "copy",
        }:
            raise ValueError("SQL contains a disallowed operation.")
        if isinstance(node, exp.Table) and node.name.lower() in {"users"}:
            raise ValueError("Access to system authentication tables is disallowed.")
        if isinstance(node, exp.Func):
            fn = node.name if isinstance(node, exp.Anonymous) else node.sql_name()
            if fn.upper() not in FUNCTIONS:
                raise ValueError("Unsupported analytics function: " + fn[:64])
    # Execute the parser's serialization, without vendor-specific comment directives.
    return tree.sql(dialect=parser, comments=False)
