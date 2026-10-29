# EXO ClothCraft Studio V2 — Phase 2, native persistent Points of Measure

**Status:** native POM milestone verified in engineering source; **production
release held** pending signed V2 startup/renderer QA and integration with
concurrent source. This is **not** full CLO3D parity or a factory-certified
POM, size-set, grading or apparel production workflow.

## What was actually implemented

- **Authoritative schema:** `FittingProject` v1 and `GarmentTemplate` v2 are
  preserved. `PolygonPattern.measurements` is an optional, backwards-compatible
  array of `PatternMeasurement { id, label, a, b }`, with named edge station
  endpoints `MeasurementAnchor { edge, t }`, fraction of physical rest
  arclength. Explicit source: `research/oss/clothcraft/src/garment/polygon.rs`.
- **Validation and physical metric:** the native build rejects orphaned names,
  duplicates, nonfinite/out-of-range stations, unprintable labels, degenerate
  lengths and excessive POM counts. POM values are Euclidean material-space
  distances between two rest-space stations in **metres**, not SVG pixels,
  draped 3D displacement, or along-curve tape distance.
- **Transactional editing:** native `SetMeasurement` and `RemoveMeasurement`
  commands, JSON protocol adapter, Undo/Redo and save/reopen work on the
  same Rust document as sewing and panels. A measurement-only change does
  **not** invalidate the physical cloth solver state.
- **Reference-safe topology:** splitting a measured boundary remaps each
  referenced endpoint to the correct named child by physical arclength
  fraction, retaining the POM ID. Mirroring reverses stations (`t -> 1-t`);
  supported resize and single-size grade operations retain IDs. Removing
  referenced boundaries, Boolean reconstruction and `Shape` replacement that
  would discard measurements are blocked, rather than silently losing them.
- **Live 2D workflow:** click two cutline stations in the native Measure tool
  to create a persisted POM. The 2D panel renders the calculated reference
  with a Liquid Glass list/inspector for selection, renaming and deletion.
  Selected POMs get a highlighted line. Snapping is capped at **12 screen
  pixels and 35 mm** to avoid surprising selections at high zoom.
- **Audits/export preparation:** the native `pattern-audit` includes POM
  IDs, labels, metric lengths and resolved endpoint stations; the separate
  read-only JSON reference gate rejects corrupt POM arrays, IDs and anchors.
  No manufacturer approved POM export is asserted.

## Direct test evidence

| Test | Result | Description |
|---|---|---|
| `cargo test --locked --no-default-features -j2 --test persistent_pom_references` | **7/7 pass** | Identity, physical numeric length, save/reopen, invalid ref rollback, Undo/Redo, mirrored/resize and straight/curved sewn-boundary split |
| `cargo test --locked --no-default-features -j2 --bin exo-session` | **10/10 pass** | Includes additional unit proof: 200 mm POM grades to 220 mm without ID/reference loss |
| `cargo test --locked --no-default-features -j2 --test cutline_production` | **11/11 pass** | No regression in native engineering cutline/notch path |
| Existing authored sewing/curve suites | **28/28 pass** earlier | 15 drawing commands, 4 mirrored free-knot split, 9 sewing attachment-migration cases plus earlier scoped first-phase suites |
| `qa-garment-reference-gate-v2.mjs` | **14/14 pass** | One good project plus thirteen invalid fixture rejections, including POM cases |
| `exo-garment-document-gate.test.mjs` | **9/9 pass** | Legacy document gate updated for the correct FittingProject wrapper |
| `qa-native-pom-browser-20261018.mjs` | **pass, zero page errors** | Disposable Rust bridge + source Vite + real Chrome pointer clicks: create, select, rename, delete, Undo, save, reopen, render and Rust metric pattern audit |
| `npm run build` | **pass** | 2003 transformed modules, warning for large JS bundle; no syntax/build error |

Browser QA uses an allowlisted localhost Vite origin and **never writes to the
user's saved EXO garment or installed application**. The installed V2 bundle
was deliberately not replaced during this POM development phase. The first
QA attempt exposed a restricted-origin CORS block and another test assumed
`measurements:[]` would be serialized even when empty; the corrected
isolated QA passed. Neither workaround weakens native API authorization.

## Remaining gaps

1. Editing material POM **stations** directly (drag or numeric fractions),
   including corner attachment IDs and safe linked multi-panel POMs.
2. POM **size sets**, base-size measurement tables, tolerances, and graded
   target requirements per actual garment size.
3. Curved-path, segment-walk, and non-Euclidean methods with explicitly
   declared measurement definitions.
4. True semantic darts, pleat folds, sewing and cutline transformations;
   current internal construction guides are not equivalent.
5. Industrial multi-size rule editing, shaped trouser/hood/jacket acceptance,
   independently verified factory cutting and AAMA/ASTM exchange.
6. Sign/ship release QA: source and installed binary capability/version
   parity, cold-reopened WebGL/2D panels, reference-compatibility migration
   over archived garment projects, user acceptance. Do not deploy a
   CPU-only Rust build into GPU-enabled signed V2.

## Source changes

Native: `research/oss/clothcraft/src/garment/polygon.rs`,
`src/authoring.rs`, `src/authoring/geometry.rs`, `src/garment/shapes.rs`,
`src/garment/presets.rs`, `src/bin/exo-session.rs` (within that checkout).
The desktop mirror `integrations/clothcraft/exo-session.rs` should always
match the source adapter before any packaging.

Frontend: `src/components/ClothCraftBoardV2.jsx` and
`src/components/ClothCraftExoShell.css`.

Gate/tests: `scripts/engineering/exo-garment-document-gate.mjs`,
`scripts/engineering/tests/qa-garment-reference-gate-v2.mjs`,
`scripts/engineering/tests/qa-native-pom-browser-20261018.mjs`,
`research/oss/clothcraft/tests/persistent_pom_references.rs`.

Documentation: `research/oss/clothcraft/docs/authoring.md` (POM contract).
