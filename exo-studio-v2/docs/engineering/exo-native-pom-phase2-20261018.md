# EXO 2D Patternmaking — persistent Points of Measure milestone

**Status:** source milestone and isolated QA; **not installed into production V2**. Does not certify a garment, multi-size grade, or manufacturing POM specification.

## Native document contract

The existing source-of-truth remains FittingProject v1 → GarmentTemplate v2. An editable polygon now optionally stores `measurements`:

```json
{
  "measurements": [
    {
      "id": "chest-width",
      "label": "Chest width",
      "a": {"edge": "left-side", "t": 0.50},
      "b": {"edge": "right-side", "t": 0.50}
    }
  ]
}
```

- A measurement ID is unique within one polygon, printable label required; maximum 256 records/panel.
- Anchor `edge` is a **stable named material boundary**, not a screen coordinate, mesh index, or Bézier parameter. `t` is its **normalized sampled physical arclength**, inclusive of endpoints (0–1); coordinates and lengths are material metres internally.
- The native measurement value is currently **straight-line Euclidean length between two boundary stations**, exposed in **millimetres** by `pattern-audit`. It is not curved tape length, garment circumference, body POM or finished-garment spec tolerance.
- Commands: `SetMeasurement {panel, measurement}` creates/replaces one ID and `RemoveMeasurement {panel,id}` deletes it. They are native reversible transactions, not a React-only drawing. Invalid/missing/degenerate anchors reject without mutating the authoring template.
- Fields are optional on historic documents (empty default), so pre-existing garments continue to load.

## Topology behavior

| Operation | Contract |
|---|---|
| Edit named Bézier/point | Existing edge stations remain attached to the edge and their physical position/value follows the new curve |
| Split at physical boundary station | Endpoints partition by actual arclength and reattach to either child edge; measurement ID, label and physical positions survive within 0.55 mm sample tolerance |
| Split reflected linked free knots | Both edge anchors migrate in one atomic transaction alongside sewing/notches/allowances, including previously sewn side edges |
| Mirror | Named edge direction reverses; both station parameters become `1 - t`, retaining physical reflected location/value |
| Numeric dimensions / single-size grade | Same named-edge stations and IDs survive; measured physical dimension recalculates from current polygon |
| Remove referenced contour vertex / Boolean destructively replacing polygon | Fail closed if references could be lost; user must remove POMs first (or use an explicitly supported future migration) |
| Undo/Redo and save/reopen | IDs and both physical anchors retained in Rust template JSON |
| Change/add POM only | No change to cloth physics mesh or simulation reset |

## 2D board interaction

Activate native **Measure** mode and click two locations on the **same panel's cutline**; each is resolved to a named-edge physical station, using a capped 12-screen-pixel snapping tolerance rather than a fixed 35 mm radius. The new POM is authored in Rust. The inspector lets the user select, rename and delete stored POMs; persisted lines, station handles and labels render from native template + compiled boundary geometry. Drafting previews are separate from saved records. A pending first point is cleared by tool changes and any native document revision to prevent applying stale references after an edit.

## Automated evidence

- `research/oss/clothcraft/tests/persistent_pom_references.rs`: material width accuracy; template compile unchanged, disk roundtrip, atomic invalid references, add/update/remove/Undo/Redo, ordinary curved and straight split migration, mirrored asymmetric station direction and numeric dimensions.
- `research/oss/clothcraft/tests/mirrored_free_curve_split.rs`: sewn reflected pair split migrates **both** POM station references, labels and IDs, preserving locations within 0.55 mm.
- `scripts/engineering/tests/qa-native-pom-browser-20261018.mjs`: isolated **real Chrome/Vite/Node/Rust** flow; two physical clicks, native persisted record and SVG line, rename through inspector, read native audit millimetres, delete, Undo, JSON save/reopen, no browser errors. Uses disposable temp output and dynamic allowlisted development port. Does not modify signed V2 or its saved projects.
- `scripts/engineering/exo-garment-document-gate.mjs`: checks POM IDs, names and named-edge station references; `scripts/engineering/tests/qa-garment-reference-gate-v2.mjs` adds four adversarial POM cases. This gate is a *preflight* and does not replace native compile.

## Remaining limitations / release criteria

1. **Multi-size factory POMs:** no named size sets, measurement formulas, spec sheet tolerances, measurement-path type, or cross-panel POM linkage. Straight-line span is not enough to reproduce every CLO garment measurement.
2. **Reference migration:** supported topology mutations are covered, but a full destructive merge, edge deletion with a POM, and general Boolean migration intentionally fail closed rather than guessing. More severe split/merge stress testing is required.
3. **Browser UX:** editor currently uses an abbreviated label auto-generated for a new POM and an inspector to rename it; screen hit thresholds need manual usability studies on varied DPI/zoom devices. Native history is transactional but not a durable cross-restart undo log.
4. **Production release:** coordinate with prime engineer, reconcile simultaneous work, build with the desktop GPU feature, stage an isolated signed V2 QA app, exercise cold-open/2D/3D/native POM across real garment fixtures, verify saved project backup and rollback. Do not replace the user's working app solely on the basis of isolated source tests.

