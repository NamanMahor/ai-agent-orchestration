from fastapi import APIRouter
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from core.runtime.events import event_bus

router = APIRouter()


@router.websocket("/ws/runs/{run_id}")
async def workflow_run_websocket(
    websocket: WebSocket,
    run_id: str,
):

    await websocket.accept()

    try:

        async for event in event_bus.subscribe(run_id):

            await websocket.send_json(event)

    except WebSocketDisconnect:

        return
