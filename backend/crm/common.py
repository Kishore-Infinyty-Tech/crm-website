"""Shared helpers: errors, input cleaning, and the role-based lead scope."""
import datetime
import decimal
import json

from .db import fetch_one


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400, **extra):
        super().__init__(message)
        self.message = message
        self.status = status
        self.extra = extra


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        if isinstance(o, (datetime.datetime, datetime.date)):
            return o.isoformat()
        return super().default(o)


def clean(value):
    """Trim strings; turn empty strings into None so they are stored as NULL."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def to_int(value, field="value"):
    value = clean(value)
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ApiError(f"{field} must be a number")


def to_num(value, field="value"):
    value = clean(value)
    if value is None:
        return None
    try:
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        raise ApiError(f"{field} must be a number")


def parse_dt(value, field="date"):
    value = clean(value)
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value
    try:
        parsed = datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        raise ApiError(f"{field} is not a valid date and time")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime.timezone.utc)
    return parsed


def require(data: dict, *names):
    for name in names:
        if clean(data.get(name)) is None:
            raise ApiError(f"{name.replace('_', ' ')} is required")


def build_update(table: str, allowed: tuple, data: dict, convert=None):
    """Build 'SET a=%s, b=%s' from a whitelist of column names (never from user input)."""
    sets, params = [], []
    convert = convert or {}
    for column in allowed:
        if column in data:
            value = clean(data[column])
            if column in convert:
                value = convert[column](value)
            sets.append(f"{column}=%s")
            params.append(value)
    return sets, params


def lead_scope(user: dict, alias: str = "l"):
    """SQL fragment limiting leads to what this user may see (see Database Guide)."""
    role = user["role"]
    if role == "admin":
        return "TRUE", []
    if role == "analyst":
        return (
            f"({alias}.assigned_to = %s OR {alias}.stage_id IN "
            "(SELECT id FROM pipeline_stages WHERE position >= "
            "(SELECT position FROM pipeline_stages WHERE name = 'prototype')))",
            [user["id"]],
        )
    return f"({alias}.created_by = %s OR {alias}.assigned_to = %s)", [user["id"], user["id"]]


def get_lead(user: dict, lead_id: int, conn=None) -> dict:
    scope_sql, scope_params = lead_scope(user)
    lead = fetch_one(
        f"SELECT l.* FROM leads l WHERE l.id = %s AND {scope_sql}",
        [lead_id, *scope_params],
        conn=conn,
    )
    if not lead:
        raise ApiError("Lead not found", 404)
    return lead
