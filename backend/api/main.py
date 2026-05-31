import os
import logging
import httpx

from dotenv import load_dotenv

from fastapi import FastAPI

from api.routes.agents import router as agents_router
from api.routes.workflows import router as workflows_router
from api.routes.templates import router as templates_router
from api.routes.tools import router as tools_router
from api.routes.channels import router as channels_router
from api.routes.workflow_runs import (
    router as workflow_runs_router,
)
from api.websocket.runs import (
    router as websocket_router,
)
from api.routes.workflow_execution import ( router as workflow_execution_router, )
from api.routes.messages import router as messages_router
from api.webhooks.telegram import (
    router as telegram_router,
)
from fastapi.middleware.cors import ( CORSMiddleware, )
from core.runtime.scheduler import scheduler

# Configure root logger so all loggers in the project output to stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="AI Agent Orchestration Platform"
)

app.add_middleware( CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"], )

app.include_router(agents_router)

app.include_router(workflows_router)

app.include_router(templates_router)

app.include_router(workflow_runs_router)

app.include_router(tools_router)

app.include_router(channels_router)

app.include_router(messages_router)

app.include_router( workflow_execution_router )

app.include_router(websocket_router)

app.include_router(telegram_router)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

@app.get("/")
def root():
    return {
        "status": "running"
    }
@app.on_event("startup")
async def startup_event():

    await scheduler.start()
    logger.info("Background scheduler started successfully.")

    await setup_telegram_webhook()

    # Below code is just for one time setup.
    try:
        seed_database()
        logger.info("Database seeded with default agents and templates successfully.")
    except Exception as e:
        logger.info(f"Failed to seed database: {e}")


@app.on_event("shutdown")
def shutdown_event():
    scheduler.stop()
    logger.info("Background scheduler stopped.")

async def setup_telegram_webhook():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    webhook_url = os.getenv("PUBLIC_WEBHOOK_URL")

    if token and webhook_url:
        url = (
            f"https://api.telegram.org/bot{token}/setWebhook"
            f"?url={webhook_url}/webhooks/telegram"
        )

        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=5)
            logger.info(f"Telegram webhook auto-registration: {res.json()}")

def seed_database():
    from db.manager import agent_repo, workflow_repo
    from core.agents.models import Agent
    from core.llm.models import ModelConfig
    from core.tools.models import ToolReference
    from core.workflows.models import Workflow, WorkflowNode, WorkflowEdge, WorkflowGraph

    existing_agents = agent_repo.list()
    researcher = next((a for a in existing_agents if "researcher" in a.name.lower()), None)
    writer = next((a for a in existing_agents if "writer" in a.name.lower()), None)
    editor = next((a for a in existing_agents if "editor" in a.name.lower()), None)

    if not researcher:
        researcher = Agent(
            name="AI Researcher",
            description="Collects facts and statistics on topics using live web search",
            role="Researcher",
            system_prompt="You are a meticulous AI Researcher. Analyze the request and gather key insights using the search tool. Once you have finished researching the topic and have the final findings.",
            model=ModelConfig(provider="ollama", name="llama3.1"),
            tools=[ToolReference(name="web_search")],
            memory_config={"type": "buffer"}
        )
        researcher = agent_repo.create(researcher)

    if not writer:
        writer = Agent(
            name="Content Writer",
            description="Synthesizes research into high-quality drafts",
            role="Writer",
            system_prompt="You are an expert Content Writer. Generate a comprehensive draft based on the research insights provided. Add headings and markdown. When your draft is complete.",
            model=ModelConfig(provider="ollama", name="llama3.1"),
            memory_config={"type": "buffer"}
        )
        writer = agent_repo.create(writer)

    if not editor:
        editor = Agent(
            name="Chief Editor",
            description="Polishes content and reviews for final approval",
            role="Editor",
            system_prompt="You are a Chief Editor. Review the content for flow, polish, and tone and Genrate polish content.",
            model=ModelConfig(provider="ollama", name="llama3.1"),
            channels=["telegram"],
            memory_config={"type": "buffer"}
        )
        editor = agent_repo.create(editor)

    # Clean old templates to force re-seeding with updated graph architectures
    existing_workflows = workflow_repo.list()
    for wf in existing_workflows:
        if wf.type == "template":
            workflow_repo.delete(wf.id)

    # 1. Content Creation Pipeline (researches, drafts, checks quality, edits, and finishes)
    t1_nodes = [
        WorkflowNode(id="n0", type="start", config={"position": {"x": 50, "y": 150}, "label": "Start"}),
        WorkflowNode(id="n1", type="agent", ref=researcher.id, config={"position": {"x": 200, "y": 150}, "label": "AI Researcher"}),
        WorkflowNode(id="n2", type="agent", ref=writer.id, config={"position": {"x": 450, "y": 150}, "label": "Content Writer"}),
        WorkflowNode(id="n3", type="condition", config={"position": {"x": 700, "y": 150}, "label": "Quality Check"}),
        WorkflowNode(id="n4", type="agent", ref=editor.id, config={"position": {"x": 950, "y": 150}, "label": "Chief Editor"}),
        WorkflowNode(id="n5", type="end", config={"position": {"x": 1200, "y": 150}, "label": "Approved Output"})
    ]
    t1_edges = [
        WorkflowEdge(source="n0", target="n1"),
        WorkflowEdge(source="n1", target="n2"),
        WorkflowEdge(source="n2", target="n3"),
        WorkflowEdge(source="n3", target="n2", condition="revise"),
        WorkflowEdge(source="n3", target="n4"),
        WorkflowEdge(source="n4", target="n5")
    ]
    t1 = Workflow(
        type="template",
        name="Content Creation Pipeline",
        description="Researches a topic dynamically using live web search, drafts a post, runs a quality check, and finalizes via Editor.",
        graph=WorkflowGraph(nodes=t1_nodes, edges=t1_edges),
        entry_point="n0"
    )
    workflow_repo.create(t1)


    # 2. Support Triage Router (routes tech/general tickets and resolves them)
    t2_nodes = [
        WorkflowNode(id="t0", type="start", config={"position": {"x": 50, "y": 150}, "label": "Start"}),
        WorkflowNode(id="t1", type="agent", ref=researcher.id, config={"position": {"x": 200, "y": 150}, "label": "Ticket Triage"}),
        WorkflowNode(id="t2", type="condition", config={"position": {"x": 450, "y": 150}, "label": "Intent Router"}),
        WorkflowNode(id="t3", type="agent", ref=writer.id, config={"position": {"x": 700, "y": 50}, "label": "Tech Specialist"}),
        WorkflowNode(id="t4", type="agent", ref=editor.id, config={"position": {"x": 700, "y": 250}, "label": "General Agent"}),
        WorkflowNode(id="t5", type="end", config={"position": {"x": 950, "y": 150}, "label": "Ticket Resolved"})
    ]
    t2_edges = [
        WorkflowEdge(source="t0", target="t1"),
        WorkflowEdge(source="t1", target="t2"),
        WorkflowEdge(source="t2", target="t3", condition="tech"),
        WorkflowEdge(source="t2", target="t4"),
        WorkflowEdge(source="t3", target="t5"),
        WorkflowEdge(source="t4", target="t5")
    ]
    t2 = Workflow(
        type="template",
        name="Support Triage Router",
        description="Categorizes incoming support requests, routes them contextually, and resolves the ticket.",
        graph=WorkflowGraph(nodes=t2_nodes, edges=t2_edges),
        entry_point="t0"
    )
    workflow_repo.create(t2)
    