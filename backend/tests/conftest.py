import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.session import get_db
from app.core.config import settings


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine(settings.database_url)
    session = async_sessionmaker(engine, expire_on_commit=False)

    async def db():
        async with session() as s:
            yield s

    app.dependency_overrides[get_db] = db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()
    await engine.dispose()
