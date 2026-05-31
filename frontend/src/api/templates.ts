import { api } from "./client";

export async function listTemplates() {
  const response = await api.get("/templates");
  return response.data;
}

export async function getTemplate(id: string) {
  const response = await api.get(`/templates/${id}`);
  return response.data;
}

export async function createTemplate(workflow: any) {
  const response = await api.post("/templates", workflow);
  return response.data;
}

export async function deleteTemplate(id: string) {
  await api.delete(`/templates/${id}`);
}

