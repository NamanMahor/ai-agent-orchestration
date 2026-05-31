from abc import ABC, abstractmethod
from typing import List, Optional

from core.agents.models import Agent


class AgentRepository(ABC):

    @abstractmethod
    def create(self, agent: Agent) -> Agent:
        pass

    @abstractmethod
    def get(self, agent_id: str) -> Optional[Agent]:
        pass

    @abstractmethod
    def update(self, agent_id: str, agent: Agent) -> Agent:
        pass

    @abstractmethod
    def list(self) -> List[Agent]:
        pass

    @abstractmethod
    def delete(self, agent_id: str):
        pass
