import { api } from "./client";

import type {
  Workflow,
} from "../types/workflow";

export async function listWorkflows() {

  const response = await api.get(
    "/workflows"
  );

  return response.data;
}

export async function createWorkflow(
  workflow: Workflow,
) {

  const response = await api.post(
    "/workflows",
    workflow,
  );

  return response.data;
}

export async function deleteWorkflow(
  id: string,
) {

  await api.delete(
    `/workflows/${id}`
  );
}

