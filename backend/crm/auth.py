"""Cookie-based login with a signed token. No sessions table, no ORM."""
from django.conf import settings
from django.core import signing
from django.http import JsonResponse

from .db import fetch_one

COOKIE = "crm_token"
SALT = "crm-auth"
MAX_AGE = 7 * 24 * 3600

USER_SQL = """
    SELECT u.id, u.email, u.full_name, u.phone, u.role_id, r.name AS role, u.is_active
    FROM users u JOIN roles r ON r.id = u.role_id
"""


def make_token(user_id: int) -> str:
    return signing.dumps({"uid": user_id}, salt=SALT)


def user_from_token(token: str | None):
    if not token:
        return None
    try:
        uid = signing.loads(token, salt=SALT, max_age=MAX_AGE)["uid"]
    except (signing.BadSignature, KeyError):
        return None
    return fetch_one(USER_SQL + " WHERE u.id = %s AND u.is_active", [uid])


def set_login_cookie(response, user_id: int):
    response.set_cookie(
        COOKIE,
        make_token(user_id),
        max_age=MAX_AGE,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
    )


def clear_login_cookie(response):
    response.delete_cookie(COOKIE)


class AuthMiddleware:
    """Loads the signed-in user onto request.user_row and blocks cross-site writes."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user_row = None
        if request.path.startswith("/api/"):
            unsafe = request.method not in ("GET", "HEAD", "OPTIONS")
            # A custom header cannot be sent cross-site without CORS, so this
            # stops other websites from making writes with the user's cookie.
            if unsafe and request.headers.get("X-CRM") != "1" and "/cron/" not in request.path:
                return JsonResponse({"error": "Missing X-CRM header"}, status=403)
            request.user_row = user_from_token(request.COOKIES.get(COOKIE))
        return self.get_response(request)
