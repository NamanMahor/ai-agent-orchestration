from langchain_ollama import ChatOllama

from core.llm.base import LLMProvider


class OllamaProvider(LLMProvider):

    def to_langchain(self, model_config):

        return ChatOllama(model=model_config.name,
                          temperature=model_config.temperature,
                          **model_config.config)
