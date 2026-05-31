import json
import uuid

from core.workflows.message_models import Message

from db.connection import get_connection
from db.repositories.message_repository import MessageRepository


class SQLiteMessageRepository(MessageRepository):

    def __init__(self):

        self.conn = get_connection()

        self._create_table()

    def _create_table(self):

        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (

                id TEXT PRIMARY KEY,

                run_id TEXT NOT NULL,

                session_id TEXT,

                from_node TEXT,

                to_node TEXT,

                content TEXT,

                metadata TEXT,

                created_at TEXT
            )
        """)

        self.conn.commit()

        try:
            cursor.execute("ALTER TABLE messages ADD COLUMN session_id TEXT")
            self.conn.commit()
        except Exception:
            pass

    def create(self, message: Message):

        if not message.id:
            message.id = str(uuid.uuid4())

        cursor = self.conn.cursor()

        cursor.execute(
            """
            INSERT INTO messages (
                id,
                run_id,
                session_id,
                from_node,
                to_node,
                content,
                metadata,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                message.id,
                message.run_id,
                message.session_id,
                message.from_node,
                message.to_node,
                message.content,
                json.dumps(message.metadata),
                message.created_at.isoformat(),
            ))

        self.conn.commit()

        return message

    def list_by_run(self, run_id: str):

        cursor = self.conn.cursor()

        cursor.execute(
            """
            SELECT * FROM messages
            WHERE run_id = ?
            ORDER BY created_at ASC
            """, (run_id, ))

        rows = cursor.fetchall()

        return [
            Message(
                id=row["id"],
                run_id=row["run_id"],
                session_id=row["session_id"],
                from_node=row["from_node"],
                to_node=row["to_node"],
                content=row["content"],
                metadata=json.loads(row["metadata"] or "{}"),
                created_at=row["created_at"],
            ) for row in rows
        ]

    def list_by_session(self, session_id: str, limit: int = 20):

        cursor = self.conn.cursor()

        cursor.execute(
            """
            SELECT * FROM messages
            WHERE session_id = ?
            ORDER BY created_at ASC
            LIMIT ?
            """, (session_id, limit))

        rows = cursor.fetchall()

        return [
            Message(
                id=row["id"],
                run_id=row["run_id"],
                session_id=row["session_id"],
                from_node=row["from_node"],
                to_node=row["to_node"],
                content=row["content"],
                metadata=json.loads(row["metadata"] or "{}"),
                created_at=row["created_at"],
            ) for row in rows
        ]
