import logging

from db.manager import workflow_repo, workflow_run_repo
from core.runtime.workflow_runtime import workflow_runtime

logger = logging.getLogger(__name__)


class TelegramService:

    async def handle_message(
        self,
        chat_id: str,
        text: str,
    ):
        logger.info(f"Received Telegram message from chat_id='{chat_id}': '{text}'")

        # 1. Check if there is any paused workflow run for this chat_id
        runs = workflow_run_repo.list()
        paused_run = next(
            (r for r in runs if r.status == "paused"),
            None
        )

        if paused_run:
            logger.info(f"Resuming paused workflow run '{paused_run.id}' for chat_id '{chat_id}'")
            workflow = workflow_repo.get(paused_run.workflow_id)
            if workflow:
                await workflow_runtime.resume(
                    paused_run,
                    workflow,
                    text,
                    session_id=chat_id,
                )
                return
            else:
                logger.warning(f"Workflow '{paused_run.workflow_id}' not found for paused run '{paused_run.id}'")
        else: 
            logger.warning(f"Not paused for chat_id='{chat_id}': '{text}'")

telegram_service = TelegramService()
