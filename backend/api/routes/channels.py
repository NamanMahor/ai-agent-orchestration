from fastapi import APIRouter
from core.channels.registry import channel_registry

router = APIRouter(prefix="/channels", tags=["channels"])


@router.get("/")
def list_channels():

    return [{
        "id": c.type,
        "label": getattr(c, "label", c.type.capitalize()),
    } for c in channel_registry.list()]
