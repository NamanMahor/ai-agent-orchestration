from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):

    id: Optional[str] = None

    run_id: str

    session_id: Optional[str] = None

    from_node: str

    to_node: Optional[str] = None

    content: str

    metadata: Dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)
