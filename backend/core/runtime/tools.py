from core.tools.registry import tool_registry


def load_agent_tools(agent):

    tools = []

    for tool_ref in agent.tools:

        tool = tool_registry.get(tool_ref.name)

        if tool:
            tools.append(tool)

    return tools
