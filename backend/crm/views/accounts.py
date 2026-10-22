"""Login, current user, team management and the editable lookup lists."""
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing

from ..auth import USER_SQL, clear_login_cookie, set_login_cookie
from ..common import ApiError, build_update, clean, require, to_int
from ..db import execute, fetch_all, fetch_one
from ..emails import send_async
from ..http import api, ok

PUBLIC_USER_FIELDS = ("id", "email", "full_name", "phone", "role", "role_id", "is_active")


def public_user(row: dict) -> dict:
    return {key: row[key] for key in PUBLIC_USER_FIELDS}


# ---------------- authentication ----------------
@api("POST", public=True)
def login(request):
    email = (clean(request.json.get("email")) or "").lower()
    password = request.json.get("password") or ""
    row = fetch_one(
        USER_SQL.replace("u.is_active", "u.is_active, u.password") + " WHERE lower(u.email) = %s",
        [email],
    )
    if not row or not row["is_active"] or not check_password(password, row["password"]):
        raise ApiError("Wrong email or password", 401)
    response = ok({"user": public_user(row)})
    set_login_cookie(response, row["id"])
    return response


@api("POST", public=True)
def logout(request):
    response = ok()
    clear_login_cookie(response)
    return response


@api("GET", public=True)
def me(request):
    # Signed out is a normal answer, not an error, so the browser console stays clean.
    return ok({"user": public_user(request.user_row) if request.user_row else None})


@api("PATCH")
def update_profile(request):
    data = request.json
    require(data, "full_name")
    execute(
        "UPDATE users SET full_name = %s, phone = %s WHERE id = %s",
        [data["full_name"].strip(), clean(data.get("phone")), request.user_row["id"]],
    )
    row = fetch_one(USER_SQL + " WHERE u.id = %s", [request.user_row["id"]])
    return ok({"user": public_user(row)})


# ---------------- forgot / reset password (emailed link) ----------------
RESET_SALT = "crm-password-reset"
RESET_MAX_AGE = 3600  # one hour


def send_reset_email(user):
    """The token carries the end of the current password hash, so it stops working once used."""
    token = signing.dumps({"uid": user["id"], "h": user["password"][-12:]}, salt=RESET_SALT)
    link = f"{settings.APP_URL}/reset-password?token={token}"
    send_async(
        user["email"],
        "Reset your Infinyty CRM password",
        f"Hi {user['full_name']},\n\nUse this link to choose a new password. It works once and expires in one hour:\n\n{link}\n\n"
        "If you did not ask for this, you can ignore this email.\n",
        kind="password_reset",
    )


@api("POST", public=True)
def forgot_password(request):
    email = (clean(request.json.get("email")) or "").lower()
    row = fetch_one(
        "SELECT id, email, full_name, password FROM users WHERE lower(email) = %s AND is_active", [email]
    ) if email else None
    if row:
        send_reset_email(row)
    # Same answer either way, so nobody can use this to find out who has an account.
    return ok({"message": "If that email belongs to a team member, a reset link is on its way."})


@api("POST")
def request_my_reset(request):
    row = fetch_one(
        "SELECT id, email, full_name, password FROM users WHERE id = %s", [request.user_row["id"]]
    )
    send_reset_email(row)
    return ok({"message": f"Reset link sent to {row['email']}"})


@api("POST", public=True)
def reset_password(request):
    new = request.json.get("new_password") or ""
    if len(new) < 8:
        raise ApiError("New password must be at least 8 characters")
    try:
        payload = signing.loads(request.json.get("token") or "", salt=RESET_SALT, max_age=RESET_MAX_AGE)
    except signing.BadSignature:
        raise ApiError("This reset link is invalid or has expired. Ask for a new one.", 400)
    row = fetch_one("SELECT id, password FROM users WHERE id = %s AND is_active", [payload["uid"]])
    if not row or row["password"][-12:] != payload["h"]:
        raise ApiError("This reset link has already been used. Ask for a new one.", 400)
    execute("UPDATE users SET password = %s WHERE id = %s", [make_password(new), row["id"]])
    return ok()


@api("POST")
def change_password(request):
    current = request.json.get("current_password") or ""
    new = request.json.get("new_password") or ""
    if len(new) < 8:
        raise ApiError("New password must be at least 8 characters")
    row = fetch_one("SELECT password FROM users WHERE id = %s", [request.user_row["id"]])
    if not check_password(current, row["password"]):
        raise ApiError("Current password is wrong", 400)
    execute("UPDATE users SET password = %s WHERE id = %s", [make_password(new), request.user_row["id"]])
    return ok()


# ---------------- users ----------------
@api("GET", "POST")
def users(request):
    user = request.user_row
    if request.method == "GET":
        rows = fetch_all(USER_SQL + " ORDER BY u.is_active DESC, r.id, u.full_name")
        if user["role"] != "admin":  # others only need names for dropdowns
            rows = [{**r, "email": None, "phone": None} for r in rows]
        return ok({"users": [public_user(r) for r in rows]})

    if user["role"] != "admin":
        raise ApiError("Only CRM Administrators can add team members", 403)
    data = request.json
    require(data, "email", "full_name", "role_id", "password")
    if len(data["password"]) < 8:
        raise ApiError("Password must be at least 8 characters")
    if fetch_one("SELECT 1 FROM users WHERE lower(email) = lower(%s)", [data["email"].strip()]):
        raise ApiError("A user with this email already exists", 409)
    row = execute(
        "INSERT INTO users (email, password, full_name, phone, role_id) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
        [
            data["email"].strip().lower(),
            make_password(data["password"]),
            data["full_name"].strip(),
            clean(data.get("phone")),
            to_int(data["role_id"], "role"),
        ],
    )
    return ok({"id": row["id"]}, 201)


@api("PATCH", roles=("admin",))
def user_detail(request, user_id):
    data = request.json
    sets, params = build_update("users", ("full_name", "phone", "role_id", "is_active"), data)
    if data.get("password"):
        if len(data["password"]) < 8:
            raise ApiError("Password must be at least 8 characters")
        sets.append("password = %s")
        params.append(make_password(data["password"]))
    if user_id == request.user_row["id"] and (
        data.get("is_active") is False or ("role_id" in data and int(data["role_id"]) != request.user_row["role_id"])
    ):
        raise ApiError("You cannot deactivate or change the role of your own account")
    if not sets:
        raise ApiError("Nothing to update")
    row = execute(f"UPDATE users SET {', '.join(sets)} WHERE id = %s RETURNING id", [*params, user_id])
    if not row:
        raise ApiError("User not found", 404)
    return ok()


# ---------------- lookups ----------------
EDITABLE_LOOKUPS = (
    "lead_sources",
    "lost_reasons",
    "activity_types",
    "call_outcomes",
    "revision_types",
    "revision_statuses",
    "tech_stacks",
)


def _json_list(sql):
    return f"(SELECT coalesce(json_agg(t), '[]'::json) FROM ({sql}) t)"


# One statement for all lists: a single trip to the database instead of nine.
LOOKUPS_SQL = "SELECT json_build_object({}) AS data".format(
    ", ".join(
        [
            "'roles', " + _json_list("SELECT id, name FROM roles ORDER BY id"),
            "'stages', "
            + _json_list(
                "SELECT s.id, s.name, s.position, s.owner_role, r.name AS owner_role_name "
                "FROM pipeline_stages s LEFT JOIN roles r ON r.id = s.owner_role ORDER BY s.position"
            ),
        ]
        + [f"'{table}', " + _json_list(f"SELECT id, name FROM {table} ORDER BY id") for table in EDITABLE_LOOKUPS]
    )
)


@api("GET")
def lookups(request):
    return ok(fetch_one(LOOKUPS_SQL)["data"])


# Where each list is used, so Settings can show how many records rely on every value.
LIST_USAGE = {
    "lead_sources": "leads WHERE source_id",
    "lost_reasons": "leads WHERE lost_reason_id",
    "activity_types": "activities WHERE type_id",
    "call_outcomes": "activities WHERE outcome_id",
    "revision_types": "prototype_revisions WHERE type_id",
    "revision_statuses": "prototype_revisions WHERE status_id",
    "tech_stacks": "requirement_tech_stacks WHERE tech_stack_id",
}


@api("GET", roles=("admin",))
def settings_lists(request):
    """Every dropdown list with its values, when each was added, and how often it is used."""
    parts = []
    for table in EDITABLE_LOOKUPS:
        usage = LIST_USAGE[table]
        parts.append(
            f"'{table}', " + _json_list(
                f"SELECT x.id, x.name, x.created_at, (SELECT count(*) FROM {usage} = x.id) AS used FROM {table} x ORDER BY x.id"
            )
        )
    parts.append(
        "'stages', " + _json_list(
            "SELECT s.id, s.name, s.position, r.name AS owner_role FROM pipeline_stages s "
            "LEFT JOIN roles r ON r.id = s.owner_role ORDER BY s.position"
        )
    )
    return ok(fetch_one("SELECT json_build_object(" + ", ".join(parts) + ") AS data")["data"])


@api("POST", roles=("admin",))
def lookup_add(request, table):
    if table not in EDITABLE_LOOKUPS:
        raise ApiError("Unknown list", 404)
    require(request.json, "name")
    name = request.json["name"].strip()
    if fetch_one(f"SELECT 1 FROM {table} WHERE lower(name) = lower(%s)", [name]):
        raise ApiError("That value already exists", 409)
    row = execute(f"INSERT INTO {table} (name) VALUES (%s) RETURNING id", [name])
    return ok({"id": row["id"]}, 201)


@api("PATCH", "DELETE", roles=("admin",))
def lookup_item(request, table, item_id):
    if table not in EDITABLE_LOOKUPS:
        raise ApiError("Unknown list", 404)
    if request.method == "PATCH":
        require(request.json, "name")
        execute(f"UPDATE {table} SET name = %s WHERE id = %s", [request.json["name"].strip(), item_id])
        return ok()
    try:
        execute(f"DELETE FROM {table} WHERE id = %s", [item_id])
    except Exception:  # noqa: BLE001 - foreign key: value is still in use
        raise ApiError("This value is in use, so it cannot be deleted. Rename it instead.", 409)
    return ok()
