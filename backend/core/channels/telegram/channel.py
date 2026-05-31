import os
import logging
import requests

from core.channels.base import Channel

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_TOKEN = os.getenv("TELEGRAM_BOT_CHAT_ID")

class TelegramChannel(Channel):

    type = "telegram"

    label = "Telegram"

    async def send_message(
        self,
        target: str,
        text: str,
    ):

        try:
            final_target = target or CHAT_TOKEN
            res = requests.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": final_target,
                    "text": text,
                },
                timeout=20)
            res.raise_for_status()
        except Exception as e:
            logger.error(f"Telegram sendMessage failed to {target}: {str(e)}")
            if 'res' in locals():
                logger.error(f"Response body: {res.text}")
            raise e


telegram_channel = TelegramChannel()
