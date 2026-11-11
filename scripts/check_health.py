"""Bounded readiness check for a local Docker deployment; no remote target or token needed."""

import json
import time
import urllib.error
import urllib.request

for attempt in range(30):
    try:
        with urllib.request.urlopen(
            "http://127.0.0.1:8080/api/health", timeout=2
        ) as response:
            if response.status == 200 and json.load(response).get("status") == "ok":
                print("Application HTTP health: OK")
                break
    except (OSError, ValueError, urllib.error.URLError):
        pass
    time.sleep(2)
else:
    raise SystemExit("Application did not become healthy within the readiness window.")
