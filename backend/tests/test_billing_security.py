from datetime import date
import time, json
from urllib.parse import urlencode
import pytest
from app.services.billing import next_billing_date, monthly_equivalent_minor, annual_equivalent_minor
from app.models.enums import BillingInterval as I
from app.core.security import compute_init_data_hash, verify_init_data, parse_telegram_user, InitDataError

def signed(**overrides):
    d={'auth_date':str(int(time.time())), 'user':json.dumps({'id':123})};d.update(overrides)
    q=urlencode(d);return q+'&hash='+compute_init_data_hash(q,'test-token')

def test_month_end_anchor():
    assert next_billing_date(date(2024,1,31),I.MONTHLY,today=date(2024,2,1))==date(2024,2,29)
    assert next_billing_date(date(2024,1,31),I.MONTHLY,today=date(2024,3,1))==date(2024,3,31)

def test_annual_rounding():
    assert annual_equivalent_minor(100,I.ANNUAL)==100
    assert monthly_equivalent_minor(100,I.ANNUAL)==8
    assert annual_equivalent_minor(7,I.WEEKLY)==364
    assert monthly_equivalent_minor(100,I.CUSTOM_DAYS,1)==3044

def test_auth_valid():
    assert parse_telegram_user(verify_init_data(signed(),'test-token')).telegram_id==123

@pytest.mark.parametrize('data',[signed(auth_date='1'),signed(auth_date=str(int(time.time())+1000)),signed()+'&user=bad',signed().replace('123','124')])
def test_auth_reject(data):
    with pytest.raises(InitDataError): verify_init_data(data,'test-token',300)
