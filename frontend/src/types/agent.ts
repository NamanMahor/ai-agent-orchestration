export type ModelConfig = {
  provider: string;
  name: string;
  config: Record<string, any>;
};

export type ToolConfig = {
  name: string;
  config: Record<string, any>;
};

export type Agent = {
  id?: string;
  name: string;
  role: string;
  system_prompt: string;
  model: ModelConfig;
  tools: ToolConfig[];
  channels?: string[];
  schedule?: string;
  memory_config?: Record<string, any>;
  guardrails?: Record<string, any>;
};
