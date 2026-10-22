"""Django settings. No ORM: DATABASES is empty and all SQL goes through crm.db (psycopg)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    env_file = BASE_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()


def _env_list(name: str, default: str) -> list[str]:
    return [v.strip() for v in os.environ.get(name, default).split(",") if v.strip()]


DEBUG = os.environ.get("DEBUG", "1") == "1"
SECRET_KEY = os.environ.get("SECRET_KEY") or (
    "dev-only-insecure-key-change-me" if DEBUG else ""
)
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set when DEBUG is off")

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = ["crm"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "crm.auth.AuthMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
APPEND_SLASH = False
DATABASES: dict = {}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"

SESSION_COOKIE_SECURE = not DEBUG
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ---- Email: console in dev, Brevo SMTP when BREVO_SMTP_USER is set ----
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "CRM <crm@example.com>")
if os.environ.get("BREVO_SMTP_USER"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ.get("BREVO_SMTP_HOST", "smtp-relay.brevo.com")
    EMAIL_PORT = int(os.environ.get("BREVO_SMTP_PORT", "587"))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.environ["BREVO_SMTP_USER"]
    EMAIL_HOST_PASSWORD = os.environ.get("BREVO_SMTP_KEY", "")
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ---- App-specific ----
CRON_SECRET = os.environ.get("CRON_SECRET", "")
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
MEDIA_ROOT = BASE_DIR / "media"  # local file storage until Backblaze B2 is connected
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
