import { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Connection, Edge, Node } from "reactflow";
import type { Agent } from "../types/agent";

type Props = {
  nodes: Node[];
  edges: Edge[];
  agents: Agent[];
  onChange: (nodes: Node[], edges: Edge[]) => void;
};

export default function WorkflowBuilder({
  nodes: initialNodes,
  edges: initialEdges,
  agents,
  onChange,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const [availableTools, setAvailableTools] = useState<{ name: string; description?: string }[]>([]);
  const [availableChannels, setAvailableChannels] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const toolsRes = await api.get("/tools");
        setAvailableTools(toolsRes.data || []);

        const channelsRes = await api.get("/channels");
        setAvailableChannels(channelsRes.data || []);
      } catch (e) {
        console.error("Failed to load options from backend", e);
      }
    }
    loadOptions();
  }, []);

  // Sync with initial nodes/edges if changed from parent (e.g. loading templates)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Propagate changes up to parent
  const handleNodesChange = (changes: any) => {
    onNodesChange(changes);
    // Use timeout to ensure state is updated before propagating
    setTimeout(() => {
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          onChange(currentNodes, currentEdges);
          return currentEdges;
        });
        return currentNodes;
      });
    }, 0);
  };

  const handleEdgesChange = (changes: any) => {
    onEdgesChange(changes);
    setTimeout(() => {
      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          onChange(currentNodes, currentEdges);
          return currentEdges;
        });
        return currentNodes;
      });
    }, 0);
  };

  function handleConnect(connection: Connection) {
    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      label: "",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#6366f1",
      },
      style: { stroke: "#6366f1", strokeWidth: 2 },
      data: { condition: "" },
    };

    const updatedEdges = addEdge(newEdge, edges);
    setEdges(updatedEdges);
    onChange(nodes, updatedEdges);
  }

  function addNode(type: "start" | "agent" | "condition" | "end") {
    let label = "Agent Node";
    let ref = "";
    if (type === "start") {
      label = "Start";
    } else if (type === "condition") {
      label = "Condition Router";
    } else if (type === "end") {
      label = "End Workflow";
    } else if (type === "agent" && agents.length > 0) {
      label = agents[0].name;
      ref = agents[0].id || "";
    }

    const newNode: Node = {
      id: crypto.randomUUID(),
      position: {
        x: 100 + nodes.length * 50,
        y: 150 + (nodes.length % 2) * 50,
      },
      style: {
        background:
          type === "start"
            ? "#faf5ff"
            : type === "agent"
            ? "#eef2ff"
            : type === "condition"
            ? "#fff7ed"
            : "#fef2f2",
        border:
          type === "start"
            ? "2px solid #a855f7"
            : type === "agent"
            ? "2px solid #6366f1"
            : type === "condition"
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
        label,
        type,
        ref,
        config: {},
      },
    };

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    onChange(updatedNodes, edges);
    setSelectedNode(newNode);
    setSelectedEdge(null);
  }

  // Handle node clicked on canvas
  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  // Handle edge clicked on canvas
  const onEdgeClick = (_: any, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const updateSelectedNode = (key: string, value: any) => {
    if (!selectedNode) return;

    const updatedNodes = nodes.map((n) => {
      if (n.id === selectedNode.id) {
        let label = n.data.label;
        let ref = n.data.ref;
        let config = { ...n.data.config };

        if (key === "label") label = value;
        if (key === "ref") {
          ref = value;
          if (n.data.type === "agent") {
            const ag = agents.find((a) => a.id === value);
            if (ag) label = ag.name;
          }
        }
        if (key === "config") config = { ...config, ...value };

        const updatedNode = {
          ...n,
          style: {
            ...n.style,
            // Reapply styling just in case type changed
            background:
              n.data.type === "start"
                ? "#faf5ff"
                : n.data.type === "agent"
                ? "#eef2ff"
                : n.data.type === "condition"
                ? "#fff7ed"
                : "#fef2f2",
            border:
              n.data.type === "start"
                ? "2px solid #a855f7"
                : n.data.type === "agent"
                ? "2px solid #6366f1"
                : n.data.type === "condition"
                ? "2px solid #f97316"
                : "2px solid #ef4444",
          },
          data: {
            ...n.data,
            label,
            ref,
            config,
          },
        };
        setSelectedNode(updatedNode);
        return updatedNode;
      }
      return n;
    });

    setNodes(updatedNodes);
    onChange(updatedNodes, edges);
  };

  const updateSelectedEdge = (condition: string) => {
    if (!selectedEdge) return;

    const updatedEdges = edges.map((e) => {
      if (e.id === selectedEdge.id) {
        const updatedEdge = {
          ...e,
          label: condition,
          data: { ...e.data, condition },
        };
        setSelectedEdge(updatedEdge);
        return updatedEdge;
      }
      return e;
    });

    setEdges(updatedEdges);
    onChange(nodes, updatedEdges);
  };

  const deleteSelected = () => {
    if (selectedNode) {
      const updatedNodes = nodes.filter((n) => n.id !== selectedNode.id);
      const updatedEdges = edges.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
      );
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      onChange(updatedNodes, updatedEdges);
      setSelectedNode(null);
    }
    if (selectedEdge) {
      const updatedEdges = edges.filter((e) => e.id !== selectedEdge.id);
      setEdges(updatedEdges);
      onChange(nodes, updatedEdges);
      setSelectedEdge(null);
    }
  };

  return (
    <div className="flex border rounded-lg overflow-hidden bg-white shadow-lg h-[600px]">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Toolbar */}
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between z-10">
          <div className="flex gap-2">
            <button
              onClick={() => addNode("start")}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-1.5 rounded transition shadow-sm"
            >
              + Start Node
            </button>
            <button
              onClick={() => addNode("agent")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-1.5 rounded transition shadow-sm"
            >
              + Agent Node
            </button>
            <button
              onClick={() => addNode("condition")}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3 py-1.5 rounded transition shadow-sm"
            >
              + Condition Router
            </button>
            <button
              onClick={() => addNode("end")}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1.5 rounded transition shadow-sm"
            >
              + End Node
            </button>
          </div>
          <div className="text-xs text-slate-500 italic">
            Drag to reposition. Connect output dot to input dot.
          </div>
        </div>

        {/* ReactFlow Editor */}
        <div className="flex-1 bg-slate-50 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
          >
            <MiniMap style={{ height: 100 }} zoomable pannable />
            <Controls />
            <Background color="#cbd5e1" gap={16} />
          </ReactFlow>
        </div>
      </div>

      {/* Side Panel for Configs */}
      <div className="w-80 border-l bg-slate-50 p-6 overflow-y-auto flex flex-col h-full">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center justify-between">
          <span>Properties</span>
          {(selectedNode || selectedEdge) && (
            <button
              onClick={deleteSelected}
              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-2 py-1 rounded"
            >
              Delete
            </button>
          )}
        </h3>

        {selectedNode ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Node Type
              </label>
              <div className="capitalize text-sm font-bold text-slate-800">
                {selectedNode.data.type}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Node Title / Label
              </label>
              <input
                className="w-full border bg-white p-2 rounded text-sm text-slate-800 outline-indigo-500 shadow-sm"
                value={selectedNode.data.label || ""}
                onChange={(e) => updateSelectedNode("label", e.target.value)}
              />
            </div>

            {selectedNode.data.type === "agent" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Assign Agent
                </label>
                <select
                  className="w-full border bg-white p-2 rounded text-sm text-slate-800 outline-indigo-500 shadow-sm"
                  value={selectedNode.data.ref || ""}
                  onChange={(e) => updateSelectedNode("ref", e.target.value)}
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedNode.data.type === "start" && (
              <div className="text-xs text-slate-500 bg-purple-50 border border-purple-200 rounded p-3 leading-relaxed">
                The Start node marks the entry point of the workflow execution. Connect its output to the first agent node in your pipeline.
              </div>
            )}

            {selectedNode.data.type === "condition" && (
              <div className="text-xs text-slate-500 bg-orange-50 border border-orange-200 rounded p-3 leading-relaxed">
                Condition nodes route execution by looking for keywords in the output of the preceding agent node. Set the keywords on the outgoing connections/edges.
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Edge ID
              </label>
              <div className="text-xs font-mono text-slate-400 truncate">
                {selectedEdge.id}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter Condition (Keyword)
              </label>
              <input
                className="w-full border bg-white p-2 rounded text-sm text-slate-800 outline-indigo-500 shadow-sm"
                placeholder="e.g. revise, error, tech"
                value={selectedEdge.data?.condition || selectedEdge.label || ""}
                onChange={(e) => updateSelectedEdge(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                If the previous node output contains this keyword, this route will be followed. Leave empty to make it a default route.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic text-center mt-12 leading-relaxed">
            Click on a node or edge in the editor to inspect and edit its properties.
          </div>
        )}
      </div>
    </div>
  );
}
