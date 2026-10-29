# EXO V2 2D tool coverage audit — 2026-10-18

Scope: read-only source audit of the installed toolbar catalog, React/native bridge, Rust authoring enum and session adapter. This is static coverage evidence, not a claim that each gesture passed live UI testing. Existing toolbar status labels are historical assertions requiring revalidation after concurrent edits.

## Actual toolbar inventory

The 2D catalog in `docs/engineering-handoff-20261017/toolbar-inventory.json:277-499` exposes 32 slots: 17 in column A and 15 in column B. Nine are labeled `native`, four `inspect`, and nineteen `unavailable` in that snapshot. Native-labeled: Transform Pattern (A01), Edit Pattern (A02), Polygon (A04), Internal Polygon/Line (A05), Base Polygon (A06), Notch (A08), Seam Allowance (A09), Edit Sewing (B01), Segment Sewing (B02), Free Sewing (B03): **ten** entries; inspect-labeled: Edit Point of Measure (A11), Point of Measure (A12), Check Sewing Length (B04), Edit Texture 2D (B07): **four**; unavailable: the remaining **eighteen**. These recalculated 2D subtotals supersede the informal count above; the JSON's top-level counts (`:4-8`) cover both 2D and 3D.

Unavailable 2D slots: Fullness Point, Trace, Walk Pattern, Edit Annotation, Pattern Annotation, Pleats, Edit Grading, Auto Grading, Steam, Seam Taping, Transform Graphic, Graphic 2D, Edit Topstitch, Segment Topstitch, Edit Puckering, Segment Puckering, Set Sublayer, Fill (`toolbar-inventory.json:291-499`). The catalog's Segment Sewing and Free Sewing share `sewing.freeSew` (`:403-414`), so distinct CLO interaction semantics cannot be inferred from labels.

## UI routing and native commands

`src/core/cloNativeMenuBridge.js:7-26` routes new/open/save/export/undo/redo/delete, simulation and mirror to native command strings. `:28-38` maps select, points, split, curve, internal, notch, allowance, measure and sew menu actions to native tool modes. `:40-47` explicitly blocks native pin, fastener, legacy grid, material creation, graphic upload and avatar import. `:49-57` returns null for other actions, so every menu entry must be checked for a consumer fallback. `src/components/ClothCraftWorkspace.jsx:568` sends editing requests as `{op:'edit',command:c}`; `:1329` interprets `mode:` strings. `src/components/StudioSettingsDialog.jsx:178-203` distinguishes native tools, selectable research/reference tools, and an active subset of vector actions; presence in the tool index alone does not establish an authoring operation.

`research/oss/clothcraft/src/authoring.rs:17-166` defines transactional commands for annotation, primitives, mirror/boolean, internal lines, ruffles, polygons, placement, shape, dimensions, anchor/move/nudge, split/remove/curve points, target length, notches, seam allowance, board transforms, duplicate/remove panel, sew/remove seam and fabric. `research/oss/clothcraft/src/bin/exo-session.rs:8-40` exposes most of these as JSON `kind` operations; notably `Nudge` is in the core enum but absent from this session command match. This is an adapter coverage gap, even if another UI implements nudging through `MovePoints`. The session's unknown command branch rejects unrecognized kinds (`:39`). The session has a dedicated grade helper (`:42` onward), so the toolbar's unavailable grading labels do not prove grading is entirely absent; distinguish basic numeric grade operation from a complete interactive grading workflow.

## Persistence and correctness boundaries

`research/oss/clothcraft/AGENTS.md:24-34` establishes material 2D rest coordinates, stable panel/edge references, and cache invalidation after remeshing. `:40-44` identifies `src/authoring.rs` as the transaction/history authority and `atelier/board.rs` as the shared board. `src/bin/exo-session.rs:551` records prior template in history before applying an edit. SplitBoundary is explicitly designed to preserve named boundaries and remap sewing: `src/authoring.rs:867-1000`, `:1392-1511`; check notch correspondence, allowance inheritance and seam identity in regression tests. The presence of `TargetLength`, `Notch`, `SeamAllowance` and `Annotation` supports data-level capability, but production cutline export, persistent POM tables, grade rules across sizes, and an independently versioned pattern document require separate end-to-end evidence.

## CLO comparison and priority

Use `research/clo-2d-analysis/clo7-native-tool-mode-parity-20261018.md` and `clo7-official-point-tool-audit-20261018.md` as captured comparison evidence; the accompanying images show point, free-curve-point, sewing and POM tool states. Do not infer parity from screenshots alone. The critical CLO workflows to reproduce are distinct point versus curve editing, separate incoming/outgoing Bézier handles, accurate seam correspondence after edits, persistent POM, walk-pattern length checking and multi-size grading.

**P0:** Verify all native-labeled gestures against the actual installed binary and reopened document; prove transactional undo/redo and seam/notch/allowance preservation after split, merge and mirror. Establish a versioned document schema with stable IDs and migration. Test separate free/segment sewing semantics, numeric curve handles and persistent measurement references. Confirm session grade command behavior and whether its output survives save/reopen.

**P1:** Implement full interactive grading rules and size sets, seam walking/easing feedback, durable POM annotations, production cutlines and manufacturing exports. Add annotation/pleat tooling and distinguish index-only or inspect-only actions in the UI. Map each toolbar slot to a tested handler and native operation in a machine-readable acceptance matrix.

## Audit limits

No app mutation, native launch, build or runtime gesture test was performed for this document. Concurrent source changes may invalidate the historical toolbar inventory; capture a fresh runtime snapshot before declaring a tool complete. This report intentionally makes no claim of full CLO parity.
