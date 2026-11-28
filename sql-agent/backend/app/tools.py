import math
from datetime import date, time
from decimal import Decimal

from sqlalchemy import MetaData, Table, inspect, select
from sqlalchemy.exc import DBAPIError

from . import db
from .config import ROW_CAP
from .safety import validate


def tool(name, description, fields):
    return {"type": "function", "function": {"name": name, "description": description,
            "parameters": {"type": "object", "properties": fields, "required": list(fields),
                           "additionalProperties": False}}}


TOOLS = [
    tool("list_tables", "List available database tables.", {}),
    tool("describe_table", "Inspect columns, keys and up to three sample rows.", {"table_name": {"type": "string"}}),
    tool("run_sql", "Run one read-only SELECT. Returns up to 100 rows, or an error.", {"query": {"type": "string"}}),
]


SYSTEM_TABLES = {"users"}


def _allowed_tables(inspector):
    return [name for name in sorted(inspector.get_table_names()) if name.lower() not in SYSTEM_TABLES]


def schema():
    with db.read_connection() as conn:
        inspector = inspect(conn)
        return [{"name": name, "columns": [{"name": c["name"], "type": str(c["type"])}
                for c in inspector.get_columns(name)]} for name in _allowed_tables(inspector)]


def json_value(v):
    if v is None or isinstance(v, (str, int, bool)):
        return v
    if isinstance(v, (float, Decimal)):
        n = float(v)
        return n if math.isfinite(n) else None
    if isinstance(v, (date, time)):
        return v.isoformat()
    return "[binary]" if isinstance(v, bytes) else str(v)


def rows(result, cap):
    chunk = result.fetchmany(cap + 1)
    return {"columns": list(result.keys()), "rows": [[json_value(v) for v in r] for r in chunk[:cap]],
            "truncated": len(chunk) > cap}


def dispatch(name, args):
    with db.read_connection() as conn:
        inspector = inspect(conn)
        allowed = _allowed_tables(inspector)
        if name == "list_tables" and not args:
            return {"tables": allowed}
        if name == "describe_table" and set(args) == {"table_name"}:
            target = args["table_name"]
            if target not in allowed:
                raise ValueError("Unknown table. Check list_tables.")
            table = Table(target, MetaData(), autoload_with=conn, resolve_fks=False)
            return {"name": target, "columns": [{"name": c.name, "type": str(c.type)} for c in table.columns],
                    "primary_key": inspector.get_pk_constraint(target).get("constrained_columns", []),
                    "foreign_keys": [{"columns": k["constrained_columns"], "table": k["referred_table"],
                                      "target_columns": k["referred_columns"]} for k in inspector.get_foreign_keys(target)],
                    "sample": rows(conn.execute(select(table).limit(3)), 3)}
        if name == "run_sql" and set(args) == {"query"}:
            sql = validate(args["query"], conn.dialect.name)
            # Bind no parameters. Avoid interpolation of literal percent signs by DBAPI drivers.
            conn = conn.execution_options(stream_results=True, no_parameters=True)
            try:
                with conn.exec_driver_sql(sql) as result:
                    return {**rows(result, ROW_CAP), "sql": sql}
            except DBAPIError as exc:
                # Only expose query diagnostics; never connection strings, hostnames or driver reprs.
                if exc.connection_invalidated:
                    raise ValueError("Database connection was interrupted.") from exc
                msg = str(exc.orig).lower()
                for marker, advice in [
                    ("column", "Column error. Check column names, types and grouping."),
                    ("table", "Table error. Check table names and aliases."),
                    ("function", "Function unavailable. Check the SQL dialect."),
                    ("syntax", "Syntax error. Rewrite for this SQL dialect."),
                    ("ambiguous", "Ambiguous reference. Qualify the column with its table."),
                    ("interrupt", "Query timed out. Simplify the query."),
                    ("timeout", "Query timed out. Simplify the query."),
                ]:
                    if marker in msg:
                        raise ValueError(advice) from exc
                raise ValueError("Database rejected the query. Inspect the schema and revise.") from exc
        raise ValueError("Unknown tool or invalid arguments.")
