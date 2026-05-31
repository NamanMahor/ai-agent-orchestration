from langchain_openai import ChatOpenAI

from core.llm.base import LLMProvider


class OpenAIProvider(LLMProvider):

    def to_langchain(self, model_config):

        return ChatOpenAI(model=model_config.name,
                          temperature=model_config.temperature,
                          **model_config.config)
