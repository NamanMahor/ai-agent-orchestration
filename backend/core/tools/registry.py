from typing import Dict

from langchain_core.tools import BaseTool


class ToolRegistry:

    def __init__(self):

        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):

        self._tools[tool.name] = tool

    def get(self, name: str):

        return self._tools.get(name)

    def list(self):

        return list(self._tools.values())


tool_registry = ToolRegistry()
