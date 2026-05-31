import json
import uuid

from core.workflows.run_models import WorkflowRun

from db.connection import get_connection
from db.repositories.workflow_run_repository import WorkflowRunRepository


class SQLiteWorkflowRunRepository(WorkflowRunRepository):

    def __init__(self):

        self.conn = get_connection()

        self._create_table()

    def _create_table(self):

        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflow_runs (

                id TEXT PRIMARY KEY,

                workflow_id TEXT NOT NULL,

                status TEXT,

                state TEXT,

                messages TEXT,

                logs TEXT,

                token_usage TEXT,

                started_at TEXT,

                completed_at TEXT
            )
        """)

        self.conn.commit()

    def create(self, run: WorkflowRun):

        if not run.id:
            run.id = str(uuid.uuid4())

        cursor = self.conn.cursor()

        cursor.execute(
            """
            INSERT INTO workflow_runs (
                id,
                workflow_id,
                status,
                state,
                messages,
                logs,
                token_usage,
                started_at,
                completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run.id,
                run.workflow_id,
                run.status,
                json.dumps(run.state),
                json.dumps(run.messages),
                json.dumps(run.logs),
                json.dumps(run.token_usage),
                run.started_at.isoformat(),
                run.completed_at.isoformat() if run.completed_at else None,
            ))

        self.conn.commit()

        return run

    def get(self, run_id: str):

        cursor = self.conn.cursor()

        cursor.execute("SELECT * FROM workflow_runs WHERE id = ?", (run_id, ))

        row = cursor.fetchone()

        if not row:
            return None

        return WorkflowRun(
            id=row["id"],
            workflow_id=row["workflow_id"],
            status=row["status"],
            state=json.loads(row["state"] or "{}"),
            messages=json.loads(row["messages"] or "[]"),
            logs=json.loads(row["logs"] or "[]"),
            token_usage=json.loads(row["token_usage"] or "{}"),
            started_at=row["started_at"],
            completed_at=row["completed_at"],
        )

    def update(self, run_id: str, run: WorkflowRun):

        cursor = self.conn.cursor()

        cursor.execute(
            """
            UPDATE workflow_runs
            SET
                status = ?,
                state = ?,
                messages = ?,
                logs = ?,
                token_usage = ?,
                completed_at = ?
            WHERE id = ?
            """, (
                run.status,
                json.dumps(run.state),
                json.dumps(run.messages),
                json.dumps(run.logs),
                json.dumps(run.token_usage),
                run.completed_at.isoformat() if run.completed_at else None,
                run_id,
            ))

        self.conn.commit()

        return run

    def list(self):

        cursor = self.conn.cursor()

        cursor.execute("SELECT * FROM workflow_runs")

        rows = cursor.fetchall()

        return [self.get(row["id"]) for row in rows]
