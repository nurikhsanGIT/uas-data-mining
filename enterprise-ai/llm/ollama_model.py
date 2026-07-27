import os
from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
from utils.config import OLLAMA_BASE_URL, OLLAMA_MODEL
from langchain_core.language_models.chat_models import BaseChatModel

class OllamaModel:
    """Manages the connection to the LLM instance (Groq Cloud or local Ollama)."""
    
    def __init__(self, temperature: float = 0.2):
        groq_api_key = os.getenv("GROQ_API_KEY")
        
        if groq_api_key:
            self.llm = ChatGroq(
                model_name="llama3-8b-8192",
                temperature=temperature,
                api_key=groq_api_key
            )
        else:
            self.llm = ChatOllama(
                base_url=OLLAMA_BASE_URL,
                model=OLLAMA_MODEL,
                temperature=temperature
            )

    def get_llm(self) -> BaseChatModel:
        return self.llm
