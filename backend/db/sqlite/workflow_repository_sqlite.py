import json
import uuid

from core.workflows.models import Workflow

from db.connection import get_connection
from db.repositories.workflow_repository import WorkflowRepository


class SQLiteWorkflowRepository(WorkflowRepository):

    def __init__(self):

        self.conn = get_connection()

        self._create_table()

    def _create_table(self):

        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflows (

                id TEXT PRIMARY KEY,

                type TEXT NOT NULL,

                name TEXT NOT NULL,

                description TEXT,

                graph TEXT NOT NULL,

                entry_point TEXT,

                config TEXT
            )
        """)

        self.conn.commit()

    def create(self, workflow: Workflow):

        if not workflow.id:
            workflow.id = str(uuid.uuid4())

        cursor = self.conn.cursor()

        cursor.execute(
            """
            INSERT INTO workflows (
                id,
                type,
                name,
                description,
                graph,
                entry_point,
                config
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                workflow.id,
                workflow.type,
                workflow.name,
                workflow.description,
                workflow.graph.model_dump_json(),
                workflow.entry_point,
                json.dumps(workflow.config),
            ))

        self.conn.commit()

        return workflow

    def get(self, workflow_id: str):

        cursor = self.conn.cursor()

        cursor.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id, ))

        row = cursor.fetchone()

        if not row:
            return None

        return Workflow(
            id=row["id"],
            type=row["type"],
            name=row["name"],
            description=row["description"],
            graph=json.loads(row["graph"]),
            entry_point=row["entry_point"],
            config=json.loads(row["config"] or "{}"),
        )

    def update(self, workflow_id: str, workflow: Workflow):

        cursor = self.conn.cursor()

        cursor.execute(
            """
            UPDATE workflows
            SET
                type = ?,
                name = ?,
                description = ?,
                graph = ?,
                entry_point = ?,
                config = ?
            WHERE id = ?
            """, (
                workflow.type,
                workflow.name,
                workflow.description,
                workflow.graph.model_dump_json(),
                workflow.entry_point,
                json.dumps(workflow.config),
                workflow_id,
            ))

        self.conn.commit()

        return workflow

    def list(self):

        cursor = self.conn.cursor()

        cursor.execute("SELECT * FROM workflows")

        rows = cursor.fetchall()

        return [self.get(row["id"]) for row in rows]

    def delete(self, workflow_id: str):

        cursor = self.conn.cursor()

        cursor.execute("DELETE FROM workflows WHERE id = ?", (workflow_id, ))

        self.conn.commit()
