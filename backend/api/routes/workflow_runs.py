from fastapi import APIRouter, HTTPException

from db.manager import workflow_run_repo

router = APIRouter(prefix="/workflow-runs", tags=["workflow-runs"])


@router.get("/")
def list_runs():

    return workflow_run_repo.list()


@router.get("/{run_id}")
def get_run(run_id: str):

    run = workflow_run_repo.get(run_id)

    if not run:
        raise HTTPException(404, "Run not found")

    return run
