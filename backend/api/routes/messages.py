from fastapi import APIRouter

from db.manager import message_repo

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/{run_id}")
def get_messages(run_id: str):

    return message_repo.list_by_run(run_id)
