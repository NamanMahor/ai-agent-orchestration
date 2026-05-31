from abc import ABC, abstractmethod


class LLMProvider(ABC):

    @abstractmethod
    def to_langchain(self, model_config):
        pass
