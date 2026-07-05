"""
Turns a (provider, model, api_key) triple from the frontend's "Connect your
LLM" onboarding step into a LangChain chat model instance. Nothing here is
persisted — the key lives only for the duration of the request.
"""

from __future__ import annotations

from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel

from app.models import LLMCredentials


def get_llm(creds: LLMCredentials, temperature: float = 0.4) -> BaseChatModel:
    provider = creds.provider
    model = creds.model
    key = creds.api_key

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, api_key=key, temperature=temperature)

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, api_key=key, temperature=temperature)

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model, google_api_key=key, temperature=temperature)

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(model=model, api_key=key, temperature=temperature)

    if provider == "mistral":
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(model=model, api_key=key, temperature=temperature)

    raise ValueError(f"Unsupported provider: {provider}")
