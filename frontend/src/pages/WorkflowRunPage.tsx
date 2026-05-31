import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getWorkflowRun, getWorkflowRunMessages } from "../api/runs";

type RunLog = {
  timestamp: string;
  type: string;
  message: string;
  agent?: string;
  tool?: string;
  output?: string;
};

type AgentMessage = {
  id?: string;
  from_node: string;
  content: string;
  created_at: string;
};

export default function WorkflowRunPage() {
  const { runId } = useParams<{ runId: string }>();

  const [status, setStatus] = useState<string>("pending");
  const [tokenUsage, setTokenUsage] = useState<any>({
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    cost: 0,
  });

  const [logs, setLogs] = useState<RunLog[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [workflowName, setWorkflowName] = useState<string>("Workflow Run");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages list
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, logs]);

  // Load initial state
  useEffect(() => {
    if (!runId) return;

    async function loadInitialData() {
      try {
        const run = await getWorkflowRun(runId);
        if (run) {
          setStatus(run.status || "pending");
          setTokenUsage(
            run.token_usage && Object.keys(run.token_usage).length > 0
              ? run.token_usage
              : { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0 }
          );

          // Populate initial logs from messages & state
          const initialLogs: RunLog[] = [];
          if (run.messages) {
            run.messages.forEach((msg: any, idx: number) => {
              initialLogs.push({
                timestamp: run.started_at,
                type: msg.node_type || "agent",
                message: `${msg.agent || "Agent"} completed execution step.`,
                agent: msg.agent,
                output: msg.output,
              });
            });
          }
          setLogs(initialLogs);
        }

        const msgData = await getWorkflowRunMessages(runId);
        setMessages(msgData || []);
      } catch (e) {
        console.error("Error loading initial run data", e);
      }
    }

    loadInitialData();

    // Establish live WebSocket connection
    const wsUrl = `ws://${window.location.hostname}:8080/ws/runs/${runId}`;
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket event received", data);

        const timestamp = data.timestamp || new Date().toISOString();

        if (data.type === "run_started") {
          setStatus("running");
          if (data.workflow_name) setWorkflowName(data.workflow_name);
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "system", message: "Workflow execution started." },
          ]);
        } else if (data.type === "agent_started") {
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "agent", message: `Agent '${data.agent}' started thinking...`, agent: data.agent },
          ]);
        } else if (data.type === "agent_completed") {
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "agent", message: `Agent '${data.agent}' finalized response.`, agent: data.agent, output: data.output },
          ]);
          // Add message to chat transcript
          setMessages((prev) => [
            ...prev,
            {
              from_node: data.agent,
              content: data.output,
              created_at: timestamp,
            },
          ]);
          if (data.token_usage) {
            setTokenUsage(data.token_usage);
          }
        } else if (data.type === "tool_started") {
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "tool", message: `Executing tool: '${data.tool}'...`, tool: data.tool },
          ]);
        } else if (data.type === "tool_completed") {
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "tool", message: `Tool '${data.tool}' returned response.`, tool: data.tool, output: data.output },
          ]);
        } else if (data.type === "condition_completed") {
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "condition", message: data.output },
          ]);
        } else if (data.type === "end_reached") {
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "system", message: "Workflow finished execution successfully." },
          ]);
        } else if (data.type === "run_completed") {
          setStatus("completed");
        } else if (data.type === "run_failed") {
          setStatus("failed");
          setLogs((prev) => [
            ...prev,
            { timestamp, type: "error", message: `Run failed: ${data.error}` },
          ]);
        }
      } catch (e) {
        console.error("Error processing websocket message", e);
      }
    };

    socket.onerror = (e) => {
      console.error("WebSocket connection error", e);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      socket.close();
    };
  }, [runId]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/workflows" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              &larr; Back to Workflows
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {workflowName}
          </h1>
          <p className="text-xs font-mono text-slate-400">Run ID: {runId}</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium">Status:</span>
          <span
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold shadow-sm capitalize ${
              status === "completed"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : status === "failed"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}
          >
            {status === "running" && (
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
            )}
            {status}
          </span>
        </div>
      </div>

      {/* Grid: Token Panel & Logs & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Token usage stats & execution logs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Token & cost usage card */}
          <div className="bg-slate-900 text-white border rounded-xl shadow-md p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Live Usage & Cost Tracker
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Prompt Tokens</div>
                <div className="text-xl font-bold font-mono text-slate-200">{tokenUsage.prompt_tokens}</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Completion Tokens</div>
                <div className="text-xl font-bold font-mono text-slate-200">{tokenUsage.completion_tokens}</div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Tokens</div>
                <div className="text-lg font-bold font-mono text-indigo-400">{tokenUsage.total_tokens}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Estimated Cost</div>
                <div className="text-xl font-extrabold font-mono text-emerald-400">
                  ${tokenUsage.cost?.toFixed(6) || "0.000000"}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time System/Execution logs card */}
          <div className="bg-white border rounded-xl shadow-sm p-6 flex flex-col h-[400px]">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 shrink-0">
              Execution Event Log
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 text-xs leading-normal font-sans space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
              {logs.length === 0 ? (
                <p className="text-slate-400 italic">Awaiting connection...</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <div>
                      <span
                        className={`font-semibold capitalize ${
                          log.type === "agent"
                            ? "text-indigo-600"
                            : log.type === "tool"
                            ? "text-green-600"
                            : log.type === "condition"
                            ? "text-orange-500"
                            : log.type === "error"
                            ? "text-red-600"
                            : "text-slate-600"
                        }`}
                      >
                        [{log.type}]
                      </span>{" "}
                      <span className="text-slate-700">{log.message}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Conversational Chat Transcript */}
        <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm flex flex-col h-[520px]">
          {/* Transcript Header */}
          <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Agent-to-Agent Message Thread</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
              Async Communication
            </span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <svg className="w-12 h-12 text-slate-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm italic">Waiting for agents to communicate...</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isSystemInput = idx === 0 && !msg.from_node.startsWith("n") && !msg.from_node.startsWith("t") && msg.from_node !== "AI Researcher";
                return (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${
                      isSystemInput ? "mr-auto items-start" : "ml-auto items-end"
                    }`}
                  >
                    {/* Header: Sender and Timestamp */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400 font-semibold uppercase">
                      <span>{msg.from_node}</span>
                      <span>&middot;</span>
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`rounded-2xl p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm border ${
                        isSystemInput
                          ? "bg-white text-slate-800 border-slate-200/80 rounded-tl-none"
                          : "bg-indigo-600 text-white border-indigo-600 rounded-tr-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
