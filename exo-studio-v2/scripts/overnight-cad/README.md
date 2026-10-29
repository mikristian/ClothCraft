# Overnight CAD QA

Run once from the EXO ClothCraft V2 repository root:

```sh
node scripts/overnight-cad/runner.mjs
```

Optional read-only Tailscale diagnostics:

```sh
node scripts/overnight-cad/runner.mjs --tailscale --remote blender-mac.tailnet-name.ts.net
```

The runner executes six fixed CAD test scripts in order, with a 120-second timeout per check and an enforced minimum of 25 GiB free on the project filesystem before each command. It uses direct Node processes without a shell, and stops after the first failure. `--tailscale` runs only `tailscale status --json`; `--remote` additionally runs a single `tailscale ping` with a 15-second bound. Tailscale failures appear under `network` in the checkpoint and do not imply manufacturing QA approval.

The default state folder is `.overnight-cad/` in the repository. It contains `active.lock` during execution, `checkpoint.json` with results and disk readings, and `run-<id>.log` for process output. To keep all generated data outside the repository, use `--state-dir /absolute/path`. Each run atomically replaces the checkpoint and preserves timestamped logs. If interrupted, the lock remains; inspect its PID and actual process state before manually removing it. Never delete a lock while its owner is running.

This is a one-shot, unattended-safe QA command. There is no scheduler or permanently running service, and no automated AI conversation, editing, deletion, commit, push, release, or manufacturing certification. A passing result only confirms the listed checks ran successfully; existing manufacturing approval gates remain in force.

Verify the runner in temporary directories:

```sh
node --test scripts/overnight-cad/runner.test.mjs
```
