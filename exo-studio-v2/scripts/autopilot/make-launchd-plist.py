#!/usr/bin/env python3
"""Print a user LaunchAgent plist for the read-only watchdog. Never install or load it."""
import pathlib
import plistlib
import sys

if len(sys.argv) != 1:
    sys.exit('usage: python3 scripts/autopilot/make-launchd-plist.py > /tmp/exo-watchdog.plist')
root = pathlib.Path(__file__).resolve().parents[2]
script = root / 'scripts/autopilot/health-check.sh'
if not script.is_file():
    sys.exit('missing watchdog')
config = {
    'Label': 'com.exo.clothcraft.rust-health-watchdog',
    'ProgramArguments': ['/bin/sh', str(script)],
    'StartInterval': 3600,
    'RunAtLoad': True,
    'StandardOutPath': str(root / 'scripts/autopilot/watchdog.stdout.jsonl'),
    'StandardErrorPath': str(root / 'scripts/autopilot/watchdog.stderr.log'),
    'ProcessType': 'Background',
    'LowPriorityIO': True,
}
sys.stdout.buffer.write(plistlib.dumps(config,sort_keys=True))
