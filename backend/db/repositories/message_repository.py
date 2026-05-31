from abc import ABC, abstractmethod
from typing import List

from core.workflows.message_models import Message


class MessageRepository(ABC):

    @abstractmethod
    def create(self, message: Message) -> Message:
        pass

    @abstractmethod
    def list_by_run(self, run_id: str) -> List[Message]:
        pass

    @abstractmethod
    def list_by_session(self,
                        session_id: str,
                        limit: int = 20) -> List[Message]:
        pass
