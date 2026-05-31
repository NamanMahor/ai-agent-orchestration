import asyncio
import unittest

from core.agents.models import Agent
from core.llm.models import ModelConfig
from core.runtime.workflow_runtime import workflow_runtime
from core.workflows.models import (
    Workflow,
    WorkflowEdge,
    WorkflowGraph,
    WorkflowNode,
)
from db.manager import agent_repo, message_repo, workflow_repo


class TestPlatform(unittest.TestCase):

    def setUp(self):

        self.model_config = ModelConfig(provider="mock", name="test-model")

        self.agent = Agent(
            name="Test Researcher",
            role="Researcher",
            system_prompt="Test Prompt",
            model=self.model_config,
            tools=[],
        )

    def test_agent_creation(self):

        created = agent_repo.create(self.agent)

        self.assertIsNotNone(created.id)

        fetched = agent_repo.get(created.id)

        self.assertEqual(fetched.name, "Test Researcher")

        self.assertEqual(fetched.role, "Researcher")

        agent_repo.delete(created.id)

    def test_workflow_creation(self):

        nodes = [WorkflowNode(id="n1", type="agent", ref="test-ref")]

        edges = [WorkflowEdge(source="n1", target="n2")]

        wf = Workflow(
            name="Test Workflow",
            graph=WorkflowGraph(nodes=nodes, edges=edges),
            entry_point="n1",
        )

        created = workflow_repo.create(wf)

        self.assertIsNotNone(created.id)

        fetched = workflow_repo.get(created.id)

        self.assertEqual(fetched.name, "Test Workflow")

        self.assertEqual(len(fetched.graph.nodes), 1)

        workflow_repo.delete(created.id)

    def test_workflow_execution(self):

        async def run_test():

            agent = Agent(
                name="Test Runner Agent",
                role="Researcher",
                system_prompt="You are a researcher agent.",
                model=ModelConfig(provider="mock", name="test-model"),
                tools=[],
            )

            agent = agent_repo.create(agent)

            nodes = [
                WorkflowNode(id="n1", type="agent", ref=agent.id),
                WorkflowNode(id="n2", type="end"),
            ]

            edges = [WorkflowEdge(source="n1", target="n2")]

            wf = Workflow(
                name="Async Test Run Workflow",
                graph=WorkflowGraph(nodes=nodes, edges=edges),
                entry_point="n1",
            )

            wf = workflow_repo.create(wf)

            result = await workflow_runtime.execute(
                wf, "Run workflow execution tests.")

            self.assertEqual(result["status"], "completed")

            self.assertIsNotNone(result["run_id"])

            self.assertTrue(len(result["history"]) > 0)

            messages = message_repo.list_by_run(result["run_id"])

            self.assertTrue(len(messages) > 0)

            self.assertIn("Mock", messages[0].content)

            agent_repo.delete(agent.id)

            workflow_repo.delete(wf.id)

        asyncio.run(run_test())
