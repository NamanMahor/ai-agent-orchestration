from fastapi import APIRouter, HTTPException

from core.workflows.models import Workflow

from db.manager import workflow_repo

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("/")
def create_workflow(workflow: Workflow):

    workflow.type = "workflow"

    return workflow_repo.create(workflow)


@router.get("/")
def list_workflows():

    workflows = workflow_repo.list()

    return [w for w in workflows if w.type == "workflow"]


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str):

    workflow = workflow_repo.get(workflow_id)

    if not workflow:
        raise HTTPException(404, "Workflow not found")

    return workflow


@router.put("/{workflow_id}")
def update_workflow(workflow_id: str, workflow: Workflow):

    existing = workflow_repo.get(workflow_id)

    if not existing:
        raise HTTPException(404, "Workflow not found")

    workflow.type = "workflow"

    return workflow_repo.update(workflow_id, workflow)


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str):

    existing = workflow_repo.get(workflow_id)

    if not existing:
        raise HTTPException(404, "Workflow not found")

    workflow_repo.delete(workflow_id)

    return {"status": "deleted"}
