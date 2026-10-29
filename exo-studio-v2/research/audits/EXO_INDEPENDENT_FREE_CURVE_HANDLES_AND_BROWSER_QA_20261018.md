# EXO ClothCraft V2 — independent 2D curve handles / real browser QA

**Date:** 2026-10-18. **Status:** implemented and passed isolated native and browser acceptance, not promoted into installed production app.

## Engineering implementation

- Native Rust `FreeCurvePoint` supports backward-compatible optional `derivative_in` and `derivative_out` with legacy shared `derivative` fallback; Hermite segment reconstruction accepts genuinely independent incoming and outgoing handles. Split edge migration preserves tangent sides and correct child-edge derivative scaling, without silently losing geometry, sewing IDs or other references.
- Material-space JS `src/core/nativeFreeCurvePoints.js` evaluates and authors independent handles; mirrored free curve points map opposite incoming/outgoing sides with reflected tangents.
- `src/components/ClothCraftBoardV2.jsx` renders incoming and outgoing purple handles on each orange independent knot, supports Option-drag to break alignment and Shift angle snapping, previews changed geometry, and commits a Rust `Shape` on release. Fixed pointer hit ordering so the orange knot's transparent large hit target cannot obscure purple handle circles. Added direct tangent-gesture priority over other SVG drag tools, pointer capture safety, and modifier latched at gesture start.
- `src/core/freeTangentDrag.js` maps displayed handle endpoint mouse delta back into metres-per-edge-parameter derivative (signed and divided by 0.18), so handles follow pointer direction and distance rather than update only by a tiny geometric fraction.

## Verified regression results

- Rust library **26/26 passing**; focused Rust integration **17/17 passing**; `cargo test --no-run` compiles all Rust test/binary targets (worker-1 verification). No Rust schema migration required for older saved documents; new optional fields omitted when absent.
- `node --test src/core/freeTangentDrag.test.mjs src/core/nativeFreeCurvePoints.test.mjs src/core/vectorcraftAnchorPort.test.mjs`: **14/14 passing**.
- `node integrations/clothcraft/qa-v2-free-curve-tangent-native-20261018.mjs`: **PASS** shared legacy-smooth derivative, Undo/Redo, Save/reopen and native compiled mesh.
- `npx vite build --outDir .exo-build-scratch/curve-ui-build`: **PASS** with only large-bundle advisory.
- `node integrations/clothcraft/qa-v2-independent-curve-handles-20261018.mjs`: **PASS** with owned dynamically selected free backend/UI ports, genuine Chrome pointer down/move/up on inbound and outbound purple handle selectors, native revisions 1/2/3, different persisted `derivative_in` / `derivative_out`, mesh **2550 vertices / 4727 triangles**, Undo, Redo, Save/reopen and page reload; zero browser errors and zero failed native API requests. Handles were hit-verified with document.elementFromPoint and did not hide underneath the large knot target.
- Failures found and fixed during testing: stale occupied QA ports (unrelated backend reuse), SVG transparent hit target obscuring tangents, native editor busy during early Undo, and pointer competition with other SVG drag handlers. QA now checks it owns spawned services before running, and intentionally waits for native transaction readiness.

## Production safety and outstanding release work

The **installed** `~/Applications/EXO ClothCraft Studio V2.app` and its production binary were not rebuilt or overwritten; UI implementation exists in the source checkout only. The real installed app had a **running** backend PID 77671 and session 77679 during QA. Its persistent saved garment JSON and `.native` state had their mtime at 2026-10-18 16:18:50, and the JSON SHA changed from the earlier baseline `7826b0d5ac3b678a586c9bf8ddb9db20f6fc9af8497e2e385d0c5beb23359160` to `74c86e18b01b32c1f423f4cc7ba5eb7b665be27b4c7113e7c4eed2f2480b94de`. All QA launched via temporary `EXO_CLOTHCRAFT_OUTPUT_DIR`; the source of that persistent production save event cannot be proven from checksum alone. No restoration or rollback has been performed, to avoid overwriting potentially intentional user edits. A snapshot/backups review is recommended before any deployment.

Follow-up: physical AppKit QA package and actual window interaction test, independent knot handles under multiple simultaneous/pattern mirrored edit scenarios, graded pattern/DXF roundtrip preservation, and revalidation of production saved-state backup and rollback before package promotion. Mac free disk space observed around 14 GiB at closeout; prioritize safe storage offload before full rebuild.
