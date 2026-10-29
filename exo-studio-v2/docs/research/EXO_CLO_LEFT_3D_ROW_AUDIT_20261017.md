# EXO V2 × live CLO 7 — left 3D dual-column toolbar audit (2026-10-17)

The right 2D toolbar audit is complete separately. This audit addresses **only** the two 3D tool columns physically left of the 3D window, keeping each original top-down sequence independent. The signed EXO CLO Inspector ran against actual CLO 7.0.242 at 14:44 EDT; Accessibility and Screen Recording were authorized, CLO process PID 22394 was running, and one 1512×900 CLO window was captured. The real AX buttons appear at x232 (A, 20 items) and x268 (B, 18 items), 34×30 points each. Their relative Y measurements are the `observedY` offsets in `src/data/clo7ToolbarOrder.js`. Live text and offsets are tested directly, not inferred from thumbnail icons.

**Legend:** Native = relevant Rust-backed EXO action exists (feature limits described in capability registry); Inspect = routes to a related EXO editor, *not* the named CLO operation; Pending = no equivalent operation currently exposed. Paired ordinal entries are for side-by-side review only. Independent divider gaps mean two items on the same numbered row do not necessarily share the same Y coordinate.

| Ordinal | 3D A (left) | EXO | 3D B (right) | EXO |
|---:|---|---|---|---|
| 1 | Simulate | Native | Play Motion | Pending |
| 2 | Select/Move | Native | Edit Line (3D Pattern) | Pending |
| 3 | Select Mesh (Brush) | Native (temporary selection) | Line (3D Pattern) | Pending |
| 4 | Edit Styleline | Pending | 3D Base Pen | Pending |
| 5 | Edit Sewing | Native | Edit 3D Pen (Avatar) | Pending |
| 6 | Segment Sewing | Native (whole edges) | 3D Pen (Avatar) | Pending |
| 7 | Free Sewing | Native (fractional ranges) | Edit Texture (3D) | Inspect |
| 8 | Auto Sewing | Pending | Transform Graphic | Inspect |
| 9 | Edit Tack | Pending | Graphic (3D Pattern) | Inspect |
| 10 | Tack | Pending | Select/Move Button | Inspect |
| 11 | Fold Arrangement | Pending | Button | Inspect |
| 12 | Fold 3D Garment | Pending | Fasten Button | Pending |
| 13 | Reset 2D Arrangement (All) | Native | Zipper | Inspect |
| 14 | Reset 3D Arrangement (All) | Native | Edit Piping | Inspect |
| 15 | Re-drape 3D Arrangement | Native | Piping | Inspect |
| 16 | Hi-Res Garment | Pending | Select Binding | Inspect |
| 17 | Edit Measure (Avatar) | Inspect | Binding | Inspect |
| 18 | Basic Tape Measure (Avatar) | Inspect | Press | Pending |
| 19 | Edit Measure (Garment) | Inspect | — | — |
| 20 | Linear Measure (Garment) | Inspect | — | — |

**Current inventory:** 9 native (all in A), 14 inspect-only (4 in A / 10 in B), and 15 pending (7 in A / 8 in B), across 38 positions. This is an inventory of EXO implementation stages, not CLO functional parity. For instance, A03's temporary 3D brush selects render vertices without persistent topology editing; B11 opens a related EXO button library and does not place a native physical CLO button.

### Changes in this pass

1. **True geometric row placement.** Replaced auto-spaced 3D A/B flex positions with each button's measured CLO `observedY` offset. Individual columns remain 36px apart; 34×30 buttons and separately observed 34px/44px vertical spacings are retained, including divider artwork. Both A01/B01 and A02/B02 share real physical horizontal lines.
2. **Distinct native sewing modes.** `3d:A06` now dispatches `sewing.segmentSew` and exposes full [0,1] edges, while `3d:A07` remains `sewing.freeSew` with optional editable boundary fractions. Both create revision-validated Rust seam relations with Undo. Reselecting a variant clears previous edge pair and range to avoid stale selection. A05 Edit Sewing retains existing seam edit workflow. These selected buttons now expose selected/pressed state rather than always appearing inactive due to their old null legacy action identifiers.
3. **Readable separate icons.** Dedicated EXO-drawn SVG primitives distinguish segment/free/auto sewing, edit/create tack, arrangement resets, mesh resolution, avatar vs garment measuring, 3D line and pen variants, and piping/binding actions. The glyphs express source tool identity; they are not copies of CLO proprietary assets.

**Verification:** `node integrations/clothcraft/qa-v2-left-two-bars-live-20261017.mjs` confirmed all 38 real CLO titles, independently measured vertical offsets, 34×30 frames, EXO matching buttons to within 1px, source order, first two horizontal pairs, icon content and zero browser errors. `npm run build` passed. The geometry browser test runs against an EXO shell. Separate `node integrations/clothcraft/qa-v2-left-sewing-20261017.mjs` **passed** against a disposable Rust native server and headless Vite/Chrome. This confirmed A05/A06/A07 enabled and selected correctly, Segment Sewing full boundary ranges, Free Sewing four editable range endpoints, clearing partial ranges and prior edge selections when switching variants, and A05 returning to edit mode with zero browser errors. Rust sewing variant commit and persistence should be covered by a later seam-range end-to-end integration test. Right-side 2D toolbar regression and 70-slot SVG icon checks also passed.

**Limitations:** The signed CLO Inspector is a read-only view of accessible main-toolbar controls. It does not expand dropdown flyouts or prove hidden submenu entries, exact tooltip variations, or the enable states of every tool across different garment selections. These remain subject to further real-app inspection. User's CLO garment project was not modified.
