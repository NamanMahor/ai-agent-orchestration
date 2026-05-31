from fastapi import APIRouter, HTTPException

from core.workflows.models import Workflow

from db.manager import workflow_repo

router = APIRouter(prefix="/templates", tags=["templates"])


@router.post("/")
def create_template(workflow: Workflow):

    workflow.type = "template"

    return workflow_repo.create(workflow)


@router.get("/")
def list_templates():

    workflows = workflow_repo.list()

    return [w for w in workflows if w.type == "template"]


@router.get("/{template_id}")
def get_template(template_id: str):

    template = workflow_repo.get(template_id)

    if not template:
        raise HTTPException(404, "Template not found")

    return template


@router.put("/{template_id}")
def update_template(template_id: str, workflow: Workflow):

    existing = workflow_repo.get(template_id)

    if not existing:
        raise HTTPException(404, "Template not found")

    workflow.type = "template"

    return workflow_repo.update(template_id, workflow)


@router.delete("/{template_id}")
def delete_template(template_id: str):

    existing = workflow_repo.get(template_id)

    if not existing:
        raise HTTPException(404, "Template not found")

    workflow_repo.delete(template_id)

    return {"status": "deleted"}
