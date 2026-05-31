from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ModelConfig(BaseModel):

    provider: str

    name: str

    temperature: Optional[float] = 0.7

    max_tokens: Optional[int] = None

    config: Dict[str, Any] = Field(default_factory=dict)
