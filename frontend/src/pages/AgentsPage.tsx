import { useEffect, useState } from "react";
import AgentForm from "../components/AgentForm";
import type { Agent } from "../types/agent";
import { listAgents, createAgent, updateAgent, deleteAgent } from "../api/agents";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function loadAgents() {
    const data = await listAgents();
    setAgents(data);
  }

  useEffect(() => {
    loadAgents();
  }, []);

  async function handleCreate(agent: Agent) {
    await createAgent(agent);
    setShowCreateForm(false);
    await loadAgents();
  }

  async function handleUpdate(agent: Agent) {
    if (!editingAgent?.id) return;
    await updateAgent(editingAgent.id, agent);
    setEditingAgent(null);
    await loadAgents();
  }

  async function handleDelete(id?: string) {
    if (!id) return;
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    await deleteAgent(id);
    await loadAgents();
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Page Header */}
      <div className="flex justify-between items-center border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            AI Agents Registry
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage agent personas, models, tools, and messaging channels.
          </p>
        </div>
        <button
          onClick={() => { setShowCreateForm((v) => !v); setEditingAgent(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition ${
            showCreateForm
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {showCreateForm ? (
            "✕ Cancel"
          ) : (
            <>
              <span className="text-lg leading-none">+</span> New Agent
            </>
          )}
        </button>
      </div>

      {/* Create Form (collapsible) */}
      {showCreateForm && (
        <div className="bg-white border rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <AgentForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Agent Cards Grid */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <svg className="w-14 h-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-base font-semibold">No agents yet</p>
          <p className="text-sm">Click <strong>"New Agent"</strong> above to create your first AI agent.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="group bg-white border rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-800 truncate">{agent.name}</h2>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    {agent.role || "General Assistant"}
                  </div>
                </div>
                {/* Action buttons - visible on hover */}
                <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingAgent(agent); setShowCreateForm(false); }}
                    title="Edit agent"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    title="Delete agent"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* System Prompt Preview */}
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 line-clamp-3 leading-relaxed">
                {agent.system_prompt}
              </div>

              {/* Config Badges */}
              <div className="space-y-2 text-xs">
                {/* Model */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold w-14 shrink-0">Model</span>
                  <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] truncate">
                    {agent.model.provider}/{agent.model.name}
                  </span>
                </div>

                {/* Tools */}
                {agent.tools?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold w-14 shrink-0">Tools</span>
                    <div className="flex flex-wrap gap-1">
                      {agent.tools.map((t) => (
                        <span key={t.name} className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Channels */}
                {agent.channels?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold w-14 shrink-0">Channel</span>
                    <div className="flex flex-wrap gap-1">
                      {agent.channels.map((ch) => (
                        <span key={ch} className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule */}
                {agent.schedule && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold w-14 shrink-0">Schedule</span>
                    <span className="bg-orange-50 text-orange-700 border border-orange-100 font-semibold px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {agent.schedule}
                    </span>
                  </div>
                )}
              </div>

              {/* Edit Button (always visible at bottom) */}
              <div className="pt-1 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => { setEditingAgent(agent); setShowCreateForm(false); }}
                  className="w-full text-xs font-semibold text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 py-1.5 rounded-lg transition text-center"
                >
                  Edit Configuration
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Slide-Over Modal */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setEditingAgent(null)}
          />

          {/* Slide-over panel */}
          <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800">Editing: {editingAgent.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">ID: {editingAgent.id?.slice(0, 12)}…</p>
              </div>
              <button
                onClick={() => setEditingAgent(null)}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 flex-1">
              <AgentForm
                mode="edit"
                initialValues={editingAgent}
                onSubmit={handleUpdate}
                onCancel={() => setEditingAgent(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
