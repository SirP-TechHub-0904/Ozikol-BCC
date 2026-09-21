"""
Application configuration — loaded from environment variables / .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False

    # CORS — comma-separated list of allowed origins
    # e.g. "http://localhost:4200,https://app.ozikol.com"
    allowed_origins: str = "*"

    # Cloudinary (required for Phase 3 upload)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # DeepSeek AI Engine
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    # Crawl limits
    max_pages: int = 100
    request_timeout: int = 20
    max_concurrent_requests: int = 10

    @property
    def origins_list(self) -> list[str]:
        if self.allowed_origins == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def cloudinary_configured(self) -> bool:
        return bool(
            self.cloudinary_cloud_name and
            self.cloudinary_api_key and
            self.cloudinary_api_secret
        )

    @property
    def deepseek_configured(self) -> bool:
        return bool(self.deepseek_api_key)


settings = Settings()
