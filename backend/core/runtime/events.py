import asyncio


class EventBus:

    def __init__(self):

        self.listeners = {}

    async def publish(
        self,
        run_id: str,
        event: dict,
    ):

        if run_id not in self.listeners:
            return

        for queue in self.listeners[run_id]:

            await queue.put(event)

    async def subscribe(self, run_id: str):

        queue = asyncio.Queue()

        if run_id not in self.listeners:
            self.listeners[run_id] = []

        self.listeners[run_id].append(queue)

        try:

            while True:

                event = await queue.get()

                yield event

        finally:

            self.listeners[run_id].remove(queue)


event_bus = EventBus()
