"""Attachments (stored via crm.storage) and the cron endpoint for reminder emails."""
import re
import uuid

from django.conf import settings
from django.http import FileResponse, HttpResponseRedirect, JsonResponse

from ..common import ApiError, get_lead, to_int
from ..db import execute, fetch_all, fetch_one
from ..http import api, ok
from ..reminders import send_due_reminders
from ..storage import get_storage

MAX_BYTES = 15 * 1024 * 1024


@api("GET", "POST")
def attachments(request, lead_id):
    user = request.user_row
    get_lead(user, lead_id)
    if request.method == "GET":
        rows = fetch_all(
            "SELECT a.id, a.file_name, a.size_bytes, a.revision_id, a.created_at, u.full_name AS uploaded_by "
            "FROM attachments a LEFT JOIN users u ON u.id = a.uploaded_by WHERE a.lead_id = %s ORDER BY a.created_at DESC",
            [lead_id],
        )
        return ok({"attachments": rows, "storage": get_storage().name})

    upload = request.FILES.get("file")
    if not upload:
        raise ApiError("Choose a file to upload")
    if upload.size > MAX_BYTES:
        raise ApiError("Files can be at most 15 MB")
    safe_name = re.sub(r"[^A-Za-z0-9._ -]", "_", upload.name)[:120]
    key = f"leads/{lead_id}/{uuid.uuid4().hex}-{safe_name}"
    get_storage().save(key, upload, upload.content_type)
    row = execute(
        "INSERT INTO attachments (lead_id, revision_id, uploaded_by, file_name, storage_key, size_bytes) "
        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        [lead_id, to_int(request.POST.get("revision_id")), user["id"], safe_name, key, upload.size],
    )
    return ok({"id": row["id"]}, 201)


@api("GET", "DELETE")
def attachment_item(request, attachment_id):
    user = request.user_row
    row = fetch_one("SELECT * FROM attachments WHERE id = %s", [attachment_id])
    if not row:
        raise ApiError("File not found", 404)
    get_lead(user, row["lead_id"])
    storage = get_storage()
    if request.method == "DELETE":
        if user["role"] == "business_development_executive" and row["uploaded_by"] != user["id"]:
            raise ApiError("You can only delete files you uploaded", 403)
        storage.delete(row["storage_key"])
        execute("DELETE FROM attachments WHERE id = %s", [attachment_id])
        return ok()
    url = storage.download_url(row["storage_key"], row["file_name"])
    if url:
        return HttpResponseRedirect(url)
    return FileResponse(storage.open(row["storage_key"]), as_attachment=True, filename=row["file_name"])


def cron_reminders(request):
    """Called by a free scheduler (cron-job.org, GitHub Actions) with ?token=CRON_SECRET."""
    if not settings.CRON_SECRET or request.GET.get("token") != settings.CRON_SECRET:
        return JsonResponse({"error": "Forbidden"}, status=403)
    return JsonResponse(send_due_reminders())
