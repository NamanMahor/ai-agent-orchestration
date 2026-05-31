from abc import ABC, abstractmethod


class Channel(ABC):

    type: str

    label: str

    @abstractmethod
    async def send_message(
        self,
        target: str,
        text: str,
    ):
        pass