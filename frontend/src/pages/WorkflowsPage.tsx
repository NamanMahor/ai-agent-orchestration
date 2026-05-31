import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Node, Edge } from "reactflow";
import { MarkerType } from "reactflow";

import WorkflowBuilder from "../components/WorkflowBuilder";
import type { Workflow, WorkflowNode, WorkflowEdge } from "../types/workflow";
import type { Agent } from "../types/agent";

import { listWorkflows, createWorkflow, deleteWorkflow } from "../api/workflows";
import { listAgents } from "../api/agents";
import { listTemplates, createTemplate, deleteTemplate } from "../api/templates";
import { executeWorkflow } from "../api/execution";

export default function WorkflowsPage() {
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<Workflow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Editor states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Runner state
  const [activeRunWorkflowId, setActiveRunWorkflowId] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState("What is LLM?");
  const [isExecuting, setIsExecuting] = useState(false);

  async function loadData() {
    try {
      const workflowData = await listWorkflows();
      setWorkflows(workflowData);

      const templateData = await listTemplates();
      setTemplates(templateData);

      const agentData = await listAgents();
      setAgents(agentData);
    } catch (e) {
      console.error("Error loading data", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Map ReactFlow UI nodes/edges to backend Pydantic schema
  function getWorkflowPayload() {
    const graphNodes: WorkflowNode[] = nodes.map((n) => ({
      id: n.id,
      type: (n.data.type || "agent") as any,
      ref: n.data.ref || undefined,
      config: {
        position: n.position,
        label: n.data.label || "Node",
        ...n.data.config,
      },
    }));

    const graphEdges: WorkflowEdge[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      condition: e.data?.condition || e.label || undefined,
    }));

    // Detect starting node ID (entry_point)
    let entry_point = undefined;
    if (nodes.length > 0) {
      const incomingTargets = new Set(edges.map((e) => e.target));
      const sourceNodes = nodes.filter((n) => !incomingTargets.has(n.id));
      entry_point = sourceNodes.length > 0 ? sourceNodes[0].id : nodes[0].id;
    }

    return {
      name,
      description,
      schedule: schedule || undefined,
      graph: {
        nodes: graphNodes,
        edges: graphEdges,
      },
      entry_point,
      config: {},
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = getWorkflowPayload();
      await createWorkflow(payload as any);
      setName("");
      setDescription("");
      setSchedule("");
      setNodes([]);
      setEdges([]);
      await loadData();
    } catch (e) {
      console.error("Failed to save workflow", e);
      alert("Error saving workflow. Verify the connections and configurations.");
    }
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow(id);
      await loadData();
    }
  }

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = getWorkflowPayload();
      // Templates don't have schedule
      const { schedule: _ignored, ...templatePayload } = payload;
      await createTemplate(templatePayload as any);
      setName("");
      setDescription("");
      setSchedule("");
      setNodes([]);
      setEdges([]);
      await loadData();
    } catch (e) {
      console.error("Failed to save template", e);
      alert("Error saving template. Verify the connections and configurations.");
    }
  }

  async function handleDeleteTemplate(id?: string) {
    if (!id) return;
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteTemplate(id);
      await loadData();
    }
  }

  // Load a workflow template or saved workflow into the visual editor canvas
  function loadIntoEditor(wf: Workflow) {
    setName(wf.name);
    setDescription(wf.description || "");
    setSchedule(wf.schedule || "");

    const rfNodes: Node[] = wf.graph.nodes.map((n) => ({
      id: n.id,
      type: "default",
      position: n.config?.position || { x: 100, y: 100 },
      style: {
        background:
          n.type === "agent"
            ? "#eef2ff"
            : n.type === "condition"
            ? "#fff7ed"
            : "#fef2f2",
        border:
          n.type === "agent"
            ? "2px solid #6366f1"
            : n.type === "condition"
            ? "2px solid #f97316"
            : "2px solid #ef4444",
        borderRadius: "8px",
        color: "#1e293b",
        padding: "10px",
        fontWeight: "bold",
        fontSize: "13px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      },
      data: {
        label: n.config?.label || n.type,
        type: n.type,
        ref: n.ref,
        config: n.config,
      },
    }));

    const rfEdges: Edge[] = wf.graph.edges.map((e, idx) => ({
      id: `e-${e.source}-${e.target}-${idx}`,
      source: e.source,
      target: e.target,
      label: e.condition || "",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#6366f1",
      },
      style: { stroke: "#6366f1", strokeWidth: 2 },
      data: { condition: e.condition || "" },
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);

    // Scroll to editor
    window.scrollTo({ top: 350, behavior: "smooth" });
  }

  async function triggerWorkflowRun() {
    if (!activeRunWorkflowId) return;
    setIsExecuting(true);
    try {
      const runResult = await executeWorkflow(activeRunWorkflowId, runMessage);
      setIsExecuting(false);
      setActiveRunWorkflowId(null);
      navigate(`/runs/${runResult.run_id}`);
    } catch (e) {
      console.error("Execution failed", e);
      alert("Failed to run workflow. Try again.");
      setIsExecuting(false);
    }
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            Workflows Orchestration
          </h1>
          <p className="text-slate-500 mt-2">
            Build and visual edit multi-agent chains with loops and tool calls.
          </p>
        </div>
      </div>

      {/* Grid of Workflows & Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Saved Workflows */}
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span>
            My Workflows ({workflows.length})
          </h2>
          {workflows.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No workflows created yet. Build one below!</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800">{wf.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {wf.description || "No description provided."}
                    </p>
                    <div className="flex gap-2 pt-1.5">
                      <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        Nodes: {wf.graph?.nodes?.length || 0}
                      </span>
                      <span className="text-[10px] font-semibold bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full">
                        Edges: {wf.graph?.edges?.length || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setActiveRunWorkflowId(wf.id || null)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition shadow-sm"
                    >
                      Run
                    </button>
                    <button
                      onClick={() => loadIntoEditor(wf)}
                      className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 border rounded transition shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold px-2 py-1.5 rounded transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Templates */}
        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            Templates — Blueprints ({templates.length})
          </h2>
          {templates.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No templates loaded. Run backend to seed templates.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-lg p-4 flex justify-between items-center gap-4 transition"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800">{tmpl.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {tmpl.description || "Pre-configured blueprint."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => loadIntoEditor(tmpl)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition shadow-sm"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold px-2 py-1.5 rounded transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual Flow Editor & Creator Form */}
      <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 border-b pb-4">
          Visual Graph Editor
        </h2>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Workflow Name
            </label>
            <input
              className="w-full border bg-white p-2 rounded text-sm text-slate-800 outline-indigo-500 shadow-sm"
              placeholder="e.g. BlogPostPipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Description
            </label>
            <input
              className="w-full border bg-white p-2 rounded text-sm text-slate-800 outline-indigo-500 shadow-sm"
              placeholder="e.g. Generate search-driven blog drafts"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Schedule
            </label>
            <input
              className="w-full border bg-white p-2 rounded text-sm text-slate-800 outline-indigo-500 shadow-sm"
              placeholder="e.g. interval:300 or */5 * * * *"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>
          <div className="md:col-span-1 flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-2 rounded transition shadow-md text-sm"
            >
              Save Workflow
            </button>
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold p-2 rounded transition shadow-md text-sm"
            >
              Save as Template
            </button>
          </div>
        </form>

        <WorkflowBuilder
          nodes={nodes}
          edges={edges}
          agents={agents}
          onChange={(n, e) => {
            setNodes(n);
            setEdges(e);
          }}
        />
      </div>

      {/* Run Trigger Modal */}
      {activeRunWorkflowId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800">
              Trigger Workflow Run
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter the initial prompt or instruction to start the workflow. This message will be sent to the first agent node in the graph.
            </p>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Input message
              </label>
              <textarea
                className="w-full border bg-white p-3 rounded-lg text-sm text-slate-800 outline-indigo-500 shadow-sm"
                rows={4}
                value={runMessage}
                onChange={(e) => setRunMessage(e.target.value)}
                placeholder="Type here..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveRunWorkflowId(null)}
                disabled={isExecuting}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={triggerWorkflowRun}
                disabled={isExecuting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                {isExecuting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  "Execute"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
