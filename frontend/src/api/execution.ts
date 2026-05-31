import { api } from "./client";

export async function executeWorkflow(workflowId: string, message: string) {
  const response = await api.post(`/workflow-execution/${workflowId}/execute`, {
    message,
  });
  return response.data;
}
