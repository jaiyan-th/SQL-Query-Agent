import re
import os
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from typing import Dict, Any, Optional

SUPPORTED_DATABASES = {
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "mariadb": "MariaDB",
    "sqlite": "SQLite",
    "mssql": "SQL Server"
}

# Regex validators for permitted prefixes
ALLOWED_SCHEME_PATTERNS = {
    "postgresql": r"^(postgresql|postgres|postgresql\+psycopg2)://",
    "mysql": r"^(mysql|mysql\+pymysql)://",
    "mariadb": r"^(mariadb|mariadb\+pymysql)://",
    "sqlite": r"^sqlite:///",
    "mssql": r"^mssql\+pyodbc://"
}

def sanitize_db_url(url: str) -> str:
    """
    Safely parses a database URL and URL-encodes the username and password 
    if they contain special characters (like @, :, /, etc.) that are not already encoded.
    Also strips unsupported query parameters like pgbouncer that cause psycopg2 errors.
    """
    url = url.strip()
    if not url:
        return url
        
    # Strip pgbouncer query parameter which is unrecognized by psycopg2 / libpq
    url = re.sub(r"[?&]pgbouncer=[^&]*", "", url)
    url = url.rstrip("?&")

    # Match scheme://
    scheme_match = re.match(r"^(\w+(?:\+\w+)?)(://)", url)
    if not scheme_match:
        return url

        
    scheme = scheme_match.group(1)
    rest = url[len(scheme_match.group(0)):]
    
    # Split auth/host part from path/query
    # Since sqlite:///path starts with /, the split leaves first item as empty
    parts = rest.split("/", 1)
    auth_host = parts[0]
    path_query = "/" + parts[1] if len(parts) > 1 else ""
    
    # Split auth and host
    if "@" in auth_host:
        # The last @ separates auth from host
        auth_part, host_part = auth_host.rsplit("@", 1)
    else:
        auth_part, host_part = "", auth_host
        
    if auth_part:
        if ":" in auth_part:
            username, password = auth_part.split(":", 1)
        else:
            username, password = auth_part, ""
            
        # Decode first to prevent double encoding
        username_decoded = urllib.parse.unquote(username)
        password_decoded = urllib.parse.unquote(password)
        
        # Encode username and password
        username_encoded = urllib.parse.quote_plus(username_decoded)
        password_encoded = urllib.parse.quote_plus(password_decoded)
        
        if password_encoded:
            auth_part_encoded = f"{username_encoded}:{password_encoded}"
        else:
            auth_part_encoded = username_encoded
            
        auth_host_encoded = f"{auth_part_encoded}@{host_part}"
    else:
        auth_host_encoded = host_part
        
    return f"{scheme}://{auth_host_encoded}{path_query}"

def validate_connection_details(database_type: str, database_url: str) -> str:
    """
    Validate the database scheme type and url structure.
    
    Returns:
        The normalized database provider name if valid.
    """
    db_type = database_type.lower().strip()
    if db_type not in SUPPORTED_DATABASES:
        raise ValueError(
            f"Unsupported database type: '{database_type}'. "
            f"QueryGen AI currently supports relational SQL databases only: "
            f"{', '.join(SUPPORTED_DATABASES.values())}."
        )

    # Sanitize/encode password in URL before checking prefix and format
    url = sanitize_db_url(database_url.strip())
    if not url:
        raise ValueError("Database connection URL cannot be empty.")

    pattern = ALLOWED_SCHEME_PATTERNS.get(db_type)
    if not pattern or not re.match(pattern, url):

        valid_formats = {
            "postgresql": "postgresql://username:password@host:5432/db",
            "mysql": "mysql+pymysql://username:password@host:3306/db",
            "mariadb": "mariadb+pymysql://username:password@host:3306/db",
            "sqlite": "sqlite:///path/to/database.db",
            "mssql": "mssql+pyodbc://username:password@host:1433/db?driver=..."
        }
        raise ValueError(
            f"Invalid connection URL format for {SUPPORTED_DATABASES[db_type]}. "
            f"Expected format: {valid_formats[db_type]}"
        )

    # SQLite Specific Check: Deny in-memory databases and require valid path
    if db_type == "sqlite":
        # Check if URL matches sqlite:///:memory: or sqlite://
        clean_path = url.replace("sqlite:///", "").split("?")[0]
        if not clean_path or clean_path.lower() in [":memory:", ""]:
            raise ValueError(
                "SQLite in-memory databases are restricted. "
                "Specify a valid local database file path (e.g. sqlite:///data.db)."
            )
        # Verify if parent folder exists
        parent_dir = os.path.dirname(clean_path)
        if parent_dir and not os.path.exists(parent_dir):
            raise ValueError(
                f"Local path location does not exist: '{parent_dir}'. "
                f"Create directory before connecting database."
            )

    return SUPPORTED_DATABASES[db_type]

def get_connection_metadata(database_type: str, database_url: str) -> Dict[str, Any]:
    """
    Extract masked URL, host, and database name properties from connection strings.
    """
    database_url = sanitize_db_url(database_url)
    provider = validate_connection_details(database_type, database_url)
    db_type = database_type.lower().strip()

    masked_url = ""
    host = ""
    database_name = ""

    if db_type == "sqlite":
        # sqlite:///path/to/database.db
        filepath = database_url.replace("sqlite:///", "").split("?")[0]
        database_name = os.path.basename(filepath)
        host = "local_file"
        masked_url = f"sqlite:///{database_name}"
    else:
        # standard parsed url: scheme://user:pass@host:port/database
        try:
            # Strip scheme to parse username:password@host:port/database
            cleaned_url = re.sub(r"^\w+(\+\w+)?://", "", database_url)
            
            # Extract database name and optional query params
            parts = cleaned_url.split("/")
            if len(parts) >= 2:
                database_name = parts[-1].split("?")[0]
                auth_host = "/".join(parts[:-1])
            else:
                auth_host = cleaned_url

            # Extract host from username:password@host:port
            if "@" in auth_host:
                host_port = auth_host.split("@")[-1]
            else:
                host_port = auth_host

            host = host_port.split(":")[0]
            masked_url = f"{db_type}://****@{host}/{database_name}"
        except Exception:
            masked_url = f"{db_type}://****@host/{database_name or 'db'}"
            host = "unknown_host"

    return {
        "database_type": db_type,
        "provider": provider,
        "masked_url": masked_url,
        "host": host,
        "database_name": database_name
    }

def create_user_engine(database_url: str) -> Engine:
    """
    Create a SQLAlchemy engine dynamically for user-connected databases.
    """
    database_url = sanitize_db_url(database_url)
    # Enforce safe connection timeout limits

    connect_args = {}
    if "postgresql" in database_url or "postgres" in database_url:
        connect_args = {"connect_timeout": 10}
    elif "mysql" in database_url or "mariadb" in database_url:
        connect_args = {"connect_timeout": 10}

    try:
        return create_engine(
            database_url,
            connect_args=connect_args,
            pool_recycle=1800,
            pool_timeout=15,
            pool_pre_ping=True
        )
    except Exception as e:
        raise Exception(f"Failed to create database engine: {str(e)}")

def test_user_connection(database_type: str, database_url: str) -> Dict[str, Any]:
    """
    Validate connection details and run check query (SELECT 1).
    """
    provider = validate_connection_details(database_type, database_url)
    metadata = get_connection_metadata(database_type, database_url)
    engine = create_user_engine(database_url)

    try:
        with engine.connect() as conn:
            # Run check query
            conn.execute(text("SELECT 1"))
        
        return {
            "connected": True,
            "database_type": metadata["database_type"],
            "provider": metadata["provider"],
            "masked_url": metadata["masked_url"],
            "host": metadata["host"],
            "database_name": metadata["database_name"],
            "read_only_mode": True,
            "message": f"Successfully connected to {metadata['provider']} database."
        }
    except Exception as e:
        raise Exception(f"Connection check query failed for {provider}: {str(e)}")

