import uuid
from typing import Any, List, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from core.llm.base import LLMProvider


class MockChatModel(BaseChatModel):
    model_name: str
    temperature: float = 0.7
    bound_tools: List[Any] = []

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:

        last_message = messages[-1].content if messages else ""
        system_prompt = next(
            (m.content for m in messages if isinstance(m, SystemMessage)), "")

        is_tool_response = False
        for msg in reversed(messages):
            if msg.type == "tool":
                is_tool_response = True
                break

        if self.bound_tools and not is_tool_response:
            query_lower = last_message.lower()
            triggered_tool = None
            for tool in self.bound_tools:
                tool_name = getattr(tool, "name", "")
                if tool_name == "web_search" and ("search" in query_lower
                                                  or "find" in query_lower
                                                  or "google" in query_lower):
                    triggered_tool = tool
                    break
                elif tool_name == "http_request" and (
                        "http" in query_lower or "api" in query_lower
                        or "get" in query_lower or "post" in query_lower):
                    triggered_tool = tool
                    break

            if (not triggered_tool and len(self.bound_tools) > 0
                    and ("tool" in query_lower or "use" in query_lower)):
                triggered_tool = self.bound_tools[0]

            if triggered_tool:
                tool_name = triggered_tool.name
                tool_call = {
                    "name":
                    tool_name,
                    "args": ({
                        "query": last_message
                    } if tool_name == "web_search" else {
                        "url": "https://api.github.com",
                        "method": "GET",
                    }),
                    "id":
                    f"call_{uuid.uuid4().hex[:12]}",
                    "type":
                    "tool_call",
                }
                ai_message = AIMessage(
                    content=
                    f"Let me run the tool '{tool_name}' to find that information.",
                    tool_calls=[tool_call],
                )
                return ChatResult(
                    generations=[ChatGeneration(message=ai_message)])

        response_text = f"[Agent: Mock Model '{self.model_name}']\n"
        if ("research" in system_prompt.lower()
                or "researcher" in system_prompt.lower()):
            response_text += f"Based on my analysis of '{last_message}', I've gathered key insights showing that the topic is highly relevant, focusing on automated orchestration and intelligent workflows. Modern AI platforms are transitioning from isolated chat tools to comprehensive multi-agent systems."
        elif ("writer" in system_prompt.lower()
              or "author" in system_prompt.lower()):
            response_text += f"Here is the written article for '{last_message}':\n\n# The Rise of Agentic AI\nAutonomous agents are reshaping how tasks are executed. By chaining specialized agents (Researchers, Writers, Editors) under a single visual graph, we create resilient loops capable of solving complex problems."
        elif ("editor" in system_prompt.lower()
              or "review" in system_prompt.lower()):
            response_text += "I have reviewed the previous content. The article is solid, well-structured, and articulates the benefits of visual workflow orchestration clearly. I approve this version with high confidence."
        else:
            response_text += f"Hello! I received your message: '{last_message}'. As an AI assistant configured with prompt: '{system_prompt[:60]}...', I am processing this task and routing it through the pipeline."

        ai_message = AIMessage(content=response_text)

        ai_message.response_metadata = {
            "token_usage": {
                "prompt_tokens":
                len(last_message.split()) + len(system_prompt.split()) + 15,
                "completion_tokens":
                len(response_text.split()),
                "total_tokens":
                len(last_message.split()) + len(system_prompt.split()) +
                len(response_text.split()) + 15,
            },
            "model_name": self.model_name,
        }
        return ChatResult(generations=[ChatGeneration(message=ai_message)])

    def bind_tools(self, tools: List[Any], **kwargs: Any) -> "MockChatModel":
        self.bound_tools = tools
        return self

    @property
    def _llm_type(self) -> str:
        return "mock-chat-model"


class MockProvider(LLMProvider):

    def to_langchain(self, model_config):

        return MockChatModel(
            model_name=model_config.name,
            temperature=model_config.temperature,
        )
