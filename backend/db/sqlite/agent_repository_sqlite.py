import json
import uuid

from core.agents.models import Agent

from db.connection import get_connection
from db.repositories.agent_repository import AgentRepository


class SQLiteAgentRepository(AgentRepository):

    def __init__(self):

        self.conn = get_connection()

        self._create_table()

    def _create_table(self):

        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agents (

                id TEXT PRIMARY KEY,

                name TEXT NOT NULL,

                description TEXT,

                role TEXT,

                system_prompt TEXT NOT NULL,

                model TEXT NOT NULL,

                tools TEXT,

                memory_config TEXT,

                guardrails TEXT,

                channels TEXT,

                schedule TEXT,

                config TEXT
            )
        """)

        try:
            cursor.execute("ALTER TABLE agents ADD COLUMN channels TEXT")
        except Exception:
            pass

        try:
            cursor.execute("ALTER TABLE agents ADD COLUMN schedule TEXT")
        except Exception:
            pass

        self.conn.commit()

    def create(self, agent: Agent) -> Agent:

        if not agent.id:
            agent.id = str(uuid.uuid4())

        cursor = self.conn.cursor()

        cursor.execute(
            """
            INSERT INTO agents (
                id,
                name,
                description,
                role,
                system_prompt,
                model,
                tools,
                memory_config,
                guardrails,
                channels,
                config
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent.id,
                agent.name,
                agent.description,
                agent.role,
                agent.system_prompt,
                json.dumps(agent.model.model_dump()),
                json.dumps([t.model_dump() for t in agent.tools]),
                json.dumps(agent.memory_config),
                json.dumps(agent.guardrails),
                json.dumps(agent.channels),
                json.dumps(agent.config),
            ))

        self.conn.commit()

        return agent

    def get(self, agent_id: str):

        cursor = self.conn.cursor()

        cursor.execute("SELECT * FROM agents WHERE id = ?", (agent_id, ))

        row = cursor.fetchone()

        if not row:
            return None

        channels = []
        try:
            channels = json.loads(row["channels"] or "[]")
        except Exception:
            pass

        return Agent(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            role=row["role"],
            system_prompt=row["system_prompt"],
            model=json.loads(row["model"]),
            tools=json.loads(row["tools"] or "[]"),
            memory_config=json.loads(row["memory_config"] or "{}"),
            guardrails=json.loads(row["guardrails"] or "{}"),
            channels=channels,
            config=json.loads(row["config"] or "{}"),
        )

    def update(self, agent_id: str, agent: Agent):

        cursor = self.conn.cursor()

        cursor.execute(
            """
            UPDATE agents
            SET
                name = ?,
                description = ?,
                role = ?,
                system_prompt = ?,
                model = ?,
                tools = ?,
                memory_config = ?,
                guardrails = ?,
                channels = ?,
                config = ?
            WHERE id = ?
            """, (
                agent.name,
                agent.description,
                agent.role,
                agent.system_prompt,
                json.dumps(agent.model.model_dump()),
                json.dumps([t.model_dump() for t in agent.tools]),
                json.dumps(agent.memory_config),
                json.dumps(agent.guardrails),
                json.dumps(agent.channels),
                json.dumps(agent.config),
                agent_id,
            ))

        self.conn.commit()

        return agent

    def list(self):

        cursor = self.conn.cursor()

        cursor.execute("SELECT * FROM agents")

        rows = cursor.fetchall()

        return [self.get(row["id"]) for row in rows]

    def delete(self, agent_id: str):

        cursor = self.conn.cursor()

        cursor.execute("DELETE FROM agents WHERE id = ?", (agent_id, ))

        self.conn.commit()
