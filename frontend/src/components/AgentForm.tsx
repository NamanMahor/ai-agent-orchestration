import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Agent } from "../types/agent";

type Props = {
  onSubmit: (agent: Agent) => Promise<void>;
  onCancel?: () => void;
  initialValues?: Agent;
  mode?: "create" | "edit";
};

export default function AgentForm({
  onSubmit,
  onCancel,
  initialValues,
  mode = "create",
}: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelName, setModelName] = useState("mock-gpt4");
  const [provider, setProvider] = useState("mock");
  const [tools, setTools] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  const [memoryType, setMemoryType] = useState("buffer");
  const [guardrailQuery, setGuardrailQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const [availableTools, setAvailableTools] = useState<{ id: string; label: string }[]>([]);
  const [availableChannels, setAvailableChannels] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const toolsRes = await api.get("/tools");
        setAvailableTools((toolsRes.data || []).map((t: any) => ({
          id: t.name,
          label: t.name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
        })));

        const channelsRes = await api.get("/channels");
        setAvailableChannels(channelsRes.data || []);
      } catch (e) {
        console.error("Failed to load options", e);
      }
    }
    loadOptions();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name || "");
      setRole(initialValues.role || "");
      setSystemPrompt(initialValues.system_prompt || "");
      setModelName(initialValues.model?.name || "mock-gpt4");
      setProvider(initialValues.model?.provider || "mock");
      setTools((initialValues.tools || []).map((t) => t.name));
      setChannels(initialValues.channels || []);
      setMemoryType(initialValues.memory_config?.type || "buffer");
      const keywords = initialValues.guardrails?.block_keywords;
      setGuardrailQuery(Array.isArray(keywords) ? keywords.join(",") : "");
    }
  }, [initialValues]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;

    setSaving(true);
    try {
      await onSubmit({
        ...(initialValues || {}),
        name,
        role,
        system_prompt: systemPrompt,
        model: { provider, name: modelName, config: {} },
        tools: tools.map((t) => ({ name: t, config: {} })),
        channels,
        memory_config: { type: memoryType },
        guardrails: guardrailQuery.trim()
          ? { block_keywords: guardrailQuery.split(",").map((k) => k.trim()) }
          : {},
      });

      if (mode === "create") {
        setName(""); setRole(""); setSystemPrompt("");
        setTools([]); setChannels([]); setGuardrailQuery("");
      }
    } finally {
      setSaving(false);
    }
  }

  const toggleTool = (toolId: string) =>
    setTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );

  const toggleChannel = (channelId: string) =>
    setChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Header */}
      <div className="md:col-span-2">
        <h2 className="text-lg font-bold text-slate-800">
          {mode === "edit" ? "Edit Agent" : "Create AI Agent"}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure personality, model, channels, and schedule.
        </p>
      </div>

      {/* Left: Core config */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border bg-white p-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
            placeholder="e.g. AI Researcher"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Role Description
          </label>
          <input
            className="w-full border bg-white p-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
            placeholder="e.g. Researcher, Writer, Support Agent"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            System Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full border bg-white p-2.5 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
            placeholder="Describe the agent's personality and behavior..."
            rows={6}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Provider
            </label>
            <select
              className="w-full border bg-white p-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="mock">Mock / Demo</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Model Name
            </label>
            <input
              className="w-full border bg-white p-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
              placeholder="mock-gpt4 or llama3.1"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Right: Tools, Channels, Schedule, Guardrails */}
      <div className="space-y-4">


        {/* Tools */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Tool Capabilities
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => toggleTool(tool.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  tools.includes(tool.id)
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                {tools.includes(tool.id) ? "✓ " : ""}{tool.label}
              </button>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Messaging Channels
          </label>
          <div className="flex flex-wrap gap-2">
            {availableChannels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => toggleChannel(channel.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  channels.includes(channel.id)
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                {channels.includes(channel.id) ? "✓ " : ""}{channel.label}
              </button>
            ))}
          </div>
        </div>

        {/* Memory + Guardrails */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Memory Strategy
            </label>
            <select
              className="w-full border bg-white p-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
              value={memoryType}
              onChange={(e) => setMemoryType(e.target.value)}
            >
              <option value="buffer">Short-term (Buffer)</option>
              <option value="summary">Summary Memory</option>
              <option value="none">No Memory</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Block Keywords
            </label>
            <input
              className="w-full border bg-white p-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
              placeholder="keyword1,keyword2"
              value={guardrailQuery}
              onChange={(e) => setGuardrailQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-md flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : mode === "edit" ? (
              "Save Changes"
            ) : (
              "Create Agent"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
