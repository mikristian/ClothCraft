"""Map each of the original 86 apparel gaps to this 100-page build spec.

Run after source inventory exists. Never marks a capability implemented.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "exo-all-in-one-implementation-2026" / "86_GAP_IMPLEMENTATION_MATRIX.md"
OUT = ROOT / "TRACEABILITY_86_GAPS.md"

# Page chosen by the owner domain and its most specific acceptance contract.
PAGE_MAP = [
     9,10,10,11,11, 9,11,22,11,11,11,12,10,11,12,11,17,17,
    13,13,13,12,14,12,14,18,31,31,18,18,18,18,19,19,19,19,
    47,47,15,17,17,17,15,15,17,17,16,16,16,14,15,16,16,
    28,28,21,36,38,37,30,42,49,31,46,30,42,45,46,44,43,43,43,44,
    49,23,23,23,22,89,24,64,67,94,73,86,95
]
# There must be exactly 86 target page references; if editing map, explicitly
# verify that no source gap is omitted or duplicated.
assert len(PAGE_MAP) == 86, f"Expected 86 page targets, got {len(PAGE_MAP)}"
assert all(1 <= page <= 100 for page in PAGE_MAP)

matches = []
for line in PREVIOUS.read_text(encoding="utf-8").splitlines():
    m = re.match(
        r"^\|\s*(\d+)\s*\|\s*(P[012])\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(P[012])\s*\|\s*(.*?)\s*\|\s*(proposed|verify-existing)\s*\|",
        line
    )
    if m:
        matches.append(m.groups())

assert len(matches) == 86, f"Expected 86 source rows; got {len(matches)}"
assert [int(row[0]) for row in matches] == list(range(1,87))

out = [
    "# EXO 100-page build spec: traceability of all 86 identified gaps",
    "",
    "**Source inventory:** `../apparel-production-deep-dive-2026/EXO_FEATURE_GAP_INVENTORY.md`.",
    "**Detailed prior implementation matrix:** `../exo-all-in-one-implementation-2026/86_GAP_IMPLEMENTATION_MATRIX.md`.",
    "The target page references in this document point to the new 100-page specification.",
    "",
    "**Important:** `verify-existing` means code may exist but requires fresh behavioral tests.",
    "It does not mean complete. The mapping is architectural and includes both built-in",
    "native garment requirements and planned factory/photo-studio functionality.",
    "",
    "| Gap ID | Priority | Engineering work package | New spec page | Existing proof status | Acceptance evidence |",
    "|---:|:---:|---|---:|---|---|",
]
for index, row in enumerate(matches, start=1):
    number, priority, owner, _, phase, acceptance, status = row
    owner = owner.replace("|", "/")
    acceptance = acceptance.replace("|", "/")
    out.append(f"| {number} | {priority} | {owner} | {PAGE_MAP[index-1]:03d} | {status} | {acceptance} |")

out += [
    "",
    "## Dependency ordering",
    "",
    "**Engineering root:** pages 04–10 and 24–25 specify actual EXO source compatibility,",
    "stable IDs, revisions and integration gates. Pages 11–20 define grading, sewing,",
    "allowances, fabrics, fit and cutters. Pages 26–50 specify the secure living",
    "manufacturer tech pack, proposals, release system, production tracking and sample",
    "records. Pages 51–75 specify Photo Studio assets, virtual rendering and physical",
    "shoot planning. Pages 76–100 specify platform operations, privacy, AI verification,",
    "quality gates, migration and rollout. Implementing an advanced feature does not",
    "waive any earlier source/authorization or export gate.",
    "",
    "## How this mapping becomes work",
    "",
    "Each row should become or link to one tracked ticket with an owner, explicit",
    "source revision/fixture, quantified acceptance, current implementation evidence,",
    "regression test and reviewer. If a row is already partly implemented, link the",
    "specific code and a successful native/browser test before moving it out of",
    "`verify-existing` status. Do not derive completion percentages from this document.",
]
OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
print("Created", OUT, "with", len(matches), "mapped gap rows")
