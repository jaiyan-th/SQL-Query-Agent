"""Create the demo beside this file. Existing databases are preserved."""
import argparse
import os
import random
import sqlite3
import tempfile
from datetime import date, timedelta
from pathlib import Path

CUSTOMERS = [
    ("Ananya Rao", "Karnataka"), ("Arjun Kumar", "Tamil Nadu"), ("Meera Nair", "Kerala"),
    ("Kavya Iyer", "Tamil Nadu"), ("Aman Shah", "Gujarat"), ("Ishaan Joshi", "Maharashtra"),
    ("Divya Raman", "Tamil Nadu"), ("Tara Singh", "Punjab"), ("Zoya Khan", "Delhi"),
    ("Ravi Reddy", "Telangana"), ("Riya Sen", "West Bengal"), ("Mohan Das", "Odisha"),
    ("Leela Menon", "Kerala"), ("Dev Patel", "Gujarat"), ("Nila Anand", "Tamil Nadu"),
    ("Sana Ali", "Karnataka"), ("Kabir Jain", "Rajasthan"), ("Anil Mishra", "Uttar Pradesh"),
]
PRODUCTS = [("Filter coffee", "Pantry", 325), ("Cotton throw", "Textiles", 1499),
            ("Brass lamp", "Home", 1890), ("Tea sampler", "Pantry", 449),
            ("Desk organiser", "Office", 699), ("Steel flask", "Kitchen", 850),
            ("Handloom scarf", "Textiles", 1199), ("Ceramic mug", "Kitchen", 375)]


def seed(path):
    path = Path(path).resolve()
    if path.exists():
        print("Database already exists. Preserved " + str(path))
        return
    rng = random.Random(42)
    today = date.today()
    start = date(today.year - 1, 1, 1)
    with tempfile.TemporaryDirectory(dir=path.parent) as tmp:
        staged = Path(tmp) / "seed.sqlite"
        conn = sqlite3.connect(staged)
        try:
            conn.executescript("""
                PRAGMA foreign_keys=ON;
                CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, state TEXT NOT NULL);
                CREATE TABLE products (product_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price_inr INTEGER NOT NULL);
                CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers, order_date DATE NOT NULL, total_inr INTEGER NOT NULL);
                CREATE TABLE order_items (order_id INTEGER REFERENCES orders, product_id INTEGER REFERENCES products, quantity INTEGER NOT NULL, unit_price_inr INTEGER NOT NULL, PRIMARY KEY (order_id, product_id));
            """)
            conn.executemany("INSERT INTO customers(name,state) VALUES (?,?)", CUSTOMERS)
            conn.executemany("INSERT INTO products(name,category,price_inr) VALUES (?,?,?)", PRODUCTS)
            for order_id in range(1, 361):
                day = start + timedelta(days=(order_id-1)*(today-start).days//359)
                items = [(order_id, p+1, rng.randint(1,4), PRODUCTS[p][2]) for p in rng.sample(range(len(PRODUCTS)), rng.randint(1,3))]
                total = sum(q*price for _, _, q, price in items)
                conn.execute("INSERT INTO orders VALUES (?,?,?,?)", (order_id, rng.randint(1,len(CUSTOMERS)), day.isoformat(), total))
                conn.executemany("INSERT INTO order_items VALUES (?,?,?,?)", items)
            conn.commit()
        finally:
            conn.close()
        # Publish a completely seeded file without overwriting a concurrent seed.
        try:
            if os.name == "nt":
                staged.rename(path)
            else:
                os.link(staged, path)
        except FileExistsError:
            print("Another process already seeded the database.")
            return
    print(f"Created {path} with 18 customers, 8 products and 360 orders. Amounts are INR.")


def seed_postgres(db_url: str):
    """Seed the retail schema and sample data into PostgreSQL using a direct connection."""
    from dotenv import load_dotenv
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.engine import make_url

    url = make_url(db_url)
    if url.drivername in {"postgresql", "postgres"}:
        url = url.set(drivername="postgresql+psycopg2")

    engine = create_engine(url, pool_pre_ping=True)
    try:
        if "customers" in inspect(engine).get_table_names():
            print("PostgreSQL database already has retail tables. Preserved existing data.")
            return
        rng = random.Random(42)
        today = date.today()
        start = date(today.year - 1, 1, 1)
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE customers (
                    customer_id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    state TEXT NOT NULL
                );
                CREATE TABLE products (
                    product_id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    price_inr INTEGER NOT NULL
                );
                CREATE TABLE orders (
                    order_id INTEGER PRIMARY KEY,
                    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
                    order_date DATE NOT NULL,
                    total_inr INTEGER NOT NULL
                );
                CREATE TABLE order_items (
                    order_id INTEGER REFERENCES orders(order_id),
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL,
                    unit_price_inr INTEGER NOT NULL,
                    PRIMARY KEY (order_id, product_id)
                );
            """))
            from psycopg2.extras import execute_values

            raw_conn = conn.connection.driver_connection
            with raw_conn.cursor() as cur:
                execute_values(
                    cur,
                    "INSERT INTO customers (customer_id, name, state) VALUES %s",
                    [(i + 1, name, state) for i, (name, state) in enumerate(CUSTOMERS)],
                )
                execute_values(
                    cur,
                    "INSERT INTO products (product_id, name, category, price_inr) VALUES %s",
                    [(i + 1, name, cat, price) for i, (name, cat, price) in enumerate(PRODUCTS)],
                )
                order_rows = []
                item_rows = []
                for order_id in range(1, 361):
                    day = start + timedelta(days=(order_id - 1) * (today - start).days // 359)
                    items = [(order_id, p + 1, rng.randint(1, 4), PRODUCTS[p][2]) for p in rng.sample(range(len(PRODUCTS)), rng.randint(1, 3))]
                    total = sum(q * price for _, _, q, price in items)
                    order_rows.append((order_id, rng.randint(1, len(CUSTOMERS)), day, total))
                    item_rows.extend(items)
                execute_values(
                    cur,
                    "INSERT INTO orders (order_id, customer_id, order_date, total_inr) VALUES %s",
                    order_rows,
                    page_size=500,
                )
                execute_values(
                    cur,
                    "INSERT INTO order_items (order_id, product_id, quantity, unit_price_inr) VALUES %s",
                    item_rows,
                    page_size=1000,
                )
        print("Seeded PostgreSQL with 18 customers, 8 products and 360 orders. Amounts are INR.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=Path, default=Path(__file__).with_name("retail.sqlite"))
    parser.add_argument("--db-url", default="")
    args = parser.parse_args()
    if args.db_url:
        seed_postgres(args.db_url)
    else:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).with_name(".env"))
        load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")
        target_url = os.getenv("DATABASE_URL_UNPOOLED") or os.getenv("DB_URL") or os.getenv("DATABASE_URL") or ""
        if target_url.startswith(("postgresql://", "postgres://", "postgresql+psycopg2://")):
            seed_postgres(target_url)
        else:
            seed(args.path)
