from abc import ABC, abstractmethod
from typing import List, Optional

from core.workflows.models import Workflow


class WorkflowRepository(ABC):

    @abstractmethod
    def create(self, workflow: Workflow) -> Workflow:
        pass

    @abstractmethod
    def get(self, workflow_id: str) -> Optional[Workflow]:
        pass

    @abstractmethod
    def update(self, workflow_id: str, workflow: Workflow) -> Workflow:
        pass

    @abstractmethod
    def list(self) -> List[Workflow]:
        pass

    @abstractmethod
    def delete(self, workflow_id: str):
        pass
