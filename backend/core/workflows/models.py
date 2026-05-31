from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class WorkflowNode(BaseModel):
    id: str
    type: Literal["start", "agent", "condition", "end"]
    ref: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    source: str
    target: str
    condition: Optional[str] = None


class WorkflowGraph(BaseModel):
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)


class Workflow(BaseModel):
    id: Optional[str] = None
    type: Literal["workflow", "template"] = "workflow"
    name: str
    description: Optional[str] = None
    graph: WorkflowGraph
    entry_point: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    # New optional schedule field (seconds interval or cron expression)
    schedule: Optional[str] = None
