from fastapi import APIRouter, HTTPException

from core.agents.models import Agent

from db.manager import agent_repo

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/")
def create_agent(agent: Agent):

    return agent_repo.create(agent)


@router.get("/")
def list_agents():

    return agent_repo.list()


@router.get("/{agent_id}")
def get_agent(agent_id: str):

    agent = agent_repo.get(agent_id)

    if not agent:
        raise HTTPException(404, "Agent not found")

    return agent


@router.put("/{agent_id}")
def update_agent(agent_id: str, agent: Agent):

    existing = agent_repo.get(agent_id)

    if not existing:
        raise HTTPException(404, "Agent not found")

    return agent_repo.update(agent_id, agent)


@router.delete("/{agent_id}")
def delete_agent(agent_id: str):

    existing = agent_repo.get(agent_id)

    if not existing:
        raise HTTPException(404, "Agent not found")

    agent_repo.delete(agent_id)

    return {"status": "deleted"}
