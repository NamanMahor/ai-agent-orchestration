from core.tools.registry import tool_registry

from core.tools.builtin.web_search_tool import (
    WebSearchTool, )

tool_registry.register(WebSearchTool())

