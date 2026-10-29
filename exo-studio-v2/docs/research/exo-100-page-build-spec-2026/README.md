# EXO ClothCraft V2 | 100-page all-in-one build specification

**Date:** 17 October 2026. **Status:** Engineering specification, architecture and implementation roadmap. This is a proposed build contract, not a claim that the manufacturer website or full photo rendering service already exists. The task creates research documentation and leaves the installed app, saved garments and source code unchanged.

## Main deliverables

- `EXO_100_PAGE_BUILD_SPEC_2026.pdf`: **exactly 100 numbered, bookmarked A4 pages**, generated and checked from the four source chapters.
- `EXO_100_PAGE_BUILD_SPEC_2026.md`: single editable Markdown source with all 100 sections.
- `TABLE_OF_CONTENTS.md`: complete page-by-page clickable-topic guide; PDF has corresponding bookmarks.
- `TRACEABILITY_86_GAPS.md`: all 86 previously researched missing-feature opportunities mapped exactly once to a page of the new specification with priority and verification status.
- `01-platform-01-25.md`: native CAD, source compatibility, grading, seam geometry, fabric, simulation, cut/export, UI and agent protocols.
- `02-factory-26-50.md`: interactive tech pack, manufacturer dashboard, anchored comments, proposals, sample evidence, approvals, release, costing, order/QC and interoperability.
- `03-photo-51-75.md`: Photo Studio, stage library, camera/lens/lighting rigs, garment visuals, storyboard, Blender rendering, physical studio plans, producer schedule and actual photo matching.
- `04-delivery-76-100.md`: authentication and grants, data/event services, API, privacy, migration, agent verification, recovery, QA, rollout, staffing, pilot and final release gates.

The prior 30-page research and implementation reports are preserved in neighboring folders:
`docs/research/apparel-production-deep-dive-2026/` and
`docs/research/exo-all-in-one-implementation-2026/`.
Their source registers and specialist manufacturer/photo appendices support this engineering specification.

## Architecture decision in one view

```text
EXO native 2D/3D authoring + legacy project adapters
         ↓ measured/validated GarmentSnapshot
Canonical garment source revisions and immutable asset registry
         ├── Production + POM/Grade/BOM/Cut QA
         │       └── Approved immutable FactoryRelease
         │              └── Factory Hub website: comments, proposals,
         │                  sample evidence, orders, QC, production milestones
         └── Approved visual appearance asset
                 └── Photo Studio shoot + exact ShotManifest
                        ├── Three.js interactive preview / Blender Cycles render
                        └── Real studio: camera/lights, set plan, call sheet,
                            equipment, physical sample and actual photographs
```

One garment source may feed both downstream flows. The factory release and shoot revision maintain **separate edit authority and approvals**. Neither a proposed sample change nor a creative lighting edit may silently rewrite source geometry.

## Requirements are not feature completion claims

The current EXO app already contains meaningful manufacturing exports, draft measurements, stage library data and render controls. The V2 native Rust garment and broader EXO project fields still require verified synchronization, and the published manufacturer portal, multi-tenant collaboration, physical-studio calibration and Cycles final render service are **proposed integrations**. The traceability file deliberately marks capabilities `proposed` or `verify-existing`; neither state is “complete”.

## Build and verification

From the EXO V2 project root:

```bash
python3 docs/research/exo-100-page-build-spec-2026/make_traceability.py
python3 docs/research/exo-100-page-build-spec-2026/build_100_page_spec.py
```

Requires the local Python modules `reportlab` and `pymupdf` (`fitz`) and available macOS Arial font. The renderer enforces numbered sections 001–100, one topic per physical PDF page, checks searchable text on each page, and creates bookmarks. It only generates artifacts in this research folder.

## First actual engineering slice recommended

Build one `GarmentSnapshot` fixture adapter, source hashing, read-only style view, a static private Tech Pack web page with POM/BOM/2D/3D references, and a Photo Studio eight-shot preset that pins the same garment revision. Add factory invitation, sample comments, revision proposals and release approvals only after source compatibility and authorization tests pass. Add final Blender render queue only after camera/light/material parity and frozen-source proof.
