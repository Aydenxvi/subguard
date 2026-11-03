"""Command rendering without Telegram network calls."""

import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest

spec = importlib.util.spec_from_file_location(
    "subguard_bot", Path(__file__).parents[2] / "bot" / "app" / "main.py"
)
bot_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bot_module)


@pytest.mark.parametrize("locale", ["en", "ru", "tr"])
async def test_start_command(locale, monkeypatch):
    monkeypatch.setenv("MINI_APP_URL", "https://subguard.example")
    message = SimpleNamespace(
        chat=SimpleNamespace(type="private"),
        from_user=SimpleNamespace(language_code=locale),
        answer=AsyncMock(),
    )
    await bot_module.start(message)
    message.answer.assert_awaited_once()
    args = message.answer.call_args
    assert bot_module.COPY[locale][0] in args.args[0]
    assert (
        args.kwargs["reply_markup"].inline_keyboard[0][0].web_app.url
        == "https://subguard.example"
    )
