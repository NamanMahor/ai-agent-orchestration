import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listWorkflows } from "../api/workflows";
import { listAgents } from "../api/agents";
import { api } from "../api/client";

type RunSummary = {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: string;
  started_at: string;
  completed_at?: string;
  token_usage?: {
    total_tokens?: number;
    cost?: number;
  };
};

export default function DashboardPage() {
  const [agentsCount, setAgentsCount] = useState(0);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Fetch agents
      const agentList = await listAgents();
      setAgentsCount(agentList.length);

      // Fetch workflows
      const workflowList = await listWorkflows();
      setWorkflows(workflowList);

      // Fetch runs
      const runsRes = await api.get("/workflow-runs");
      const runsList: RunSummary[] = runsRes.data || [];

      // Sort by started_at descending
      runsList.sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );

      // Map workflow name to each run
      const enrichedRuns = runsList.map((run) => {
        const wf = workflowList.find((w: any) => w.id === run.workflow_id);
        return {
          ...run,
          workflow_name: wf ? wf.name : "Unknown Workflow",
        };
      });

      setRuns(enrichedRuns);
    } catch (e) {
      console.error("Failed to load dashboard statistics", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute stats
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;
  const runningRuns = runs.filter((r) => r.status === "running").length;

  const successRate =
    totalRuns > 0
      ? ((completedRuns / (completedRuns + failedRuns || 1)) * 100).toFixed(0)
      : "100";

  const totalCost = runs.reduce(
    (acc, r) => acc + (r.token_usage?.cost || 0),
    0
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
            System Dashboard
          </h1>
          <p className="text-slate-500 mt-2">
            Real-time analytics, cost tracking, and execution metrics of your autonomous AI agents.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            onClick={loadDashboardData}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 border rounded-lg transition shadow-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-semibold text-slate-500">Loading metrics...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Agents */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center justify-between transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Agents Registered</span>
                <div className="text-3xl font-extrabold text-slate-800">{agentsCount}</div>
                <Link to="/agents" className="text-xs font-medium text-indigo-600 hover:underline block pt-1">
                  Manage agents &rarr;
                </Link>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Total Workflows */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center justify-between transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Active Workflows</span>
                <div className="text-3xl font-extrabold text-slate-800">{workflows.length}</div>
                <Link to="/workflows" className="text-xs font-medium text-indigo-600 hover:underline block pt-1">
                  Orchestrate flows &rarr;
                </Link>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>

            {/* Total Runs & Status */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center justify-between transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Executions</span>
                <div className="text-3xl font-extrabold text-slate-800 flex items-baseline gap-2">
                  <span>{totalRuns}</span>
                  {runningRuns > 0 && (
                    <span className="text-xs font-semibold text-indigo-600 animate-pulse">
                      ({runningRuns} running)
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {completedRuns} completed &middot; {failedRuns} failed
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            {/* Success & Efficiency */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex items-center justify-between transition hover:shadow-md">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">Success Rate & Cost</span>
                <div className="text-3xl font-extrabold text-slate-800">{successRate}%</div>
                <div className="text-xs font-semibold text-emerald-600">
                  Total Cost: ${totalCost.toFixed(5)}
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Grid: Recent Runs & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent executions history table */}
            <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-800">
                Recent Executions History
              </h2>

              {runs.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No execution history recorded. Try triggering a workflow.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-slate-400 font-semibold uppercase text-xs">
                        <th className="pb-3">Workflow</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Triggered</th>
                        <th className="pb-3 text-right">Cost</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {runs.slice(0, 10).map((run) => (
                        <tr key={run.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 font-semibold text-slate-800">
                            {run.workflow_name}
                            <div className="text-[10px] text-slate-400 font-mono font-normal">
                              ID: {run.id.slice(0, 8)}...
                            </div>
                          </td>
                          <td className="py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                run.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : run.status === "failed"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-indigo-50 text-indigo-700"
                              }`}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td className="py-4 text-xs text-slate-500">
                            {new Date(run.started_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-4 text-right font-mono text-xs text-slate-600">
                            ${run.token_usage?.cost?.toFixed(5) || "0.00000"}
                          </td>
                          <td className="py-4 text-right">
                            <Link
                              to={`/runs/${run.id}`}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded text-xs transition"
                            >
                              Track Logs
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-50 border rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-800">Quick Navigation</h2>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/agents"
                    className="w-full bg-white hover:bg-slate-100/50 border text-slate-700 font-semibold p-3 rounded-lg text-sm transition shadow-sm text-center block"
                  >
                    Configure AI Agents
                  </Link>
                  <Link
                    to="/workflows"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 rounded-lg text-sm transition shadow-md text-center block"
                  >
                    Launch Workflow Builder
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
