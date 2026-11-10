"""Bounded, preview-first CSV import using the same validation as individual entries."""

import csv
import io
import re
from decimal import Decimal
from pydantic import BaseModel, Field, ValidationError
from fastapi import HTTPException
from app.api.validation import SubscriptionInput

FIELDS = (
    "name",
    "amount",
    "currency",
    "interval",
    "anchor_date",
    "provider",
    "notes",
    "is_trial",
    "trial_end_date",
    "interval_days",
)
REQUIRED = set(FIELDS[:5])


class CsvRequest(BaseModel):
    content: str = Field(max_length=65536)
    mapping: dict[str, str] = Field(default_factory=dict, max_length=10)
    selected_rows: list[int] = Field(default_factory=list, max_length=200)


def identity(s):
    def get(k):
        return getattr(s, k) if not isinstance(s, dict) else s.get(k)

    return (
        get("name").strip().casefold(),
        get("amount_minor"),
        get("currency"),
        get("interval"),
        get("interval_days"),
        get("anchor_date"),
        get("is_trial"),
        get("trial_end_date"),
    )


def inspect_csv(body, existing):
    if len(body.content.encode("utf-8")) > 65536:
        raise HTTPException(422, "csv_too_large")
    raw = body.content.lstrip("\ufeff")
    try:
        try:
            dialect = csv.Sniffer().sniff(raw[:8192], delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(io.StringIO(raw), dialect=dialect, strict=True)
        headers = reader.fieldnames or []
        if (
            not headers
            or len(headers) > 30
            or len(set(headers)) != len(headers)
            or any(not h.strip() for h in headers)
        ):
            raise ValueError()
        rows = []
        for r in reader:
            if len(rows) >= 200 or None in r:
                raise ValueError()
            rows.append(r)
    except (csv.Error, ValueError):
        raise HTTPException(422, "csv_invalid")
    mapping = body.mapping or {f: f for f in FIELDS if f in headers}
    if any(k not in FIELDS or v not in headers for k, v in mapping.items()) or len(
        set(mapping.values())
    ) != len(mapping):
        raise HTTPException(422, "csv_mapping")
    if not REQUIRED.issubset(mapping):
        return {
            "headers": headers,
            "mapping": mapping,
            "needs_mapping": True,
            "rows": [],
        }
    known = {identity(s) for s in existing}
    preview = []
    for number, row in enumerate(rows, 2):
        item = {
            "row": number,
            "name": row.get(mapping["name"], ""),
            "status": "invalid",
            "errors": [],
            "data": None,
        }
        try:
            values = {key: (row.get(col) or "").strip() for key, col in mapping.items()}
            amount = values.pop("amount").replace(",", ".")
            if not re.fullmatch(r"\d+(\.\d{1,2})?", amount):
                raise ValueError("amount")
            values["amount_minor"] = int(Decimal(amount) * 100)
            trial = values.get("is_trial", "").lower()
            if trial not in ("", "true", "false", "1", "0"):
                raise ValueError("is_trial")
            values["is_trial"] = trial in ("true", "1")
            if not values.get("trial_end_date"):
                values["trial_end_date"] = None
            days = values.get("interval_days")
            values["interval_days"] = int(days) if days else None
            sub = SubscriptionInput.model_validate(values)
            key = identity(sub)
            item["data"] = sub.model_dump(mode="json")
            item["status"] = "duplicate" if key in known else "ready"
            known.add(key)
        except ValidationError as exc:
            item["errors"] = [
                {"field": ".".join(map(str, e["loc"])), "code": e["type"]}
                for e in exc.errors()
            ]
        except (ValueError, TypeError):
            item["errors"] = [{"field": "amount / dates / trial", "code": "invalid"}]
        preview.append(item)
    return {
        "headers": headers,
        "mapping": mapping,
        "needs_mapping": False,
        "rows": preview,
    }
