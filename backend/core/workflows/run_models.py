from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WorkflowRun(BaseModel):

    id: Optional[str] = None

    workflow_id: str

    status: str = "pending"

    state: Dict[str, Any] = Field(default_factory=dict)

    messages: List[Dict[str, Any]] = Field(default_factory=list)

    logs: List[Dict[str, Any]] = Field(default_factory=list)

    token_usage: Dict[str, Any] = Field(default_factory=dict)

    started_at: datetime = Field(default_factory=datetime.utcnow)

    completed_at: Optional[datetime] = None
