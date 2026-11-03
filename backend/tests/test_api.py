import pytest, pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.session import get_db
from app.core.config import settings

@pytest_asyncio.fixture
async def client():
    engine=create_async_engine(settings.database_url)
    session=async_sessionmaker(engine,expire_on_commit=False)
    async def db():
        async with session() as s: yield s
    app.dependency_overrides[get_db]=db
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as c: yield c
    app.dependency_overrides.clear(); await engine.dispose()

async def login(c):
    r=await c.post('/api/auth/demo',json={'seed':False});assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['access_token']}

def subscription(**kw):
    d=dict(name='Test subscription',amount_minor=1099,currency='USD',interval='monthly',anchor_date='2026-01-31');d.update(kw);return d

async def test_crud_isolation_and_workflows(client):
    c=client; a=await login(c);b=await login(c)
    assert (await c.get('/api/subscriptions')).status_code==401
    r=await c.post('/api/subscriptions',headers=a,json=subscription());assert r.status_code==201,r.text
    sid=r.json()['id']
    assert (await c.get('/api/subscriptions',headers=b)).json()==[]
    assert (await c.put(f'/api/subscriptions/{sid}',headers=b,json=subscription())).status_code==404
    assert (await c.delete(f'/api/subscriptions/{sid}',headers=b)).status_code==404
    assert (await c.post(f'/api/subscriptions/{sid}/payments',headers=a,json={'amount_minor':1099,'charged_on':'2026-01-31'})).status_code==201
    r=await c.get('/api/analytics',headers=a);assert r.json()['monthly_totals']==[{'currency':'USD','amount_minor':1099}]
    assert r.json()['recorded_totals']==[{'currency':'USD','amount_minor':1099}]
    payload=dict(title='Charge review',subscription_id=sid,amount_minor=1099,currency='USD',charged_on='2026-01-31',reason='Forgot to cancel')
    assert (await c.post('/api/refunds',headers=b,json=payload)).status_code==404
    r=await c.post('/api/refunds',headers=a,json=payload);assert r.status_code==201,r.text
    rid=r.json()['id']
    assert (await c.get(f'/api/refunds/{rid}/message',headers=b)).status_code==404
    for lang in ('en','ru','tr'):
        assert '10.99 USD' in (await c.get(f'/api/refunds/{rid}/message?locale={lang}',headers=a)).json()['message']
    assert (await c.put(f'/api/refunds/{rid}',headers=a,json={'status':'sent','note':'Contacted support'})).status_code==200
    assert len((await c.get(f'/api/refunds/{rid}/events',headers=a)).json())==1
    assert (await c.post(f'/api/subscriptions/{sid}/cancellation',headers=a,json={'status':'confirmed'})).status_code==200
    assert (await c.get('/api/analytics',headers=a)).json()['active_count']==0
    assert (await c.delete(f'/api/subscriptions/{sid}',headers=a)).status_code==204
    await c.delete('/api/demo',headers=a);await c.delete('/api/demo',headers=b)

@pytest.mark.parametrize('changes',[{'amount_minor':-1},{'amount_minor':1.5},{'currency':'XYZ'},{'interval':'custom_days'},{'is_trial':True},{'cancellation_url':'javascript:alert(1)'},{'payment_method_label':'1234567812345678'},{'name':'   '}])
async def test_validation(client,changes):
    h=await login(client)
    assert (await client.post('/api/subscriptions',headers=h,json=subscription(**changes))).status_code==422
    await client.delete('/api/demo',headers=h)

async def test_preferences_and_demo_deletion(client):
    h=await login(client)
    assert (await client.put('/api/settings',headers=h,json={'timezone':'invalid'})).status_code==422
    assert (await client.put('/api/settings',headers=h,json={'timezone':'Europe/Istanbul','locale':'tr'})).status_code==200
    await client.delete('/api/demo',headers=h)
    assert (await client.get('/api/me',headers=h)).status_code==401
