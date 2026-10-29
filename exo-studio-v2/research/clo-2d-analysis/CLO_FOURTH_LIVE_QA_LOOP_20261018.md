# CLO 7 repeated live QA loop — notch, seam allowance, sewn split, POM

**Run date:** 2026-10-18. **CLO version:** Standalone OnlineAuth Academic 7.0.242 (r39887). The real macOS CLO application was driven via the signed `EXO CLO Inspector.app` with Accessibility native menu presses, CGEvent mouse interactions and ScreenCaptureKit screenshots. Document: unsaved in-memory disposable T-shirt `Male_T-shirt-direct-test-20261018.zpac`.

The user authorized repeated native testing despite a potential crash to the disposable garment. The original garment and the copied on-disk fixture were each verified after this run as **912,850 bytes**, with identical SHA-256 `eb24014f28e46cd513ea603a3c441ceeda9dc62bc301d6457848ffe906b87a83`. Neither was saved by these actions. No EXO production UI or Rust pattern geometry was changed.

## Test 1: add a notch, confirm properties, undo

Called the native CLO menu `2D Pattern > Create > Notch` (AXPress 0), clicked the existing side outline at T-shirt window-local `(787,528)`, inspected the actual Property Editor, and issued native `Edit > Undo` (AXPress 0, enabled true). Tool was restored to Transform Pattern (AXPress 0). Native inspector returned zero warnings.

- **PASS:** inserted notch showed a new selected marker and the properties **Type I**, **Perpendicular**, **Length 0.70 cm**, **Flip Off** and **Lock Off**. Undo removed the newly highlighted notch and returned to pattern selection. Screenshot evidence: `clo-loop3-notch-before-20261018.png`, `clo-loop3-notch-after-20261018.png`, `clo-loop3-notch-undo-20261018.png`.
- **Not independently verified:** internal notch ID before/after the separate side cutline split, grading, whether CLO maintains a normalized arclength reference or updates associated production export entities. These screenshots alone cannot show those hidden data structures.

## Test 2: seam allowance re-selection

Activated `2D Pattern > Create > Seam Allowance ` by native AX menu (AXPress 0), clicked the left torso side twice for native selection, and captured `clo-loop3-allowance-before-20261018.png`, `clo-loop3-allowance-first-20261018.png`, `clo-loop3-allowance-selected-20261018.png`. No inspector warnings.

- **PASS:** CLO exposed the seam-type / smooth-intersection controls and highlighted the selected side, with no deformation to the visible T-shirt silhouette.
- **Limit:** the property panel was scrolled down in this capture, so the numerical width was **not directly visible in Test 2**. It appears in Test 3. It is not valid to infer a changed offset cutting line from this selection alone.

## Test 3: attached notch + seam allowance + split + sewing re-selection

Executed a fresh in-memory sequence: Notch at `(787,532)`, Seam Allowance selection at `(787,515)`, `Add Point/Split Line` at `(787,522)`, native Notch and Seam Allowance re-selection, `Sewing > Edit Sewing`, then `Edit Point of Measure`. Native tool selection events returned AXPress 0 and the probe reported **no warnings**. The final helper window count included a small transient native secondary popup window, so a later helper read was used to verify the POM state.

- **PASS, visible state:** the notch mark remained on the left side outline and Seam Allowance properties after splitting showed **Width (cm): Line**, **Width 1.00**, with Start/End/Intersection seam-type controls. The native sewing overlay still connected the torso sides in the 2D and 3D views. Its label displayed **0.00 (26.17/26.18)** near the paired seam, reflecting the matched sewing lengths. Images: `clo-loop3-attached-notch-added-20261018.png`, `clo-loop3-attached-split-with-attachments-20261018.png`, `clo-loop3-attached-allowance-after-split-20261018.png`, `clo-loop3-attached-sewing-after-split-20261018.png`.
- **Caution:** the inspector did not expose precise notch ID continuity, edge ownership or separate offset geometry of the new subedges. It cannot certify that a manufacturing export preserves all notch and allowance references. Keep EXO Rust's fail-closed migration guard until numeric reference remapping tests and export comparison pass.

## Test 4: restore POM table and attempt editing

Immediately after the sewing tool selection, the POM Object Browser table looked empty (`clo-loop3-attached-pom-after-split-20261018.png`). The control probe reentered POM mode, changed Object Browser tabs (Fabric then POM), and the five existing POM rows returned unchanged: **26.18 cm, 26.18 cm, 26.17 cm, 26.17 cm, 26.17 cm**. Native inspector returned no warnings. This is strong evidence that POM table visibility was affected by active selection/browser state; the measurements were not necessarily deleted. Evidence `clo-loop3-pom-refresh-pom-tab-reselected-20261018.png`.

The next probe attempted to drag a POM endpoint on the right torso with `Edit Point of Measure`, then Undo. The menu returned AXPress 0 and Undo was enabled. However, the before/after/undo images **all retained the same five table lengths**, and the drag image showed a blue selected control marker rather than a changed POM length. **INCONCLUSIVE**: this gesture may have targeted a pattern point or failed to acquire the correct POM handle. Do not claim a POM update from this attempt. See `clo-loop3-pom-edit-before-20261018.png`, `clo-loop3-pom-edit-after-20261018.png`, `clo-loop3-pom-edit-undone-20261018.png`. A previous direct run **did** demonstrate independently editable POM measurements changing 26.17 → 33.62 → 26.17 cm; see its separate direct report and screenshot series.

## Test 5: sewing selections after combined reference edits

Activated `Sewing > Edit Sewing` and selected the right upper side at `(1004,502)` successfully, but subsequent right lower/left upper/left lower clicks failed as CLO's Accessibility window tree became temporarily unavailable. The attempt to return to POM also failed with `CLO menu bar or path unavailable`. This test is **PARTIAL/INCONCLUSIVE**; do not treat inaccessible later selections as passing. Earlier Test 3 screenshots already confirm the paired seam label, and the earlier dedicated split-edge sewing test captured all four direct selections. The newly captured partial images are `clo-loop3-sewing-baseline-20261018.png` and `clo-loop3-sewing-right-upper-20261018.png`.

## Engineering implications

EXO should model typed `Notch` and `SeamAllowance` data independently from editable boundary vertices. A topology split needs to migrate owning directed edge references, fractional/arclength notch locations, sewing correspondence and corner/offset rules in a single reversible operation. POMs should persist independently of Object Browser filtering and recover selection state without dropping records. Physical measurement rows should recompute only when their attached geometry truly changes; selecting a nearby point is insufficient proof of an edit. Explicit tests should compare source and resulting edge ID mappings, 2D/3D lengths, Undo/Redo and exported manufacturer-ready geometry.

## Validation and constraints

- Signed local inspector `codesign --verify --strict`: **PASS**.
- Swift helper patch whitespace `git diff --check`: **PASS**.
- Original/example and copied garment SHA-256 equality: **PASS** at end of run.
- The final native inspector read returned `CLO Accessibility window tree unavailable`; CLO remained a running process at the first check. The last test was not repeated through an inaccessible window. Later rounds should capture a fresh accessibility baseline before further pointer events.
- Mac available storage varied during these sessions and was low, but the disposable-session crash risk was explicitly accepted by the user. No further disk cleanup was requested or undertaken in this loop.
