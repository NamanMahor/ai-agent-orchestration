from typing import Any, Dict

from pydantic import BaseModel, Field


class ChannelConfig(BaseModel):

    type: str

    config: Dict[str, Any] = Field(default_factory=dict)
