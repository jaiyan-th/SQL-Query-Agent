"""Offline acceptance suite. Groq is scripted; SQL runs on a real read-only seed database."""
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from groq.types.chat import ChatCompletionMessage
from httpx import Request, Response
from groq import AuthenticationError, RateLimitError
from sqlalchemy.exc import DBAPIError

from app import agent, config, db
from app.main import app
from app.safety import validate
from app.tools import dispatch
from seed_db import seed


def tool_reply(*calls):
    return ChatCompletionMessage(role="assistant", tool_calls=[
        {"type": "function", "id": "call_" + str(i), "function": {"name": name, "arguments": json.dumps(args)}}
        for i, (name, args) in enumerate(calls)])


def answer(text):
    return ChatCompletionMessage(role="assistant", content=text)


class AgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        target = Path(cls.temp.name) / "sales.sqlite"
        seed(target)
        cls.engine = db.make_engine("sqlite:///" + target.as_posix())
        cls.replace = patch.object(db, "engine", cls.engine)
        cls.replace.start()
        cls.api = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.api.close()
        cls.replace.stop()
        cls.engine.dispose()
        cls.temp.cleanup()

    def setUp(self):
        agent.reset("suite")
        key = patch.object(config, "GROQ_API_KEY", "local-test-value")
        sdk = patch.object(agent, "Groq")
        key.start()
        self.mock = sdk.start().return_value.__enter__.return_value.chat.completions.create
        self.addCleanup(key.stop)
        self.addCleanup(sdk.stop)

    def script(self, *replies):
        self.mock.side_effect = [MagicMock(choices=[MagicMock(message=r)]) for r in replies]

    def chat(self, prompt):
        return self.api.post("/api/chat", json={"session_id": "suite", "message": prompt})

    def test_count_follow_up_and_reset(self):
        self.script(tool_reply(("list_tables", {}), ("describe_table", {"table_name":"customers"})),
                    tool_reply(("run_sql", {"query":"SELECT COUNT(*) AS n FROM customers"})),
                    answer("There are 18 customers."))
        first = self.chat("How many customers do we have?").json()
        self.assertEqual(first["rows"], [[18]])
        sent = self.mock.call_args.kwargs
        self.assertEqual(sent["messages"][-1]["role"], "tool")
        self.assertEqual(sent["messages"][-1]["tool_call_id"], "call_0")
        self.assertEqual(len(sent["tools"]), 3)
        self.assertNotIn(config.GROQ_API_KEY, str(sent))
        self.assertNotIn(str(self.engine.url), str(sent))
        self.script(tool_reply(("list_tables", {}), ("describe_table", {"table_name":"customers"})),
                    tool_reply(("run_sql", {"query":"SELECT name FROM customers WHERE state = 'Tamil Nadu'"})),
                    answer("Four customers are from Tamil Nadu."))
        follow = self.chat("Only show customers from Tamil Nadu").json()
        self.assertEqual(len(follow["rows"]), 4)
        self.assertIn("How many customers", str(self.mock.call_args.kwargs["messages"]))
        self.api.post("/api/reset", json={"session_id":"suite"}).raise_for_status()
        self.assertNotIn("suite", agent.sessions)

    def test_seed_queries_and_schema(self):
        top = dispatch("run_sql", {"query": "SELECT c.name, SUM(o.total_inr) AS spend FROM customers c JOIN orders o ON c.customer_id=o.customer_id GROUP BY c.customer_id,c.name ORDER BY spend DESC LIMIT 5"})
        self.assertEqual(len(top["rows"]), 5)
        self.assertEqual(top["rows"], sorted(top["rows"], key=lambda r: -r[1]))
        year = date.today().year
        trend = dispatch("run_sql", {"query": f"SELECT strftime('%Y-%m',order_date) AS month,SUM(total_inr) AS revenue FROM orders WHERE order_date >= '{year}-01-01' GROUP BY month ORDER BY month"})
        self.assertTrue(trend["rows"])
        self.assertIsInstance(trend["rows"][0][1], int)
        self.assertEqual(len(self.api.get("/api/schema").json()["tables"]), 4)
        desc = dispatch("describe_table", {"table_name":"orders"})
        self.assertEqual(len(desc["sample"]["rows"]), 3)
        self.assertTrue(desc["foreign_keys"])
        self.assertEqual(self.api.get("/api/health").json()["status"], "ok")

    def test_retry_and_last_success(self):
        self.script(tool_reply(("list_tables", {}), ("describe_table", {"table_name":"orders"})),
                    tool_reply(("run_sql", {"query":"SELECT wrong_name FROM orders"})),
                    tool_reply(("run_sql", {"query":"SELECT COUNT(*) FROM orders"})),
                    answer("There are 360 orders."))
        result = self.chat("Count orders").json()
        self.assertEqual(result["rows"], [[360]])
        self.assertEqual(len(result["sql_used"]), 1)
        self.assertIn("error", self.mock.call_args.kwargs["messages"][-3]["content"])

    def test_safety(self):
        for query in ["INSERT INTO orders VALUES(1,1,1,1)", "UPDATE orders SET total_inr=0", "DELETE FROM orders",
                      "DROP TABLE orders", "ALTER TABLE orders RENAME TO sales", "CREATE TABLE sales(x int)",
                      "TRUNCATE TABLE orders", "PRAGMA user_version", "ATTACH DATABASE 'other.db' AS other",
                      "SELECT 1; SELECT 2"]:
            with self.subTest(query=query), self.assertRaises(ValueError):
                validate(query, "sqlite")
        self.script(answer("I cannot modify records."))
        self.assertIn("only read", self.chat("Delete all orders").json()["answer"])
        self.assertEqual(dispatch("run_sql", {"query":"WITH t AS (SELECT * FROM orders) SELECT COUNT(*) FROM t"})["rows"], [[360]])
        with self.assertRaises(ValueError):
            dispatch("describe_table", {"table_name":"missing"})
        self.assertEqual(len(dispatch("run_sql", {"query":"SELECT order_id FROM orders"})["rows"]), 100)

    def test_provider_errors(self):
        for exc, status in [(AuthenticationError,401), (RateLimitError,429)]:
            self.mock.side_effect = exc("provider error", response=Response(status, request=Request("POST","https://example.test")), body={})
            with patch.object(agent.time, "sleep"):
                response = self.chat("Count orders")
            self.assertEqual(response.status_code, status)
            self.assertTrue(response.json()["detail"])

    def test_workspace_auth_and_readiness(self):
        with patch.object(config, "WORKSPACE_USER", "analyst"), patch.object(config, "WORKSPACE_PASSWORD", "test-password"):
            self.assertEqual(self.api.get("/api/schema").status_code, 401)
            self.assertEqual(self.api.post("/api/reset", json={"session_id":"suite"}).status_code, 401)
            reply = self.api.get("/api/schema", auth=("analyst", "test-password"))
            self.assertEqual(reply.status_code, 200)
            self.assertEqual(reply.headers["Cache-Control"], "no-store")
            self.assertEqual(self.api.get("/api/ready").status_code, 200)
            with patch.object(config, "GROQ_API_KEY", ""):
                self.assertEqual(self.api.get("/api/ready").status_code, 503)

    def test_failed_sql_cannot_be_reported_as_an_answer(self):
        self.script(tool_reply(("list_tables", {}), ("describe_table", {"table_name":"orders"})),
                    tool_reply(("run_sql", {"query":"SELECT missing_column FROM orders"})),
                    answer("There are 149 orders."))
        result = self.chat("Count the orders").json()
        self.assertNotIn("149", result["answer"])
        self.assertEqual(result["rows"], [])

    def test_truncation_is_visible_to_both_model_and_ui(self):
        self.script(tool_reply(("list_tables", {}), ("describe_table", {"table_name":"orders"})),
                    tool_reply(("run_sql", {"query":"SELECT order_id FROM orders ORDER BY order_id"})),
                    answer("Showing the first 100 orders."))
        result = self.chat("List the orders").json()
        self.assertTrue(result["truncated"])
        self.assertTrue(json.loads(self.mock.call_args.kwargs["messages"][-1]["content"])["truncated"])
        self.assertEqual(len(result["rows"]), 100)

    def test_schema_tools_and_read_only_connection(self):
        self.assertEqual(self.api.get("/api/health").status_code, 200)
        self.assertEqual(len(self.api.get("/api/schema").json()["tables"]), 4)
        before = dispatch("describe_table", {"table_name":"orders"})
        self.assertEqual(before["primary_key"], ["order_id"])
        self.assertEqual(len(before["sample"]["rows"]), 3)
        self.assertEqual(before["foreign_keys"][0]["table"], "customers")
        with self.assertRaises(ValueError):
            dispatch("describe_table", {"table_name":"unlisted"})
        with db.read_connection() as conn, self.assertRaises(DBAPIError):
            conn.exec_driver_sql("DELETE FROM orders")
        with db.read_connection() as conn:
            self.assertEqual(conn.exec_driver_sql("SELECT COUNT(*) FROM orders").scalar_one(), 360)

    def test_tool_feedback_and_refusal(self):
        self.script(tool_reply(("list_tables", {})), answer("There are four tables."))
        result = self.chat("What tables are available?")
        self.assertEqual(result.status_code, 200)
        context = self.mock.call_args.kwargs["messages"]
        self.assertEqual(json.loads(context[-1]["content"])["tables"], ["customers","order_items","orders","products"])
        self.assertEqual(context[-1]["tool_call_id"], context[-2]["tool_calls"][0]["id"])
        self.script(tool_reply(("run_sql", {"query":"DELETE FROM orders"})), answer("I cannot delete orders."))
        refusal = self.chat("Delete all orders").json()
        self.assertIn("only read", refusal["answer"])
        self.assertEqual(refusal["sql_used"], [])
        self.api.post("/api/reset", json={"session_id":"suite"}).raise_for_status()
        self.assertNotIn("suite", agent.sessions)


if __name__ == "__main__":
    unittest.main()
