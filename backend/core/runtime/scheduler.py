from datetime import datetime, timezone, timedelta
import asyncio
import logging

from croniter import croniter

from core.runtime.workflow_runtime import workflow_runtime
from db.manager import workflow_repo

logger = logging.getLogger(__name__)


class BackgroundScheduler:

    def __init__(self):
        self.running = False

        # workflow_id -> next execution datetime
        self.next_run = {}

    async def start(self):
        logger.info("Starting background scheduler...")
        self.running = True
        asyncio.create_task(self._loop())

    def stop(self):
        logger.info("Stopping background scheduler...")
        self.running = False

    async def _loop(self):
        await asyncio.sleep(5)

        while self.running:
            try:
                await self.check_and_trigger()
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}", exc_info=True)

            await asyncio.sleep(10)

    async def check_and_trigger(self):
        now = datetime.now(timezone.utc)

        workflows = workflow_repo.list()

        for wf in workflows:
            if not wf.schedule:
                continue

            key = f"wf_{wf.id}"

            # interval:SECONDS
            if wf.schedule.startswith("interval:"):
                try:
                    seconds = int(wf.schedule.split(":", 1)[1])
                except ValueError:
                    logger.warning(
                        f"Invalid interval schedule for workflow '{wf.name}': {wf.schedule}"
                    )
                    continue

                next_run = self.next_run.get(key)

                if next_run is None:
                    self.next_run[key] = now
                    next_run = now

                if now >= next_run:
                    logger.info(
                        f"Triggering scheduled workflow '{wf.name}' "
                        f"(Interval: {seconds}s)"
                    )

                    asyncio.create_task(
                        workflow_runtime.execute(
                            wf,
                            "Scheduled workflow trigger",
                        )
                    )

                    self.next_run[key] = now.replace(
                        microsecond=0
                    ) + timedelta(seconds=seconds)

                continue

            # Standard cron expression
            try:
                next_run = self.next_run.get(key)

                if next_run is None:
                    # First time seeing this workflow
                    base = now
                    next_run = croniter(wf.schedule, base).get_next(datetime)
                    self.next_run[key] = next_run

                if now >= next_run:
                    logger.info(
                        f"Triggering scheduled workflow '{wf.name}' "
                        f"(Cron: {wf.schedule})"
                    )

                    asyncio.create_task(
                        workflow_runtime.execute(
                            wf,
                            "Scheduled workflow cron trigger",
                        )
                    )

                    self.next_run[key] = croniter(
                        wf.schedule,
                        now,
                    ).get_next(datetime)

            except Exception as e:
                logger.warning(
                    f"Invalid cron schedule for workflow '{wf.name}': "
                    f"{wf.schedule}. Error: {e}"
                )

scheduler = BackgroundScheduler()