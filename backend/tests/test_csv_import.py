import pytest
from tests.test_api import login

CSV = "name,amount,currency,interval,anchor_date\nStudio,9.99,USD,monthly,2026-12-01\nStudio,9.99,USD,monthly,2026-12-01\nBroken,-5,USD,monthly,2026-12-01\n"


async def test_preview_commit_repeat_and_isolation(client):
    a = await login(client)
    b = await login(client)
    preview = await client.post(
        "/api/import/subscriptions/preview", headers=a, json={"content": CSV}
    )
    assert preview.status_code == 200, preview.text
    assert [r["status"] for r in preview.json()["rows"]] == [
        "ready",
        "duplicate",
        "invalid",
    ]
    assert (await client.get("/api/subscriptions", headers=a)).json() == []
    assert (
        await client.post(
            "/api/import/subscriptions",
            headers=a,
            json={"content": CSV, "selected_rows": [2, 4]},
        )
    ).status_code == 422
    assert (await client.get("/api/subscriptions", headers=a)).json() == []
    r = await client.post(
        "/api/import/subscriptions",
        headers=a,
        json={"content": CSV, "selected_rows": [2]},
    )
    assert r.json() == {"imported": 1, "skipped": 0}
    assert (
        await client.post(
            "/api/import/subscriptions",
            headers=a,
            json={"content": CSV, "selected_rows": [2]},
        )
    ).json() == {"imported": 0, "skipped": 1}
    assert (await client.get("/api/subscriptions", headers=b)).json() == []
    assert (
        await client.post(
            "/api/import/subscriptions/preview", headers=b, json={"content": CSV}
        )
    ).json()["rows"][0]["status"] == "ready"
    await client.delete("/api/demo", headers=a)
    await client.delete("/api/demo", headers=b)


async def test_mapping_semicolon_decimal_and_quoted_names(client):
    h = await login(client)
    csv = 'Название;Цена;Валюта;Период;Дата\n"Studio; Premium";"12,50";EUR;monthly;2026-12-01\n'
    r = await client.post(
        "/api/import/subscriptions/preview", headers=h, json={"content": csv}
    )
    assert r.json()["needs_mapping"]
    mapping = dict(
        zip(
            ["name", "amount", "currency", "interval", "anchor_date"],
            ["Название", "Цена", "Валюта", "Период", "Дата"],
        )
    )
    r = await client.post(
        "/api/import/subscriptions",
        headers=h,
        json={"content": csv, "mapping": mapping, "selected_rows": [2]},
    )
    assert r.json()["imported"] == 1, r.text
    sub = (await client.get("/api/subscriptions", headers=h)).json()[0]
    assert sub["name"] == "Studio; Premium" and sub["amount_minor"] == 1250
    await client.delete("/api/demo", headers=h)


@pytest.mark.parametrize(
    "content",
    [
        "name,name\na,b",
        "name,amount,currency,interval,anchor_date\n"
        + ("a,1,USD,monthly,2026-12-01\n" * 201),
        "x" * 65537,
    ],
)
async def test_limits(client, content):
    h = await login(client)
    assert (
        await client.post(
            "/api/import/subscriptions/preview", headers=h, json={"content": content}
        )
    ).status_code == 422
    await client.delete("/api/demo", headers=h)


async def test_concurrent_imports_only_create_one_subscription(client):
    import asyncio

    h = await login(client)
    body = {"content": CSV, "selected_rows": [2]}
    a, b = await asyncio.gather(
        client.post("/api/import/subscriptions", headers=h, json=body),
        client.post("/api/import/subscriptions", headers=h, json=body),
    )
    assert a.status_code == b.status_code == 200
    assert a.json()["imported"] + b.json()["imported"] == 1
    assert len((await client.get("/api/subscriptions", headers=h)).json()) == 1
    await client.delete("/api/demo", headers=h)
