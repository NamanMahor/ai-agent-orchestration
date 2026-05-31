import { api } from "./client";

import type { Agent } from "../types/agent";

export async function listAgents() {
  const response = await api.get("/agents");
  return response.data;
}

export async function createAgent(agent: Agent) {
  const response = await api.post("/agents", agent);
  return response.data;
}

export async function updateAgent(id: string, agent: Agent) {
  const response = await api.put(`/agents/${id}`, agent);
  return response.data;
}

export async function deleteAgent(id: string) {
  await api.delete(`/agents/${id}`);
}
