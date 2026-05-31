export type WorkflowNodeType = "start" | "agent" | "condition" | "end";

export type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  ref?: string;
  config?: {
    position?: { x: number; y: number };
    label?: string;
    [key: string]: any;
  };
};

export type WorkflowEdge = {
  source: string;
  target: string;
  condition?: string;
};

export type WorkflowGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type Workflow = {
  id?: string;
  type?: "workflow" | "template";
  name: string;
  description?: string;
  graph: WorkflowGraph;
  entry_point?: string;
  config?: Record<string, any>;
  schedule?: string;
};
