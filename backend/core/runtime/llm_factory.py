import logging

from core.llm.providers.ollama_provider import (
    OllamaProvider, )
from core.llm.providers.mock_provider import (
    MockProvider, )
from core.llm.providers.openai_provider import (
    OpenAIProvider, )

logger = logging.getLogger(__name__)

PROVIDERS = {
    "ollama": OllamaProvider(),
    "mock": MockProvider(),
    "openai": OpenAIProvider(),
}


def get_llm(model_config):
    logger.debug(
        f"Initializing LLM provider: '{model_config.provider}' with model name: '{model_config.name}'"
    )
    provider = PROVIDERS.get(model_config.provider)

    if not provider:
        logger.error(
            f"Failed to find LLM provider '{model_config.provider}' in registry."
        )
        raise Exception(f"Unknown provider: {model_config.provider}")

    return provider.to_langchain(model_config)
