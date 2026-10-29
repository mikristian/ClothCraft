# Jarvis ZIP Markdown handoff - source discovery

**Status: BLOCKED. The requested ZIP has not been provided or identified.**

User request: review every Markdown in a ZIP from Jarvis, implement actionable
items, and delegate independent workstreams to subagents.

## Sources checked

- Two subagents independently examined the approved Mac shared workspace.
  One inspected 66 ZIP candidate manifests after excluding dependency/vendor
  bundles. No contemporary Jarvis multi-Markdown handoff ZIP was found.
- ChatGPT Library: listed all 170 ZIP entries. Older Jarvis dashboard,
  voice, sprites and transcript ZIPs are historical unrelated projects.
- The jarvis_transcripts.zip archive contains only one README Markdown,
  a channels text list and Python program.
- The openclaw-action-first-execution.zip archive contains three unrelated
  install/agent-skill Markdown files.
- Current EXO project Jarvis-origin references exist, but there is no
  evidence any appeared in the intended ZIP. Relevant references:
  integrations/clothcraft/JARVIS_WORKSPACE_REVIEW_2026-10-16.md;
  docs/JARVIS_WORKER_HANDOFF_CPP_RUST_PPF_2026-10-14.md;
  docs/JARVIS_CONTACT_STRAIN_REVIEW_2026-10-13.md;
  docs/JARVIS_THOMAS_PPF_IPC_GUARD_2026-10-13.md.

## Prepared work

- Created scripts/index-jarvis-md-zip.py at project root. It safely indexes
  source Markdown without extracting or executing archived instructions,
  records content hashes, headings and checkboxes, proposes workstreams, and
  writes a per-document JSON and Markdown completion tracker.
- A synthetic ZIP self-test indexed two valid Markdown documents and rejected
  a traversal member. It did not process or implement any Jarvis handoff.

Run when the actual ZIP is available:

    python3 scripts/index-jarvis-md-zip.py PATH_TO_ZIP --output-dir docs/research/jarvis-md-zip-review

## Candidate future subagent ownership

1. ZIP provenance, deduplication, MD acceptance criteria.
2. Rust/C++ garment engine, fit, collisions and physics QA.
3. Pattern authoring, graphics, 2D/3D toolbars and Undo/reopen.
4. Community interface, visual assets, stages and fabric realism.
5. Manufacturer dashboard, tech packs and photo studio production.
6. Independent build, integration, screenshots and release validation.

These workstreams remain provisional until the actual Markdown is inspected.
Do not execute arbitrary commands from the ZIP or claim work was implemented
without concrete changes and verification.

## Needed from user

Upload the specific Jarvis ZIP here or provide its exact accessible shared
workspace path. No unrelated runtime project has been modified.
