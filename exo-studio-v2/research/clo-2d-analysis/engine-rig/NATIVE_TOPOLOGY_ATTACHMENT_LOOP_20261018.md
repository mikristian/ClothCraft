# EXO native 2D topology / sewing attachment engineering gate

Date: 2026-10-18. Target: native Rust ClothCraft code at `research/oss/clothcraft`, used by EXO's native authoring adapter. Work is source-level only, not an installed Mac app update.

## Problem reproduced from the 2D engineering audit

The native `Command::SplitBoundary` previously refused any sewn edge, or an edge with a target length, notch or seam allowance. Those refusals protected reference integrity but prevented production-pattern refinement after sewing had been authored. Existing classic JS commands have separate topology migration logic; that implementation cannot be assumed to be Rust parity.

## Engineering changes

- `research/oss/clothcraft/src/authoring.rs`: a preflight `remap_split_seams` plan maps sewn `BoundaryRef` ranges using normalized **physical rest arclength** and preserves `reverse_b`, original seam identity and remaining sewn coverage. It generates an independent seam when a range straddles the split; other sewn intervals shift to the correct child edge. The original polygon edge retains its stable name; the successor uses the existing collision-safe split naming scheme.
- The same atomic `SplitBoundary` transaction maps authored edge notches to the child arclength, copies seam allowance widths and divides stored target-length specifications proportionally. A notch exactly at the split, a seam with explicit intermediate correspondence notches, and a seam using the same edge on both ends are still **rejected**, rather than silently changed.
- `research/oss/clothcraft/src/garment/seam.rs`: the prior relative machine-precision length equality was too tight when an identical cubic was re-flattened into two source edges. The compiler now uses a fixed **0.01 mm** length threshold for numerical sampling discrepancy while retaining rejection of actual sewing mismatches without explicit ease. A targeted test verifies that a 0.4 mm genuine mismatch is still rejected.
- `research/oss/clothcraft/tests/drawing_commands.rs`: two obsolete invalid-command expectations for the newly supported split cases were removed, keeping the existing fail-closed cases.
- `research/oss/clothcraft/tests/split_attachment_migration.rs`: new regression suite covering metadata, partial/full, reversed/normal, sewn side A/B, cubic curves, repeated splits, physical notch position, single-step Undo/Redo, serialization/recompile, and unsupported-case atomicity.

## Executed results

| Test | Result | Scope |
| --- | --- | --- |
| New split attachment regression tests | **7 passed / 0 failed** | Includes eight parameter combinations within one test and curved material checks |
| Native 2D subset: `drawing_commands`, `drafting_integration`, new regression | **27 passed / 0 failed** | One test set |
| Repeated bounded 2D subset loop | **81 passing test executions, 0 failures** | Three rounds × 27, with JSON results |
| Full no-default-feature Rust test run | **135 passed / 0 failed** | All compiled Rust suites and doc tests, once |
| Classic JS point deletion, precise splits and partial sewing | **Passed** | Companion regression checks; not a native GUI pass |

Reproduce, from the workspace root:

```sh
node research/clo-2d-analysis/engine-rig/run-native-topology-loop.mjs 3
cd research/oss/clothcraft
~/.cargo/bin/cargo test --no-default-features --locked --offline
```

Machine-readable loop: `research/clo-2d-analysis/engine-rig/results/native-topology-loop-latest.json`.

## Invariants enforced and remaining blockers

1. Split operations use an immutable source clone: a failed edit does not mutate user document state.
2. Sewing subranges retain positive directed local arclength intervals. The opposite seam intervals remain contiguous, complete, and nonoverlapping for the supported cases, including reversed sewing.
3. Existing notch positions on an attached curved edge remain within 0.1 mm of the original material-space location in the test fixture.
4. Original edge names survive; successor names and split seam identifiers do not collide in tested repeated splits. These are stable named-edges, not an implemented universal UUID-based topology graph.
5. **Not yet supported:** automatic remapping of explicit intermediate pairing notch correspondences on `SeamSpec.notches`; such cases fail closed. Removing a vertex belonging to an active sewn segment also remains safely blocked rather than graph-rejoined.
6. This is **not a manufacturer-approved acceptance** or a third-party DXF/plotting result. Additional fuzz/property tests, full GUI interaction traces on a disposable garment and user-approved industrial data exchange fixtures remain necessary.
7. The installed EXO Mac application and existing garment files were **not modified or rebuilt** during this native engine test pass. The source changes require the normal bridge rebuild and installed-app smoke before the new behavior can be used from the signed app.
