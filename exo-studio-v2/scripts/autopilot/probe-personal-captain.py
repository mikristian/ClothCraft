#!/usr/bin/env python3
"""Read-only health probe for the Personal Captain media server. Never POSTs."""
import json
import sys
import urllib.error
import urllib.request

URL = 'http://127.0.0.1:4739/health'


def main():
    try:
        request = urllib.request.Request(URL, method='GET', headers={'Accept': 'application/json'})
        with urllib.request.urlopen(request, timeout=3) as response:
            body = response.read(4096)
            status = response.status
        data = json.loads(body)
        is_captain = status == 200 and data.get('ok') is True and data.get('service') == 'personal-captain-engine'
        print(json.dumps({'service': 'personal-captain-engine', 'health_http': status,
                          'identity_verified': is_captain, 'coding_submission_supported': False,
                          'requests_sent': ['GET /health']}))
        return 0 if is_captain else 2
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        print(json.dumps({'service': 'personal-captain-engine', 'identity_verified': False,
                          'coding_submission_supported': False, 'error_type': type(exc).__name__}))
        return 1


if __name__ == '__main__':
    sys.exit(main())
