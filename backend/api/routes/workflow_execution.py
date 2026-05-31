from fastapi import APIRouter, HTTPException

from pydantic import BaseModel

from db.manager import workflow_repo

from core.runtime.workflow_runtime import (
    workflow_runtime, )

router = APIRouter(prefix="/workflow-execution", tags=["workflow-execution"])


class ExecuteWorkflowRequest(BaseModel):

    message: str


@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    payload: ExecuteWorkflowRequest,
):

    workflow = workflow_repo.get(workflow_id)

    if not workflow:
        raise HTTPException(404, "Workflow not found")

    run = workflow_runtime.execute_async(
        workflow,
        payload.message,
    )

    return {"run_id": run.id, "status": run.status}
