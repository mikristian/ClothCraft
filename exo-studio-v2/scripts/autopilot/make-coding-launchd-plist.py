#!/usr/bin/env python3
"""Print a 5-minute opt-in launchd coding worker plist. Never installs it."""
import pathlib,plistlib,sys
root=pathlib.Path(__file__).resolve().parents[2]
home=pathlib.Path.home()
out=home/'Library/Application Support/exo-rust-candidates'
sys.stdout.buffer.write(plistlib.dumps({
 'Label':'com.exo.clothcraft.rust-candidate-worker',
 'ProgramArguments':['/usr/local/bin/node',str(root/'scripts/autopilot/coding-worker.mjs')],
 'StartInterval':300,'RunAtLoad':False,'ProcessType':'Background',
 'LowPriorityIO':True,'StandardOutPath':str(out/'launchd.stdout.jsonl'),
 'StandardErrorPath':str(out/'launchd.stderr.log'),
 'EnvironmentVariables':{'PATH':str(home/'.cargo/bin')+':/usr/local/bin:/usr/bin:/bin'},
},sort_keys=True))
