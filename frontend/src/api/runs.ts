import { api } from "./client";

export async function getWorkflowRun(runId: string) {
  const response = await api.get(`/workflow-runs/${runId}`);
  return response.data;
}

export async function getWorkflowRunMessages(runId: string) {
  const response = await api.get(`/messages/${runId}`);
  return response.data;
}
