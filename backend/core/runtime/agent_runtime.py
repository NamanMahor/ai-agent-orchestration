import logging
from langchain_core.messages import (
    SystemMessage, )

from langgraph.graph import StateGraph
from langgraph.prebuilt import ToolNode

from core.runtime.llm_factory import get_llm
from core.runtime.state import AgentState
from core.runtime.tools import load_agent_tools
from core.tools.builtin.complete_task import CompleteTaskTool

logger = logging.getLogger(__name__)

class AgentRuntime:

    def build(self, agent):
        logger.info(
            f"Building LangGraph runtime for Agent: {agent.name} (Role: {agent.role})"
        )
        llm = get_llm(agent.model)

        tools = load_agent_tools(agent)

        if agent.channels:
            tools.append(CompleteTaskTool())

        logger.debug(
            f"Loaded {len(tools)} tools for Agent '{agent.name}': {[t.name for t in tools]}"
        )

        llm_with_tools = llm.bind_tools(tools)

        async def assistant(state: AgentState):

            messages = state["messages"]
            logger.debug(
                f"Agent '{agent.name}' invokes LLM with {len(messages)} historical messages."
            )
            response = await llm_with_tools.ainvoke([
                SystemMessage(content=self._build_system_prompt(agent)),
                *messages,
            ])
            logger.debug(
                f"Agent '{agent.name}' LLM responded with: '{response.content}'"
            )

            return {"messages": [response]}

        graph = StateGraph(AgentState)

        graph.add_node(
            "assistant",
            assistant,
        )

        if tools:

            tool_node = ToolNode(tools)

            graph.add_node(
                "tools",
                tool_node,
            )

            graph.add_conditional_edges(
                "assistant",
                self._should_continue,
            )

            graph.add_edge(
                "tools",
                "assistant",
            )

        graph.set_entry_point("assistant")

        return graph.compile()

    def _should_continue(self, state):

        messages = state["messages"]

        last_message = messages[-1]

        if getattr(last_message, "tool_calls", None):
            for tc in last_message.tool_calls:
                if tc["name"] == "complete_task":
                    logger.debug("complete_task called. Ending assistant graph execution.")
                    return "__end__"
            logger.debug(
                f"Agent assistant node triggers tool calls: {last_message.tool_calls}"
            )
            return "tools"

        logger.debug(
            "Agent assistant node output does not specify tool calls. Ending graph run."
        )
        return "__end__"

    def _build_system_prompt(self, agent):
        if not agent.channels:
            return agent.system_prompt

        return "\n".join([
            agent.system_prompt,
            "Generate the output and Explicitly Ask for approval (Approve/Changes) from user. If user apporved it then call complete_task tool.",
        ])



agent_runtime = AgentRuntime()
