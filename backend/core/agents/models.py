from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from core.llm.models import ModelConfig
from core.tools.models import ToolReference


class Agent(BaseModel):

    id: Optional[str] = None

    name: str

    description: Optional[str] = None

    role: Optional[str] = None

    system_prompt: str

    model: ModelConfig

    tools: List[ToolReference] = Field(default_factory=list)

    memory_config: Dict[str, Any] = Field(default_factory=dict)

    guardrails: Dict[str, Any] = Field(default_factory=dict)

    channels: List[str] = Field(default_factory=list)

    config: Dict[str, Any] = Field(default_factory=dict)
