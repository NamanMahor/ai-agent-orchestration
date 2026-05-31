from abc import ABC, abstractmethod
from typing import List, Optional

from core.workflows.run_models import WorkflowRun


class WorkflowRunRepository(ABC):

    @abstractmethod
    def create(self, run: WorkflowRun) -> WorkflowRun:
        pass

    @abstractmethod
    def get(self, run_id: str) -> Optional[WorkflowRun]:
        pass

    @abstractmethod
    def update(self, run_id: str, run: WorkflowRun) -> WorkflowRun:
        pass

    @abstractmethod
    def list(self) -> List[WorkflowRun]:
        pass
