"""KYC and credit integration services with live API support and mock fallback."""
import os
import json
import random
import hashlib
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError
from django.utils import timezone


def _post_json(url, payload, headers=None, timeout=10):
    body = json.dumps(payload).encode('utf-8')
    req = urllib_request.Request(url=url, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib_request.urlopen(req, timeout=timeout) as resp:
        data = resp.read().decode('utf-8')
        return json.loads(data) if data else {}


def _mock_aadhaar(aadhaar_number):
    return {
        'verified': True,
        'name': 'Customer Name',
        'dob': '1990-01-15',
        'gender': 'M',
        'address': 'Sample Address, City, State - 123456',
        'verified_at': timezone.now().isoformat(),
        'reference_id': f'AAD-{random.randint(100000, 999999)}',
        'integration_mode': 'mock',
    }


def _mock_pan(pan_number):
    return {
        'verified': True,
        'name': 'Customer Name',
        'pan_status': 'Active',
        'verified_at': timezone.now().isoformat(),
        'reference_id': f'PAN-{random.randint(100000, 999999)}',
        'integration_mode': 'mock',
    }


def _mock_credit(bureau, pan_number):
    seed = f"{(bureau or '').lower()}:{(pan_number or '').strip().upper()}"
    rng = random.Random(seed)
    seed_digest = hashlib.sha256(seed.encode('utf-8')).hexdigest()[:8].upper()
    score = rng.randint(550, 850)
    return {
        'bureau': bureau,
        'score': score,
        'score_range': '300-900',
        'risk_category': 'Low' if score >= 750 else 'Medium' if score >= 650 else 'High',
        'accounts_found': rng.randint(1, 5),
        'enquiries_last_6m': rng.randint(0, 3),
        'overdue_accounts': 0 if score >= 700 else rng.randint(0, 2),
        'checked_at': timezone.now().isoformat(),
        'reference_id': f'{bureau.upper()}-MOCK-{seed_digest}',
        'integration_mode': 'mock',
    }


def verify_aadhaar(aadhaar_number):
    """Verify Aadhaar via provider when configured; fallback to mock."""
    base_url = os.getenv('KYC_PROVIDER_BASE_URL', '').strip()
    api_key = os.getenv('KYC_PROVIDER_API_KEY', '').strip()
    if not base_url or not api_key:
        return _mock_aadhaar(aadhaar_number)

    try:
        result = _post_json(
            f"{base_url.rstrip('/')}/aadhaar/verify",
            {'aadhaar_number': aadhaar_number},
            headers={'Authorization': f'Bearer {api_key}'}
        )
        result['integration_mode'] = 'live'
        return result
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        return _mock_aadhaar(aadhaar_number)


def verify_pan(pan_number):
    """Verify PAN via provider when configured; fallback to mock."""
    base_url = os.getenv('KYC_PROVIDER_BASE_URL', '').strip()
    api_key = os.getenv('KYC_PROVIDER_API_KEY', '').strip()
    if not base_url or not api_key:
        return _mock_pan(pan_number)

    try:
        result = _post_json(
            f"{base_url.rstrip('/')}/pan/verify",
            {'pan_number': pan_number},
            headers={'Authorization': f'Bearer {api_key}'}
        )
        result['integration_mode'] = 'live'
        return result
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        return _mock_pan(pan_number)


def check_credit_score(bureau, pan_number):
    """Check CIBIL/CRIF score via configured bureau endpoint; fallback to mock."""
    bureau = (bureau or '').lower()
    if bureau not in ['cibil', 'crif']:
        return _mock_credit('cibil', pan_number)

    if bureau == 'cibil':
        base_url = os.getenv('CIBIL_BASE_URL', '').strip()
        api_key = os.getenv('CIBIL_API_KEY', '').strip()
    else:
        base_url = os.getenv('CRIF_BASE_URL', '').strip()
        api_key = os.getenv('CRIF_API_KEY', '').strip()

    if not base_url or not api_key:
        return _mock_credit(bureau, pan_number)

    try:
        result = _post_json(
            f"{base_url.rstrip('/')}/credit/check",
            {'pan_number': pan_number, 'bureau': bureau},
            headers={'Authorization': f'Bearer {api_key}'}
        )
        result['bureau'] = bureau
        result['integration_mode'] = 'live'
        return result
    except (URLError, HTTPError, TimeoutError, ValueError, KeyError):
        return _mock_credit(bureau, pan_number)
