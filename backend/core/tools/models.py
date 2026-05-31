from typing import Any, Dict

from pydantic import BaseModel, Field


class ToolReference(BaseModel):

    name: str

    config: Dict[str, Any] = Field(default_factory=dict)