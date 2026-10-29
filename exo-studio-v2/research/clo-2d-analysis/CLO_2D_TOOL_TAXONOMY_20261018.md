# CLO 2D Pattern Window — Complete Tool Taxonomy and EXO Acceptance Matrix

Date: 2026-10-18. Prepared as a research companion to `docs/CLO_2D_PATTERN_SYSTEM_RESEARCH_36_PAGES.md` and `research/clo-2d-analysis/CLO_2D_50_PAGE_DEEP_AUDIT_20261018.md`. This is a tool/function behavior inventory, **not** a claim of live inspection of every installed CLO command. References are direct official vendor documentation where marked V.

**Evidence labels:** V = verified in linked official documentation (may apply to other software releases); D = derived implementation specification / engineering recommendation; U = feature detail unresolved pending actual installed-version testing. Tests are proposed EXO acceptance tests, not completed test results. Default contour units should be persisted independently of display units. Tool layouts, hidden flyouts and keyboard shortcuts are release- and OS-specific.

## 01. Document scope and evidence protocol

**Functional behavior.** This inventory describes CLO 2D operations as observable user contracts, then proposes EXO acceptance requirements. V means verified in linked official CLO material; D means engineering deduction requiring EXO confirmation; U means unresolved version-specific behavior. A command documented for CLO 7.x or newer must not be assumed present in the installed CLO 7.0.242 without a version check.

**Evidence and acceptance.** V: official feature articles; D: typed topology and lifecycle requirements; U: native toolbar coordinates. Test: every implemented command exposes a stable semantic action ID, version capability metadata, and undoable transaction.

## 02. Pattern entities and contour identity

**Functional behavior.** A production pattern is a closed ordered sewing contour with persistent vertex IDs, segment IDs and 2D coordinates in physical units. Its cutting contour may include allowances and must never be confused with sewing geometry. Internal shapes, graphics, annotations and grainlines belong to separate layers.

**Evidence and acceptance.** D. Test: create four-edge rectangle, reorder its canvas stacking, and confirm sewing edge IDs and lengths do not change; malformed or open contour is rejected visibly.

## 03. Transform Pattern selection

**Functional behavior.** CLO Transform Pattern selects a pattern by click, fully enclosed marquee, or lasso; Shift multi-select is documented. Current official article describes moving by drag/arrow key and modifier-constrained moves, plus typed movement entry.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000012128-Select-Move-Transform-Pattern and https://support.clo3d.com/hc/en-us/articles/115012381568-Transform-Pattern. Test: overlapping panels, marquee partial inclusion, lasso, Shift toggle, redo/undo and keyboard nudge.

## 04. Transform pivot, rotation and scale

**Functional behavior.** With a selected panel CLO displays transform handles and a pivot; double-clicking the pivot activates a chosen pivot for rotation and scaling. Panel transforms must apply coherently to internal marking coordinates and preserve design-scale properties appropriately.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000012128-Select-Move-Transform-Pattern. D: transform propagation model. Test: rotate 90 degrees about an off-center pivot; compare contour and internal-line distances.

## 05. Point and segment hit testing

**Functional behavior.** Editing a point requires a narrower target than selecting the whole panel. At intersections, distinguish boundary anchor, curve handle, internal point, notch, line, sewing marker and filled panel; announce hovered target before commit. Zoom must affect hit radius in pixels without affecting geometry in centimetres.

**Evidence and acceptance.** D based on editor needs; V tool distinction in CLO Transform Pattern documentation. Test: hit all object classes at zoom 25%, 100%, 800%; clicking empty canvas never mutates a contour.

## 06. Add point to outline

**Functional behavior.** Adding a boundary vertex must split one specific segment while preserving its geometric locus; split ratio is measured by path arclength rather than bounding-box X. Create new stable child edge IDs with an explicit ancestry map to dependent sew/topstitch/grading items.

**Evidence and acceptance.** D; existing baseline pages 20–22. Test: insert midpoint into straight edge and cubic curve, compare contour before and after at 200 samples with sub-millimetre tolerance; no dangling sewing reference.

## 07. Move and delete segment point

**Functional behavior.** Point motion must update adjacent segments, dependent attachments and signed polygon area in one transaction. Deleting a vertex can alter shape, so preview resulting contour, guard against fewer than three distinct points and self-intersections, then migrate or invalidate related seam assignments with a clear warning.

**Evidence and acceptance.** D; curve-point deletion V at https://support.clo3d.com/hc/en-us/articles/115000373907-Delete-Curve-Point. Test: deleted sewn endpoint never causes a zipper, notch or topstitch to jump to an unrelated edge.

## 08. Free curve points versus segment points

**Functional behavior.** CLO distinguishes segment points, free curve points and Illustrator-style Bézier handles. A free curve point shapes a segment without implying a topological edge boundary. Its deletion may straighten a segment; deletion of a segment anchor on a curved line can delete related curve controls.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000373907-Delete-Curve-Point and https://support.clo3d.com/hc/en-us/articles/115000527667-Convert-to-Curve-Point. Test: curve control deletion changes visual curvature but retains seam object identity.

## 09. Bézier manipulation and modifier keys

**Functional behavior.** In CLO Edit Curve Point/Edit Pattern, selecting an anchor reveals handles. Alt-drag affects one side; Ctrl on Windows or Command on Mac can maintain the angle during curvature edit. Alt-drag of a segment point can convert it to Bézier. Deleting handle endpoints can revert the curve to straight.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves. Test: drag either handle with and without modifiers, verify tangent continuity class, Undo and exact serialized handle positions.

## 10. Curve representation conversion

**Functional behavior.** CLO supports converting AI Bézier to free curve points while attempting to maintain shape. CLO Convert to Curve Point offers Maintain Curve and Convert Only, with different geometry preservation contracts; neither should be represented as a purely cosmetic icon change.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115004472788-Convert-to-Curve-Point-AI-Bezier-Curve and https://support.clo3d.com/hc/en-us/articles/115000527667-Convert-to-Curve-Point. Test: save path samples before conversion, verify quantified deviation, compare both modes.

## 11. Segment length editing

**Functional behavior.** CLO Edit Pattern context menu Change Length opens a numerical dialog with length, direction and Lock Curve Points. The official page notes continuous line segments may be treated as one segment in version 7.1. EXO should expose exact requested output length and explain anchoring direction.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000416847-Change-Length. Test: 135.2-mm line to 142.0 mm with each direction mode; adjacent curved edges preserve valid join and tolerance.

## 12. Drafting rectangles and free polygons

**Functional behavior.** Pattern drafting should distinguish new standalone closed polygon from internal polygon drawn inside an existing panel; each supports typed length and angle values. Closing a free polygon must connect last to first without dropping the final vertex or creating a zero-length closing segment.

**Evidence and acceptance.** D. Test: rectangle dimensions 100 by 200 mm, six-vertex concave panel, canceled draft, self-crossing attempted draft; all dimensions consistent in saved CAD coordinates.

## 13. Internal lines and shapes

**Functional behavior.** An internal line may carry operational meaning beyond its stroke: a cut path, fold guide, quilting path, topstitch reference or sewable seam. Its endpoint may lie within contour or intersect contour; relationships are associated with panel ID and parametric path rather than raster overlap.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000374607-Cut-Cut-Sew and https://support.clo3d.com/hc/en-us/articles/13389684191641-Internal-Lines-over-Seamline-ver-7-1. D: semantic typed schema. Test: move/rotate panel and confirm markings remain attached.

## 14. Baselines and construction guides

**Functional behavior.** Baselines support drafting and can be used as slash lines; cutting and sewing lines must be classified separately at export. Baseline export can be excluded in DXF. Guide appearance must not be treated as an accidental cutting contour.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000391168-Slash-Spread and https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export. Test: export with and without baseline; contour perimeter and measured POM are unchanged.

## 15. Trace and clone operations

**Functional behavior.** CLO Trace tool can participate in Cut and Cut & Sew; cloning an internal shape as a panel and cloning pattern geometry to internal shape are documented. The 7.3 clone-with-sewing flow is version gated and must not be ascribed automatically to 7.0.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000343287-Clone-as-Pattern-Internal-Shape and https://support.clo3d.com/hc/en-us/articles/115000374607-Cut-Cut-Sew. Test: cloned contour IDs are new, geometry congruent, existing source seams unchanged unless chosen with-sewing mode.

## 16. Cut versus Cut and Sew

**Functional behavior.** A Cut operation physically splits geometry along an internal line. Cut & Sew also establishes matching sewing relationships. CLO notes an internal-line point within 5 mm of the pattern outline may be extended to the outline for the cut. The new panel boundaries need new identifiers and traceable ancestry.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000374607-Cut-Cut-Sew. Test: line ending 4 mm short cuts through; line ending 6 mm short follows documented/confirmed version logic; seams only created in Cut & Sew.

## 17. Unfold to full pattern

**Functional behavior.** CLO's Unfold uses a chosen fiducial segment to reflect a half panel and remove the center seam. Options include unfolding outline only, leaving internal polygons and baselines on one half (version 7.2), and multi-pattern unfold (7.2).

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000337267-Unfold. Test: half sleeve along straight centerline yields exact mirrored full polygon, no duplicated center edge, hole and notch replication tied to option.

## 18. Mirror and symmetric counterparts

**Functional behavior.** Distinguish mirror duplication into a separate left/right panel from unfold into a single symmetric panel; a linked symmetric copy must carry edit propagation rules, while detached copies must not inherit edits. Determine installed CLO 7 behavior by live inspection before claiming exact shortcut or command nesting.

**Evidence and acceptance.** D/U. Test: mirror asymmetric sleeve, test linked changes, detach link, alter source and prove independence; verify mirrored seam direction and notch side.

## 19. Slash and spread with point pivot

**Functional behavior.** CLO Fullness (Point), also documented as Slash & Spread, selects outline endpoints or an internal line/baseline, chooses a side and rotates around a pivot. A context action accepts exact distance and angle; natural curvature is applied by default and D maintains original curvature in documented versions.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000391168-Slash-Spread and https://support.clo3d.com/hc/en-us/articles/115012381368-Slash-and-Spread. Test: spread 15 mm 12 degrees, confirm pivot fixed and arclength changes explicit.

## 20. Fullness Line distribution

**Functional behavior.** CLO Fullness (Line) selects a fullness line and slash line, then requests direction and length for distributed added fullness. This is different from a simple endpoint translate; it changes silhouette and often internal geometry. Preview must display the altered fabric perimeter.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000391168-Slash-Spread. Test: three parallel slash intervals receive specified total fullness and maintain non-crossing outlines; confirm Undo restores original.

## 21. Darts

**Functional behavior.** A dart needs apex, leg endpoints, intake and fold direction; its sewn state implies leg pairing and an altered finished contour. Geometry and annotation must express the same dart after grading and flattening. Available docs in this pass do not settle every CLO dart menu option, so treat exact cursor gesture as U.

**Evidence and acceptance.** D/U. Test: 20-mm intake side dart, move apex, rotate dart, and verify both legs reconcile to the same sewn length with material direction trace.

## 22. Pleat creation and editing

**Functional behavior.** Pleat data must distinguish pleat line, fold direction, depth, count, spacing and stitched versus open zones. A repeat tool cannot merely draw parallel lines, because export, POM and simulation need actual fold construction. CLO-specific modal fields require live/official confirmation.

**Evidence and acceptance.** D/U. Test: knife pleat and box pleat each keep explicit fold axis, consumption length and grade-safe IDs; warnings for insufficient material.

## 23. Seam allowance creation

**Functional behavior.** CLO Seam Allowance tool works on pattern outlines or internal lines; Property Editor supports width and seam type at start, end or intersection. Intersection offers more join types than simple ends. A single uniform offset of a complex concave panel is not enough for real production.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115015631887-Edit-2D-Seam-Allowance-Properties. Test: different allowance values at hem, neck, side and armhole, with concave join, miter/round end checks and no self-overlap.

## 24. Seam allowance visibility

**Functional behavior.** Show Seam Allowance is a display toggle, including in Print Layout; while the Seam Allowance tool is active the allowance may remain shown. Hiding allowances must not delete actual allowance records or change DXF output policy.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115013215787-Show-Hide-Seam-Allowance. Test: toggle 50 times and verify serialized seam allowance widths and cutting paths invariant.

## 25. Notch placement and attachment

**Functional behavior.** Notches are selected by the dedicated Notch tool, can attach to outline or internal line, drag along their host and receive exact movement distance. Anchor them by stable edge ID plus arclength fraction or distance from an endpoint so subdividing curves preserves garment registration.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115013214367-Select-Move-Notch. D: anchor schema. Test: move 6 mm, split host edge, expand allowance and export: notch remains at intended sewn station.

## 26. Segment sewing

**Functional behavior.** CLO segment sewing selects two entire matching segments to establish correspondence. Seam relations should record directed interval references on both panels, with matching orientation and length checks; make reversals editable without changing contour winding.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing and https://support.clo3d.com/hc/en-us/articles/360007863993-3D-Sewing. Test: sew front shoulder to back shoulder, reverse direction, split one source edge, maintain targeted span.

## 27. Free sewing

**Functional behavior.** CLO Free Sewing selects arbitrary interval endpoints along outlines/internal shapes; click/drag and double-click establish one span then the partner. Thus a free seam may begin in the middle of a curve rather than at authored segment vertices.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/360007863993-3D-Sewing. Test: sew middle 62 mm of a 90-mm curve, preserve unsewn end allowances and visual directional arrows.

## 28. One-to-many and many-to-many sewing

**Functional behavior.** CLO offers 1:N and M:N segment/free sewing variants, with staged selections and Enter committing each side. M:N Free Sewing uses Delete to revoke last selection and Escape to abort all; invalid selections can highlight red. Match arclength mappings across full group rather than pair edges by array index.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115002674488--2D-Tool-M-N-Free-Sewing and https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing. Test: gather 3 sleeve cap intervals to 2 armhole spans, rollback one staged item, inspect final mapping.

## 29. Sewing diagnostics and direction

**Functional behavior.** Sewing direction markers distinguish same-looking geometry with different physical pairings. Each seam should expose a direction flip, visible tension/ease length delta and a human-readable mismatch warning. Lock down whether EXO flags warnings or blocks specific extremes through product specification.

**Evidence and acceptance.** D. Test: seam two edges 190 and 210 mm, show +20-mm/10.53%-of-shorter mismatch and directed notch correspondence; reversing twice restores original.

## 30. Topstitch segment mode

**Functional behavior.** CLO Segment Topstitch clicks a segment to place the selected topstitch style; multiple segments can be selected by marquee/lasso. Topstitch is an authored trim path with material/style, offset and selected host range, not a color baked into the outline.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115002224507--Tool-Segment-Topstitch. Test: stitch shoulder seam, adjust curve, retain stitch offset and style across redraw and DXF/SVG export settings.

## 31. Topstitch free and seamline modes

**Functional behavior.** CLO Free Topstitch draws between arbitrary start/end points; Seamline Topstitch follows sewing line references. Edit Topstitch supports moving points/whole portions and style properties including offset, type, stitch count and shape. Different host types must survive cut and point-split remapping.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115002224527--Tool-Free-Topstitch ; https://support.clo3d.com/hc/en-us/articles/115002326248--Tool-Seamline-Topstitch ; https://support.clo3d.com/hc/en-us/articles/115002752908-Edit-Topstitch. Test: seam edit retargets seamline stitch automatically, style modification affects one selected class only.

## 32. Layer order and locking

**Functional behavior.** CLO order actions Bring Forward/Front and Send Backward/Back apply to panel and internal shapes. Lock All Patterns disables selection of outlines to enable internal-line work, while individual pattern locks can include their internal lines. Selection priority depends on lock/filter state.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000294907-Order and https://support.clo3d.com/hc/en-us/articles/115012380808-Lock-All-Patterns. Test: overlapping contour and internal guide, lock outlines, edit guide, unlock and prove no geometry mutation.

## 33. Grading size groups

**Functional behavior.** CLO Object Browser supports Size Groups, adding sizes, inserting smaller sizes and assigning an existing or new rule to selected panels. Edit Grading includes point, curve and each-size variants; baseline size must be explicit and sizes should not be sorted lexicographically.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115015578947-Add-Apply-Grading and https://support.clo3d.com/hc/en-us/articles/115015798567-Set-Grading. Test: XXS/XS/S/M/L preserve intended numeric order and base S geometry unchanged.

## 34. Grading offsets and curve integrity

**Functional behavior.** CLO grading Property Editor supports distance from base size and offset increments between sizes; x/y deltas or ratio depending on graphic mode. Pattern dimensions and curve arcs must be recalculated for each size, not derived by uniformly scaling the canvas screenshot.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115015798567-Set-Grading and https://support.clo3d.com/hc/en-us/articles/360000752507-Edit-Grading-Properties. Test: graded neckline differs from base by assigned shifts with tangent continuity and notch registration per size.

## 35. POM and numerical dimensional authority

**Functional behavior.** Measurements require persistent endpoints or named path references, a units system and graded values, tolerances and revision. Distinguish temporary tape distance from factory POM; geometry changes should recalculate dependent measured results or mark them invalid if anchors disappear.

**Evidence and acceptance.** D; baseline pages 18–19 and 29. Test: chest width and HPS-to-hem update after seam move, values round only at UI, tolerance fail highlights outside approved range.

## 36. DXF import choices

**Functional behavior.** CLO DXF import exposes units/scale, rotation, baseline tracing, swapping cutting and sewing lines, notch placement and position, curve point optimization and allowance conversions; source documentation notes version 2026.1 removal of one allowance-conversion menu option. Never silently assume mm when units are unspecified.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export. Test: fixture AAMA/ASTM-style layers import with sewing contour, cut contour, notches and grain direction preserved; warn unsupported file feature.

## 37. DXF export and round trip

**Functional behavior.** CLO DXF export can omit grading/baselines, export selected panels, include notches on allowance and swap cutting/sewing line interpretation. A manufacturer's DXF should preserve closed contours, useful layer semantics, and numeric dimensions; loss reports should name unsupported properties.

**Evidence and acceptance.** V: https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export. Test: import→export→reimport contour Hausdorff deviation less than agreed manufacturing tolerance, IDs mapped, no duplicate notches.

## 38. Print layout and cutting markers

**Functional behavior.** Print layouts need deliberate paper scale, tiled registration, notches, grainline, cut/sew legends, labels, piece quantities and page dimensions. Allowance display preferences must be explicit to prevent unintentionally producing sewing-line-only prints for cutting.

**Evidence and acceptance.** D; CLO visibility in print layout V: https://support.clo3d.com/hc/en-us/articles/115013215787-Show-Hide-Seam-Allowance. Test: print 10-cm calibration square at 100%, assemble tiles and compare ruler measurements.

## 39. Undo, preview and transaction consistency

**Functional behavior.** Every mutation must keep contour, sewing relations, dart/pleat entities, notches, grading, POM and 3D mapping under one undo boundary; provisional drags should preview without committing invalid geometry. Escape cancels in-progress commands while restoring last stable model.

**Evidence and acceptance.** D; M:N Escape semantics V in official M:N Free Sewing page. Test: 100 undo/redo cycles of curve edits, cuts and seam assignment compare deterministic serialized model hash.

## 40. Manufacturer-ready release gate

**Functional behavior.** A pattern passes release only if every panel has a valid closed cutting path, named sewing path, seam allowances per production spec, size-grade definitions, registered notches, grainline, BOM reference, construction notes, graded POM/tolerances, piece counts, validated exports and revision traceability. Simulation plausibility is not a substitute for these factory properties.

**Evidence and acceptance.** D production acceptance proposal. Test: automated report exports hard fail list and exact affected panel/edge IDs; any missing critical property blocks status 'factory verified'.

## 41. Release and version claims

**Functional behavior.** Marvelous Designer 2026.1 marketing and release documentation describes a related but separate product. Shared vendor concepts can motivate design, but feature names and availability must be checked product-by-product; do not use an MD 2026.1 release note to assert CLO 7.0 functionality.

**Evidence and acceptance.** V: https://www.marvelousdesigner.com/products/release and https://support.marvelousdesigner.com/hc/en-us/sections/51986358417817-New-Features . Test: feature matrix records product, release, source, and screenshot before any parity claim.

## Cross-cutting identity and interaction contract

Each tool operation should specify: active tool; eligible selection types; cursor affordance; ordered input stages; numerical dialog when relevant; invalid state feedback; mutation to typed CAD entities; linked-entity propagation; commit/cancel/undo; and output/export implications. Every editable boundary interval should be identified by `{panelId,edgeId,tStart,tEnd,direction}` and every notch by persistent host identity plus station. Reparameterization after splits must return explicit migration maps. A default numerical tolerance must never masquerade as a sourced CLO constant.

## Prioritization

**P0 geometry correctness:** selected point/curve drag; split/delete migrations; contour validity; accurate arclength; stable internal-line identity; sewing source interval model; save/undo. **P1 production tooling:** allowance joins, notches, grading, POM, DXF roundtrip. **P2 advanced drafting:** unfolding, slash/fullness, dart/pleat semantics, with-sewing clones, topstitch configurations. Record status per tool as implemented, demonstrated, tested, or unresolved.
