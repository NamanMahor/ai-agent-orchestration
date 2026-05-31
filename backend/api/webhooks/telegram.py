from fastapi import APIRouter
from fastapi import Request

from core.channels.telegram.service import (
    telegram_service, )

router = APIRouter(prefix="/webhooks", tags=["telegram"])


@router.post("/telegram")
async def telegram_webhook(request: Request, ):

    payload = await request.json()

    message = payload.get("message")

    if not message:
        return {"ok": True}

    chat_id = str(message["chat"]["id"])

    text = message.get("text", "")

    await telegram_service.handle_message(
        chat_id,
        text,
    )

    return {"ok": True}
