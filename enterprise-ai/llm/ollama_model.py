from langchain_ollama import ChatOllama
from utils.config import OLLAMA_BASE_URL, OLLAMA_MODEL

class OllamaModel:
    """Manages the connection to the local Ollama LLM instance."""
    
    def __init__(self, temperature: float = 0.2):
        self.llm = ChatOllama(
            base_url=OLLAMA_BASE_URL,
            model=OLLAMA_MODEL,
            temperature=temperature
        )

    def get_llm(self) -> ChatOllama:
        return self.llm
