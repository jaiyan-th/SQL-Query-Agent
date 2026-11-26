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


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=Path, default=Path(__file__).with_name("retail.sqlite"))
    seed(parser.parse_args().path)
