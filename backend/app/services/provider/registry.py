from typing import Dict
from .base import BaseProvider
from .openai_provider import OpenAIProvider
from .relay_provider import RelayAPIProvider, ImageToImageProvider


class ProviderRegistry:
    """Registry for managing image generation providers"""

    def __init__(self):
        self._providers: Dict[str, BaseProvider] = {}

    def register(self, name: str, provider: BaseProvider):
        self._providers[name] = provider

    def get(self, name: str) -> BaseProvider:
        if name not in self._providers:
            raise ValueError(f"Provider '{name}' not found in registry")
        return self._providers[name]

    def list_providers(self) -> list[str]:
        return list(self._providers.keys())


registry = ProviderRegistry()

registry.register("openai", OpenAIProvider())
registry.register("relay_api", RelayAPIProvider())
registry.register("relay_api_image2image", ImageToImageProvider())


def get_provider(name: str = "openai") -> BaseProvider:
    """Get provider by name, fallback to relay_api if openai not configured"""
    try:
        return registry.get(name)
    except ValueError:
        if name == "openai":
            return registry.get("relay_api")
        raise