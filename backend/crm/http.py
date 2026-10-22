"""The @api decorator: method check, auth check, JSON body parsing, error to JSON."""
import json
import logging
from functools import wraps

from django.http import JsonResponse

from .common import ApiError, JSONEncoder

log = logging.getLogger("crm")


def ok(data=None, status=200):
    return JsonResponse(
        data if data is not None else {"ok": True},
        status=status,
        encoder=JSONEncoder,
        safe=False,
    )


def api(*methods, roles=None, public=False):
    def decorator(fn):
        @wraps(fn)
        def wrapper(request, *args, **kwargs):
            try:
                if request.method not in methods:
                    raise ApiError("Method not allowed", 405)
                if not public:
                    if not request.user_row:
                        raise ApiError("Please sign in", 401)
                    if roles and request.user_row["role"] not in roles:
                        raise ApiError("You do not have access to this", 403)
                request.json = {}
                if request.content_type == "application/json" and request.body:
                    try:
                        request.json = json.loads(request.body)
                    except ValueError:
                        raise ApiError("Request body is not valid JSON")
                return fn(request, *args, **kwargs)
            except ApiError as exc:
                return JsonResponse({"error": exc.message, **exc.extra}, status=exc.status)
            except Exception:  # noqa: BLE001 - never leak internals to the client
                log.exception("Unhandled error in %s", fn.__name__)
                return JsonResponse({"error": "Something went wrong on the server"}, status=500)

        return wrapper

    return decorator
