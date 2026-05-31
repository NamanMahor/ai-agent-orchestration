from fastapi import APIRouter
from core.tools.registry import tool_registry

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/")
def list_tools():
    return [{
        "name": t.name,
        "description": t.description,
    } for t in tool_registry.list()]
