# CLO 2D Pattern System — Updated Deep Audit, 18 October 2026

**Report version:** 2026-10-18 · **Deliverable:** 57 intentionally page-numbered Markdown chapters · **Status:** documentary/implementation audit, not a CLO 7 feature certification.

**Evidence key:** **V** = described in official CLO material (subject to target-release confirmation); **D** = derived EXO design or source-code audit assertion with cited file/line; **U** = unverified in the installed CLO 7.0.242 session or requiring functional measurement. A screenshot establishes pixels and visible UI only. A prior investigator's live inspector report is historical provenance, **not** a live inspection conducted while authoring this update.

**What is retained and what is new:** Chapters **01–37** below preserve the pre-existing `docs/CLO_2D_PATTERN_SYSTEM_RESEARCH_36_PAGES.md` foundation (which actually has **37** numbered headings despite its filename). Its preceding companion PDF was claimed to lay out pages independently; that historical PDF layout was not verified here. Chapters **38–57** are newly written synthesis using the 162-criterion `clo7-official-point-tool-audit-20261018.md`, the `exo2d-geometry-deep-audit-20261018.md` code audit, and the provided CLO 7.0.242 `Male_T-shirt.zpac` inspector image. Prior chapter terminology and historical observations remain attributed to the baseline and must not be mistaken for fresh direct interaction. **Each `## Page NN` heading starts a distinct logical manuscript page; page counts do not imply print-pagination until rendered.**

**Local primary evidence:** `docs/CLO_2D_PATTERN_SYSTEM_RESEARCH_36_PAGES.md` (existing 37-chapter foundation); `research/clo-2d-analysis/clo7-official-point-tool-audit-20261018.md` (162 V/D/U criteria); `research/clo-2d-analysis/exo2d-geometry-deep-audit-20261018.md` (EXO implementation audit); `research/clo-2d-analysis/live-clo-inspector-20261018.png` (captured CLO 7.0.242, `Male_T-shirt.zpac`, supplied screenshot; not evidence of live tool operation by this author).

**Document conventions:** source links [S01]–[S29] defined in foundation Page 37; later chapters include full official links and precise EXO module locations. Every checklist item is a proposed test, not a pass. Units and tolerances are proposal-specific unless a cited CLO article documents them.

---

## Page 01 — Research method and evidence hierarchy

**Evidence.** The primary visual reference is a cropped 744 × 1356 screenshot of a 2D T-shirt bodice and small collar/binding panel. It contains an outline, node markers, internal blue-violet guidelines, a dotted black/blue central line, two short red strokes at each armhole and a pair of hem lines. This is useful for understanding relative placement, contrast, line weight, and editing affordances. A screenshot cannot, by itself, tell us whether a specific line is a seam allowance, internal line, stitch decoration, or another object. That identity must come from tool context or data.

**Cross-check.** CLO's official help defines independent features for pattern outlines, internal shapes, baselines, notches, sewing lines, seam allowances and topstitch. We use their documented commands, selection responses, property-editing behavior and export semantics to separate these features. The installed CLO session was examined with EXO's signed Inspector; it provided a window screenshot and Accessibility hierarchy but cannot safely infer invisible object properties from one view. [S01][S02][S03][S04][S05][S06]

**ClothCraft rule.** Every geometry feature must indicate its source: real Rust panel data, a derived construction guide, or a saved document annotation. Each must have a stable identity when selection, editing or export is promised. We will validate one front panel, then reuse the model across garment types.

## Page 02 — Pixel anatomy of the user's exact reference

**Observed layout.** The bodice top begins around y=245 and its bottom around y=1147 in the supplied image. The shoulder lines slope from neckline to armhole, with a parallel blue-violet path just inside them. A curved collar opening contains an identifiable midpoint. A narrow binding rectangle sits above the bodice with corner, center and angled colored marks. At around y=592 a light blue-violet horizontal line spans the torso between both underarm-side intersections; at around y=824 another horizontal traverses the waist/abdomen region. Twin hem lines appear immediately above the bottom outline. The center axis runs from the deepest neckline point to the hem.

**Control points.** Circular markers are visible at neckline-center, shoulder transitions, the two chest-line side intersections, torso midpoint on chest and waist, lower hem ends and center, and several points near the abdomen. Black and gray filled points coexist with blue-violet hollow circles; their styles imply different editing or selection states, but without an active tool state we should not assign them definitive CLO object classes.

**Engineering consequence.** Build the screen from geometric objects in consistent drawing order: panel fill; underlying baseline and construction marks; seam allowances and associated notches; sewing/topstitch overlays; cutting contour; editable hit targets and control points; contextual labels. The original screenshot remains the acceptance reference, not the sole specification.

## Page 03 — The 2D window's underlying responsibilities

The 2D workspace is a CAD editor operating on metric pattern data. Its job is not simply to reproduce the silhouette: it must preserve ordered contours, internal curves, endpoint relationships, selected entities and garment construction intent. The 3D viewport then interprets these through cloth meshing, sewing constraints and materials. This establishes an important separation between an informative nonphysical guideline, an internal line with authored coordinates, a cut contour that changes fabric topology, and a stitch or seam instruction that can affect construction.

**CLO evidence.** Edit Pattern selects and modifies points/segments; Edit Curve Point edits control geometry; Internal Polygon/Line authors interior geometry; sewing and topstitch tools attach further relationships. These are separate commands with distinct effect scopes. [S01][S02][S07][S08]

**EXO recommendation.** Treat a panel as `Panel {id, outline, curves, internalLines, measurements, notches, seamAllowances, sewingRefs, topstitches, annotations}`. Both views may render one source of truth, but each command modifies only its supported parts. A line should not silently become a cut edge merely because it is highlighted. Edit commands must have reversible native operations and stable IDs.

## Page 04 — True cutting contour and its segment topology

The thick near-black outer path in the screenshot represents the fabric panel cut perimeter. It consists of straight and curved segments joining at meaningful points: neckline, shoulder tip, armhole, side seam, hem corner. A physical cut boundary needs a closed ordered contour, non-self-intersecting topology, correct orientation and dimensions in material coordinates. Curved geometry may be represented as Bézier controls or explicit sampled boundary positions, but the editing system must preserve the original parametric intent.

**CLO interaction.** Edit Pattern can select a single segment or multiple adjacent segments and move them, while Add Point/Split Line can divide segments at exact distances or by equal divisions. Multiple selectable segments can be edited together. [S01][S09][S10]

**EXO behavior.** Preserve original Rust point IDs and edge IDs. Render cut edges at a predictable stroke width, with separate larger invisible pointer targets, never increase the stored curve radius just to improve hit testing. Recalculate segment lengths after a successful geometry edit. Report length as arc length of the actual curve, not a straight end-to-end chord. Undo/redo must restore shape, curve parameters, notches tied to edge fractions, and dependent seam relationships consistently.

## Page 05 — Points, anchors and visible node language

The screenshot includes filled black and gray circles at panel vertices, hollow blue-violet circles at internal-line connections and small nodes around the collar. These patterns communicate editability and topological importance. Nodes should be sufficiently visible against a white panel without a heavy box around each one. The active point requires a stronger accent than a hovered point. Curve handles must be visually distinguishable from true vertices; otherwise users may inadvertently change topology when attempting a gentle curvature adjustment.

**CLO evidence.** In Edit Pattern, users select points and lines by click, Shift-click or selection region. Curve Point tools add or move curve points; Bézier handles use distinct actions and modifiers. [S01][S02][S07]

**EXO proposal.** Adopt four visual categories: `vertex` with solid dark fill, `curveControl` with purple or muted fill, `guideIntersection` with a hollow blue-violet ring, and `selected` with a high-contrast orange/gold accent. Hover rings may be larger than the actual geometry. Decorative midpoint circles must never masquerade as stored vertices: they either expose a real node, or they need a tooltip indicating a measurement intersection and a distinct editing pathway.

## Page 06 — Dotted center-front axis

The reference center axis begins at the middle of the neckline and reaches the hem. Its appearance is a tightly spaced, dark vertical dotted line with some light blue showing through; it is much more prominent than a typical gray drafting grid. It is not the panel's exterior seam. The axis is a useful alignment datum for printing, mirroring, grading, center placement and measuring half-widths. Whether it should export as an internal baseline or be an internal line depends on the selected manufacturing workflow.

**CLO evidence.** CLO supports converting internal lines to baselines, which serve as guidelines and use a separate presentation from ordinary internal lines. This confirms that a drafting center datum does not need the same behavior as a sewing seam. [S11]

**EXO implementation.** Calculate the axis in the unrotated panel space using the neckline's real center if the pattern exposes it; intersect its x-coordinate with the cut boundary to obtain a visible span. Apply layout rotation only for display. A dotted SVG stroke must scale cleanly and remain selectable only in Edit Pattern or the appropriate guide mode. Its length readout must use metric geometry. The first pass can be a measured derived guide; a future explicit “Convert to Internal Line/Baseline” command must create persisted CAD data.

## Page 07 — Chest or cross-body line

The user's chest reference appears around the underarm level and spans from the left torso side boundary to the right torso side boundary. It is a solid, thin pale blue-violet line. Circular reference points mark both ends and the midpoint where it intersects the center front. Crucially, this is a measured cross-section of the panel, not automatically an avatar chest circumference. Front panel width, back panel width, ease, and seam allowances all affect actual garment circumference.

**Geometry.** At a selected material-space y-coordinate, intersect the two torso side boundary chains. When there are multiple intersections, use the intended torso side edges, not every intersection across sleeves. Display the actual distance between the selected cut-boundary intersection coordinates. On curved sides, this width changes continuously with y. If a single continuous valid span cannot be found, hide the guide and explain the missing topology.

**Acceptance.** On the first torso panel, the line crosses the full visible body section, with endpoint and center markers, one precise 2D-length measurement and a clear highlighted selection state. It must track a changed panel width, not stay at the original pixel coordinate. The selected length is measured in material units and must remain invariant under viewport zoom and rotation.

## Page 08 — Belly or waist construction line

The second horizontal line in the screenshot lies below the chest, near the abdomen, and follows the same drawing grammar: a solid pale blue-violet stroke with a central ring and side endpoints. Its purpose may be as a layout datum, a product specification measurement level, or an internal pattern line; the screenshot does not establish that it automatically represents an anthropometric waist circumference.

**EXO modeling choice.** Parameterize its vertical position relative to the panel's material-space torso height, but keep that ratio as a default preset, not an uneditable fact. A professional measurement can instead be anchored to an actual body landmark or to a user-entered distance from a known reference point. Store `anchorKind` and `offsetMm` when persistence is implemented. Changing the hem length should not silently alter a specified absolute waist-height distance.

**Interaction test.** Select the abdomen line with Edit Pattern, read its current panel width, adjust a torso side contour, then verify that its displayed endpoints and length update from new geometry. Selection should never initiate a pattern move if the cursor is over the guide's hit region. It should be easy to clear selection without modifying a garment.

## Page 09 — The double hem and why it is two entities

At the garment bottom, the screenshot shows two parallel interior lines immediately above the true bottom edge. They include center and endpoint markers. Visually this resembles a conventional double-needle hem or coverstitch finishing construction, but the exact garment manufacturing method cannot be proven from the screenshot alone. Two drawn guidelines and two actual rows of topstitching are not semantically interchangeable.

**CLO evidence.** Topstitch style settings can specify multiple rows, the spacing between rows, thread thickness and stitch parameters. A topstitch can also be attached to a pattern segment or an internal line and edited as its own object. [S04][S12]

**EXO target.** Show two clean, distinct hem construction references as measured guides in the first phase. In the construction phase, connect the finished hem operation to `TopstitchStyle {lineCount:2,spacingMm,...}` and an actual hem-related contour or folded internal line. Give the renderer a clean CAD drawing option and a stitch visualization option. Ensure the displayed pair remains parallel to a curved hem when appropriate; two arbitrary world-horizontal lines fail on nonrectangular hems.

## Page 10 — Neckline curvature and the separate rib-band panel

The reference screenshot includes a small detached rectangular collar/binding pattern above the torso, with a colored short diagonal at each end and a central vertical marker. The torso neckline itself is a continuous concave curve between the shoulder/neck junctions, with a middle anchor. This illustrates why a real T-shirt project requires more than one outline: the binding strip is its own physical panel with length, width, stretch and sewing relationship.

**Engineering target.** Preserve front neckline, back neckline and binding strip as independently selectable panels. Their sewing links must be explicit; the binding must be able to differ in cut length because a rib-band is frequently shorter than the opening it joins. The center-front neck mark and strip midpoint support alignment without creating an actual split in the physical seam unless the user requests one.

**Validation.** Selecting the neckline should show the curved arc length; selecting the detached strip should show its own length; selecting their seam correspondence should reveal paired endpoints and direction. Do not derive binding stretch ratio from the screenshot or force one generic ratio. That value belongs to garment design data or user input.

## Page 11 — Shoulder offsets and the secondary violet path

In the screenshot, a thin blue-violet path closely parallels each sloped shoulder perimeter, connecting a point near the neck to one near the sleeve/armhole tip. This could be an internal guideline, an offset sewing line, seam allowance, or a seam-referenced marking. Color alone cannot establish which one. It is important to inspect the active CLO tool and the selected object's properties before assigning behavior.

**CLO evidence.** Seam allowances have their own selectable properties; internal lines can be offset from an existing segment with exact spacing; topstitches can be attached to pattern outlines and internal geometry. Therefore several object types can make similar parallel strokes. [S03][S04][S13]

**EXO rule.** Display a parallel shoulder stroke only when supported by the panel's actual seam allowance, internal line or saved annotation. If the line is a seam allowance, it must follow the outer curve and update when its width changes. If it is an internal line, the exact authored points should be independently editable. If it is a sewing line, clicking with Edit Sewing should reveal the paired corresponding seam. The default screenshot styling should not cause unsupported objects to appear as manufacturing instructions.

## Page 12 — The double red underarm marks

Two short red parallel slashes sit at both underarm areas, crossing or approaching the outer armhole perimeter. These look like a **double notch marking**: paired cutting or sewing registration ticks that help identify orientation and match pattern pieces. A double notch is common on sleeve/back-armhole matching, while a single notch is frequently used on front sleeves, but manufacturing conventions vary. The screenshot proves only the visual location and pairing, not which edge it belongs to.

**CLO evidence.** The Notch tool creates marks on outlines and internal lines. Users can place, select, move, remove and set them at specific distances. In newer CLO versions notches are also represented on seam allowance offsets. Directional notches attached to sewing lines are a separate feature with a different purpose. [S05][S06][S14]

**EXO target.** Model a notch as an edge-anchored object with a stable ID, normalized arc-length parameter, physical depth and display style, including `single` or `double` count and configurable separation. Render the two strokes consistently with zoom. A double notch must not be permanently painted into a sleeve picture or confused with the native Edit Sewing orientation indicator.

## Page 13 — Notch placement, movement and precision

Professional notch placement is a measured operation. The user hovers a source edge, receives a position preview, clicks to insert the mark, and can subsequently drag the notch or enter an explicit split distance or proportional position. The knot's apparent position must be defined by arc length along a curved edge rather than by the raw index of a tessellated mesh sample. If the underlying curve resamples, an index-based notch would drift unpredictably.

**CLO evidence.** Notch insertion supports exact values, edits and deletion. The display system can choose screen-fixed notch lengths or physically scaled notch lengths. [S05][S14]

**EXO behavior.** Store `edgeId`, `tArcLength`, `depthMm`, `style`, `count`, `spacingMm`. Constrain `tArcLength` to [0,1]. When the edge moves, recompute position and inward/outward normal. When an edge splits, remap the notch to the proper child edge based on cumulative length. The inspector should show the selected notch's owner, position, width/depth/count and any associated seam match. Undo must return both geometry and notch mapping. Tests cover curved armholes, mirrored edges, close double notches and nearby seam allowance offsets.

## Page 14 — Sewing lines versus colored sewing-direction marks

Sewing is a relationship between portions of two pattern edges or internal lines, not a property of their stroke color. CLO's Segment Sewing workflow makes the first selection, previews a second matching segment and displays directional notches. Crossing those directional marks can produce an unintended twist or reversed sewing correspondence in simulation. Edit Sewing permits reversing direction, resizing the sewing portion, moving endpoints, hiding or deactivating a seam. [S15][S16]

**EXO architecture.** A seam requires `first: {panelId,edgeId,startT,endT}`, `second: {...}`, `reverse`, `enabled`, and a stable seam ID. Its direction indicator should render as a distinct overlaid arrow or notch that belongs to the seam relationship, never as an imported pattern-cut notch. Shared seam endpoint dots should be individually selectable when Edit Sewing is active.

**UI consequence.** In Edit Pattern mode, emphasize the underlying edges and geometry; in Edit Sewing mode, emphasize seam segments and directional orientation; in Notch mode, target notch marks. Color and pointer priority change with context, but the underlying object references do not. Selection state should determine the Property Editor schema.

## Page 15 — Segment sewing and partial segment ranges

CLO lets users sew one complete segment to another, or split sewing relationships into partial ranges defined by points and notches. Matching a sleeve cap to a bodice armhole often requires several correspondences, shoulder reference points and unequal geometric lengths to account for ease. A useful implementation cannot restrict sewing to simple whole-edge pairing when the pattern design needs partial segments.

**CLO evidence.** Segment Sewing selects the first edge and then the matching edge, while the direction notch indicates correspondence. Sewing can be divided using notches without physically splitting a full pattern segment. [S15][S17]

**EXO acceptance.** Users should choose A and B with highlighted endpoints, preview both ranges, see live measured lengths and the mismatch, flip orientation before committing, and keep those ranges stable after reload. Intermediate free-sew points must have semantic identity and be traceable to source edge arclength; temporary pointer points should not be accidentally serialized as permanently changed pattern vertices. The existing EXO segment/free sewing modes are foundations; the research target is consistent usability and inspector feedback for the front T-shirt panel.

## Page 16 — Sewing mismatch checks and numerical tolerances

Correct-looking seam lines can still produce incorrect construction if paired segments differ in length or run in the wrong direction. CLO offers a Check Sewing Length tool that highlights pairs whose length difference exceeds a threshold. CLO also displays sewing differences during seam creation. The documented default threshold varies by software version, so EXO should expose a configurable threshold rather than hard-code a particular number. [S17][S18]

**EXO proposal.** Compute signed and absolute seam-length difference using arc lengths of the selected ranges. Display `lengthA`, `lengthB`, `deltaMm`, `ratio` and a status label that is visible even to users who cannot distinguish color. Explicitly distinguish intentional ease or gathering from an unexpected mismatch; the simulator may legitimately support uneven seam lengths.

**Tests.** Use a known matching pair, then extend one edge by a measurable amount. Verify the threshold is checked in millimeters independent of viewport zoom. Reverse sewing, verify directional indicators update without changing the measured lengths. Verify keyboard selection, multi-selected seams and undo. Never derive actual sewn length from a pixel polyline when parametric source geometry exists.

## Page 17 — Internal lines as authored CAD geometry

Internal lines in CLO are drawn within an existing panel and can use curve points, directional constraints, exact lengths and measured positions. They can support folds, sewing, topstitching and construction references. They differ from freehand annotations because they have geometry in panel material coordinates and are addressed by many downstream tools. [S08][S19]

**EXO state today.** The native 2D board can submit a Rust `InternalLine` command, but the chest/belly/hem overlay currently derives visual spans directly from boundaries and does not automatically become an authored internal line. Displaying and selecting such a derived overlay is useful as a reference, but it is not sufficient for real 2D CAD parity.

**Required architecture.** Provide an explicit “Make Internal Line” action that takes the measured reference endpoints, converts them from layout space back into canonical panel material coordinates and submits a serializable native operation. Upon completion, display the saved line using the real native line ID. After reload, move it with Edit Pattern, assign seam or topstitch relationships, measure its arc length, and remove it through undoable commands. The raw derived guide should be hidden or visually deprioritized when a corresponding real internal line exists.

## Page 18 — Baselines, grainlines and nonphysical guides

Design and manufacturing diagrams need reference lines that should not be treated as cut or sewn edges. CLO documents “Convert to Baseline,” turning internal lines into guideline objects that are displayed differently from ordinary internal lines. Pattern Symbols can also be linked to boundaries or internal geometry, and annotations may move with their parent geometry. [S11][S20][S21]

**EXO separation.** A guide object should store a coordinate definition and a semantic `purpose` such as center-front, fold, balance, chest-level or placement. A physical stitch line is an attachment of sewing or topstitch metadata to an authored path. A grainline arrow or fold instruction is a symbol attached to a line; it should not become a fabric cut.

**Practical effect.** Let the user switch visibility of construction guides, internal lines, sewing marks, seam allowances, notches, topstitches, print graphics and measurements independently. Export rules should be explicit: DXF print/export may include specified guide classes, whereas the cloth mesh need not. The first-panel UI should show construction context clearly while protecting the user from accidentally simulating or fabricating derived linework.

## Page 19 — Point-of-measure versus selected-line length

Measurements in garment software serve several distinct purposes. A selected segment has geometric length; a cross-panel horizontal line represents width at a particular level; a POM may follow a polyline or multiple segments to record a garment specification. A 3D garment may have a different length after stretching or draping. These values must be labeled separately and never treated as interchangeable merely because all are expressed in centimeters.

**CLO evidence.** Point of Measure permits rulers along pattern outlines, internal shapes and graphics, including groups that span multiple patterns. The interface exposes POM assets in an Object Browser tab and permits a 3D-length readout. A POM can follow segment geometry and grading size information. [S22]

**EXO architecture.** Distinguish `GuideSelection.length2d`, `NativeEdge.length2d`, `NativeEdge.length3d`, `POM.pathLength2d`, `POM.pathLength3d`, and `CrossSection.width`. Use the same metric conversion utilities and formatting rules but keep source identities explicit. The selected chest line's displayed width should be exact for its geometry, while the future product techpack POM can anchor that width at a defined height with its own persistent identifier and sizing rule.

## Page 20 — The Edit Pattern interaction contract

Edit Pattern is a selection, inspection and manipulation context. CLO documents clicking individual lines and points, Shift-click for multi-select, region and lasso selection, keyboard nudging, constrained movement, and precision dialog boxes. The selected object is emphasized; subsequent actions depend on whether it is a panel, edge, curve point or internal segment. [S01][S02]

**EXO target.** One click on a real cut segment selects that segment and shows its correct length. One click on a point selects the point and displays coordinates and neighboring segments. A click on the chest construction guide shows its material-space length and explains whether it is derived or persistent. Shift-click should extend compatible selections. Press Escape to exit any in-progress drawing command without affecting unrelated objects. An active text entry retains native text editing behavior for keyboard shortcuts.

**Gesture priority.** Point handles outrank their supporting edge; a selected visible sewing line outranks underlying pattern geometry only with Edit Sewing active. Inside-panel dragging moves the full pattern only in a transform mode. A slim visible line gets a forgiving invisible hit path at the correct zoom level. Background drag pans the canvas. This hierarchy avoids the frustrating situation where selecting a line accidentally translates the entire garment piece.

## Page 21 — Smooth curves, Bézier handles and true arc length

The neckline and armholes in the screenshot are smooth curves, while shoulders and much of the hem are straight. Professional drafting requires controls for endpoints, tangent continuity, free curve points and, where appropriate, Bézier handle length and angle. Smooth-looking sampled polylines are insufficient if an edit cannot preserve design intent.

**CLO evidence.** Edit Curve Point adds/moves control points; Bézier editing exposes handles with modifier-key operations; Edit Curvature allows intuitive dragging of the line itself to alter its bend. [S07][S23]

**EXO requirement.** Represent the editable curve as a parametric primitive (control points and interpolation mode), using render samples only for drawing and hit testing. The construction guide's cross-section should intersect the evaluated curve, not just the coarse tessellated polyline when high precision is required. Calculate arc length through adaptive numerical integration or stable cumulative sampling with an explicit error tolerance. If a curve becomes a straight segment, release its obsolete handle geometry. Multi-step undo should preserve exact coordinates before and after edits.

**Acceptance.** Change a neckline curvature without moving the panel's side seam, verify a smooth new curve and updated neckline arc length, then undo to the prior geometry. Its connected binding seam should remain attached to the intended source edge.

## Page 22 — Splitting, merging and point identity

Adding a point to a contour splits one segment into two; splitting an internal line should preserve the relationship of all attached construction metadata. CLO supports freehand insertion, exact distances, ratios, uniform subdivisions and guided snapping during splitting. Point merges on internal lines can target an existing point, a midpoint or an intersection. [S09][S24]

**EXO model.** A split transaction should create new stable edge IDs while retaining an explicit mapping from old arclength coordinates to child-edge intervals. This allows notches, seam ranges, topstitch placements and POM anchors to survive. If the split fails due to invalid geometry, none of the dependent relationships should change.

**UI.** The Split Line tool should show a translucent candidate point, distance from each endpoint and optional snap targets. Clicking confirms a constrained Rust command. Right-clicking or opening a numeric dialog should offer length, ratio and equal division modes. When an existing guide intersects a new split point, the guide should snap visually without silently converting itself into a structural seam. Tests must include splitting at a notch, near a curve control point, and inside an armhole radius.

## Page 23 — Grid, ruler and precise snapping

The reference uses a neutral fine square grid behind the white pattern paper. The grid is visible enough for orientation but lower contrast than the construction lines. Its scale should remain connected to actual metric coordinates. Users must be able to judge dimensions consistently whether viewing a front torso close-up or several panels at once.

**CLO evidence.** Snap to Grid and Grid Properties expose configurable grid intervals; precision point and line operations use construction guidelines and cursor snapping. [S25][S09]

**EXO target.** Store viewport zoom and grid spacing separately from garment material units. A 10 mm grid must be 10 mm in the CAD coordinate system, regardless of display resolution. Screen-space pointer tolerance can increase as users zoom out, but committing geometry must map back to exact world coordinates. Define a snap priority: explicit point, boundary intersection, line endpoint, grid intersection, then free pointer, with optional modifiers to disable snapping.

**Design rule.** Dark major grid and brighter construction lines should never have the same optical weight. Include adjustable minor-grid visibility and clear snap feedback. A resize of the 2D panel or transfer to a high-DPI display must not change any stored pattern measurement.

## Page 24 — Lasso, marquee and multi-object selection

Dense patterns contain overlapping measurements, notches, internal lines and sewing marks. A cursor-only workflow becomes slow when users need to adjust several related points. CLO supports Shift-based multi-selection, rectangular marquee and polygon/lasso selection that can encompass points and segments. More recent versions permit linking selected lines for synchronized editing. [S01][S02][S26]

**EXO target.** Use a unified selection set with typed handles such as `{kind:'edge',panelId,id}` and `{kind:'internalLine',panelId,id}`. Never assume two different object types with the same numeric ID are the same object. Marquee selection should have an explicit policy on “fully contained” versus “crossing” semantics and visually distinguish the chosen mode. A Shift-click on an already selected item should toggle it without accidentally moving the whole panel.

**Inspector.** Multi-selection should show shared editable properties, counts and aggregate measurements where meaningful. Incompatible mixed selections should display a concise “multiple object types selected” state rather than incorrect fields. Editing a selection of multiple red notches must not change garment mesh geometry or delete associated seams.

## Page 25 — Zoom, pan, focus and coordinate transforms

The 2D workspace must work at both whole-garment scale and close-up point-editing scale. CLO documents Focus Zoom on a selected pattern, Zoom Extents All and automatic panning during applicable drafting operations. [S27]

**EXO geometry requirement.** Keep a canonical panel coordinate space in meters, a panel layout transform, and a viewport camera transform. Each transformation should have an explicit direction and inverse. Selection hit testing must be evaluated in screen space or with a world-space tolerance derived from the current viewport scale. SVG line widths should be chosen intentionally between physical CAD widths and screen-fixed pointer affordances.

**Practical tests.** Select the chest midpoint, zoom in 5x, verify the line remains attached to the same pattern coordinates and still receives pointer events. Pan while using Edit Pattern without modifying a selected pattern. Focus a torso panel and verify no huge jump to the 3D camera occurs. Fit all should include sleeves, the collar strip and annotations. Reset view should not reset garment geometry, selected stitch styles or active simulation state.

## Page 26 — Context-sensitive Property Editor

CLO's Property Editor changes according to the selected semantic object. Choosing a fabric shows fabric material data, selecting a sewing line shows seam settings, and selecting a pattern edge or internal line presents geometry operations. A large universal property list would force users to hunt through irrelevant fields and could permit operations on unsupported object types.

**EXO design.** The inspector's top identity row should show object type, panel, stable ID and a measured value only when that value exists. Pattern segments expose arc length and curve controls. Interior authored lines expose endpoints, length, reference/annotation semantics and assigned sewing/topstitch entities. A notch exposes location and depth. Sewing exposes both edge lengths, difference, orientation and activation. Seam allowance exposes width and corner joining style. A derived guide exposes a truthful metric readout plus “Convert to Internal Line” when implemented.

**Interaction rule.** Clicking an inline value enters editing mode with understated focus treatment; ordinary readouts should not be framed with heavy boxes. Invalid edits produce an accessible message and preserve the previous value. Undo must group drag or compound property operations into a single meaningful action when appropriate.

## Page 27 — Color semantics and rendering hierarchy

The reference uses gray graph paper, white filled pattern pieces, black contour edges, light blue-violet construction lines, red notch marks and mixed filled/hollow node symbols. CLO documents different selection highlighting for several tools, often yellow, but exact colors can vary with version and workspace theme. Therefore a faithful recreation should preserve object hierarchy and contrast before chasing hex-perfect colors.

**Proposed tokens.** Background `#c9c9cb`; panel paper `#f7f8f7`; cut contour `#263138`; construction lines `#80b7e4`; notches `#e34249`; selected `#ed9d26`; inactive annotation `#7b7dc0`. These are design starting points only. The screenshot's violet shoulder offsets deserve separate style tokens based on confirmed semantics, not a global change to all seam allowances.

**Draw order.** Background grid first, then panel fill and graphics, construction references, real seam allowances and sewing overlays, contour, points, selections and labels. Hit-test geometry is independent of visible stroke width. Always provide non-color cues: dash pattern, shape, endpoint treatment, label or selected outline. High contrast and restrained line density should remain functional under different custom app themes.

## Page 28 — Pattern annotations and linked symbols

Patterns need textual notes, grainline arrows, fold markers, match-point labels and manufacturing instructions. CLO's Pattern Annotation system allows editing text in the 2D workspace and anchoring annotations to a specific line or point so they follow pattern edits. Pattern Symbols are distinct entities attached to segments or internal shapes. [S20][S21]

**EXO target.** Store each annotation's text, panel ID, optional source geometry reference, normalized placement offset, rotation and visibility. If anchored to an edge, the annotation must maintain orientation when the panel rotates or the edge changes shape. If the source edge is deleted, show a recoverable orphan state or a clearly defined detach rule rather than silently losing the note.

**First-panel examples.** “CENTER FRONT,” “CUT 1 ON FOLD,” “RIB BINDING,” “HEM 20 MM” and sleeve matching references should be available as design metadata. These labels must never be used to infer physical thickness, fabric elasticity or a stitch configuration automatically. Printing and DXF export may include annotations according to explicit inclusion settings.

## Page 29 — Size grading and measurement dependence

Once a single T-shirt panel is correct, scaling it to sizes must not merely multiply the SVG. Garment grading distributes additional width and length across selected points, curves and seams. A front chest guide should recompute from the graded geometry for each size. Notches must remain attached to their source edges, and matching seams should be checked for every size.

**CLO evidence.** The Grading tools edit point and outline rules for size groups, including separate X and Y changes, offsets and curve grading. POM reporting can show measurement values by grading size. [S28][S22]

**EXO architecture.** Define `SizeGroup`, a base size, and per-point transformation rules, not a single universal scale factor. For derived reference lines, specify whether their y-position is relative to the size's panel bounds or anchored to a POM distance. For saved interior geometry, determine whether each point receives matching grading transforms or independent rules.

**Acceptance.** Grade one T-shirt front, verify shoulder/neck/armhole continuity, measure chest and waist levels, inspect hem spacing and check seam lengths for the corresponding sleeve. All measurements must carry an explicit size designation.

## Page 30 — DXF, cutting line and sewing line interchange

Interoperability is more demanding than matching a screenshot because CAD export formats distinguish cutting lines, sewing lines, notches, reference lines and metadata. CLO's DXF import/export options recognize baseline tracing, line swapping, notch placement, seam allowances and related settings. [S29]

**EXO contract.** Record the semantic class of every exported line, along with units and layer identity. Preserve a clear mapping between generated cut geometry and authored interior construction geometry. If an exported DXF variant does not support a particular feature, use a documented conversion rule or explicitly omit it with a warning. Silent conversion of red double notch decoration into arbitrary linework can cause production errors.

**Testing.** Round-trip a simple front and back T-shirt pattern through DXF and compare panel count, segment lengths, curve continuity, notch positions and seam allowance dimensions. Apply tolerances in millimeters, not pixels. Verify that the 2D viewer's background guides do not appear as cutting contours in export. Check print scale at 100% using a known-distance calibration box.

## Page 31 — Proposed typed data schema

The first-panel work exposes why data shape matters. Storing an internal line only as a rendered SVG `<line>` makes it impossible to reuse for selection, undo, sewing or export. A real schema should carry explicit identities and reference relationships. It should work independently of the screen layout and persist through native project save/open.

**Recommended entities.** `PatternPanel {id,outlineEdges,layoutTransform,materialId}`; `InternalLine {id,panelId,points,curves,role}`; `ReferenceGuide {id,panelId,anchorExpression,purpose}`; `Notch {id,edgeId,arcFraction,depthMm,count,spacingMm}`; `SeamAllowance {id,edgeId,widthMm,cornerType}`; `Seam {id,firstRange,secondRange,reversed,enabled}`; `Topstitch {id,pathRef,styleId,offsetMm}`; `POM {id,anchors,units,gradingRules}`.

**Boundary.** Geometry information must be owned by native Rust data where authoritative. Derived guides may live in UI state until promoted to persisted references. An import should never invent fields with a credible-looking default and then present those fields as measurements. Add schema versioning and migrations before enabling interchange across older project files.

## Page 32 — Metric geometry invariants and numerical precision

All stored geometric values in the current native board use meters. Display and manufacturing requirements often use millimeters or centimeters. A 100 mm seam allowance accidentally interpreted as 100 meters is a severe error; similarly, a 2D dimension measured after a presentation transform can differ if layout scaling is misapplied.

**Core invariants.** All geometry is finite; panel outlines remain valid; line samples are converted to physical metric units before formatting; arbitrary viewport zoom and pan do not affect measurement; unit conversion happens only at input/output boundaries; curve length is an arc-length measurement; segment intersection rules handle vertices without double-counting; a notch's fractional position remains stable through rerender.

**EXO QA.** Establish numeric fixtures: a 0.4 m horizontal line must display 40.00 cm; a right triangle with 0.3 m and 0.4 m sides must report 0.5 m diagonal length; a curve must be compared against a reliable numerical reference. Apply a documented epsilon for intersection and hit-testing. If an invalid panel self-intersects, the board should show a visible geometry warning rather than silently reporting a misleading cross-body measurement.

## Page 33 — Interaction and tool-state architecture

The same pixel position may overlap a cutting contour, a notch, a sewing line and an annotation. Without an explicit tool-state model, click behavior becomes unpredictable. CLO's specialized selection tools help resolve that ambiguity: Edit Pattern, Edit Curve Point, Edit Sewing, Notch and Topstitch interact with different semantic targets. [S01][S05][S15][S16][S04]

**EXO state machine.** A primary `mode` selects geometry edit, sewing edit, topstitch edit, measurement, transform or view navigation. A secondary `activeTool` refines the target behavior. Each pointer event passes through a priority list configured for the active tool, with a selected target `{kind,id,panelId}`. A drag transaction records its starting coordinates and constraints, previews changes without modifying the native model, and commits once on pointer release.

**Safety details.** Escape cancels draft operations; a context menu is resolved from the true hit target; pan/zoom do not create edits; text inputs retain native undo; server-side errors leave the previous geometry unchanged. Multi-selection and keyboard focus are first-class input paths. Use the same selection identity for the viewport highlight and the Property Editor to avoid stale field panels.

## Page 34 — First-panel visual and behavioral QA matrix

The canonical reference is the user's 11:33:53 PM image. Compare at a matched zoom and panel alignment, not simply side-by-side screen pixels. Required visual checks: white T-shirt torso, dark curved cut perimeter, controlled shoulder offset, dotted center-front line from neck to hem, solid pale-blue chest and abdomen references, endpoint/center rings, two near-hem references, and deliberately represented red double armhole marks. The detached collar/binding strip must remain visible when framed together with the bodice.

**Interaction checks.** Select each horizontal guide with Edit Pattern and read its metric width; select the dotted center line and read its length; zoom and repeat; edit the physical side boundary and verify the guides update; use the real Notch tool to insert and move a mark; verify sewing direction indicators can be distinguished from notches; check seam length mismatch; undo and redo; save and reopen without loss of native edits.

**QA honesty.** Do not mark an action “passed” merely because an SVG exists or a toolbar button opens. Automated tests should assert real native revision changes when a Rust mutation is expected. A decorative guide can legitimately pass visual/measurement checks while the native promotion workflow remains pending.

## Page 35 — Engineering phases and reusable architecture

**P0 — One T-shirt torso panel.** Establish the visual hierarchy and stable selectable reference guides. Ensure accurate cross-section widths, a measured dotted centerline and good zoom behavior. Keep native notches, seam allowances and topstitches distinct. Pass JSX build checks, and inspect actual 2D screen and hit-test behavior.

**P1 — Promote to persistent geometry.** Define a guided “Make Internal Line/Baseline/POM” action; attach chest/waist/hem markings to authored panel coordinates; enable precision placement, moving and length editing through Rust commands; support red double notches as actual anchored notch data; add real double-needle hem topstitch style and shoulder-seam offsets when data calls for them.

**P2 — Complete CAD workflows.** Bring undo/redo, multi-selection, lasso, geometric snapping, curve handles, full seam editing, mismatch diagnostics, graded measurement rules, native save/reload and DXF export into one consistent interaction model. Generalize to back torso, sleeves, binding, hoodies, trousers and arbitrary imported panels through the same typed data schema. No hard-coded “front T-shirt only” selection route should remain in the core.

## Page 36 — Open design decisions, evidence gaps and acceptance gate

**Confirmed.** The reference establishes line placement and styling. Official CLO help establishes that notches, sewing markers, seam allowances, internal lines, baselines, POMs and topstitches are independently meaningful and editable. The current EXO board has native pattern selection/editing and separate Rust Notch/SeamAllowance commands, but several screenshot-style construction marks began as display overlays. The signed Inspector confirms CLO is open and its Accessibility bridge works; a single window capture does not fully identify the semantic type of the purple shoulder lines.

**Decision requiring a design choice.** Should the chest/abdomen references and center axis be persistent, editable `InternalLine` objects by default, or `ReferenceGuide`/POM objects that do not influence cutting and sewing until explicitly converted? The safer engineering recommendation is measured reference guides initially, with a deliberate conversion action. For the hem, decide whether the twin blue reference strokes should coexist with actual Topstitch objects, because the intended production finishing method cannot be inferred from one image.

**Gate before rollout.** Demonstrate the complete loop on a single front panel: correct reference appearance; active line selection; precise dimensions; optional persistent conversion; independent notch and sewing edits; undo; save/reload; matching 3D garment stability. Only after that should this pattern UI model be reused across all panels and garments.

## Page 37 — Bibliography and traceable official CLO references

The following are primary help-center sources. Page numbers reference this report's chapter headings; some source pages describe version-dependent details and should be rechecked against the installed CLO build during live comparison.

- [S01] Edit Pattern — https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern
- [S02] Select/Move Point/Segment — https://support.clo3d.com/hc/en-us/articles/360000012828-Select-Move-Point-Segment
- [S03] Edit 2D Seam Allowance Properties — https://support.clo3d.com/hc/en-us/articles/115015631887-Edit-2D-Seam-Allowance-Properties
- [S04] Edit Topstitch — https://support.clo3d.com/hc/en-us/articles/115002752908-Edit-Topstitch
- [S05] Notch — https://support.clo3d.com/hc/en-us/articles/115015735467-Notch
- [S06] Create Notch — https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch
- [S07] How to Edit Bézier Curves — https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves
- [S08] Internal Polygon/Line — https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line
- [S09] Add Point/Split Line — https://support.clo3d.com/hc/en-us/articles/115012181207-Add-Point-Split-Line
- [S10] Change Length — https://support.clo3d.com/hc/en-us/articles/115000416847-Change-Length
- [S11] Convert to Baseline — https://support.clo3d.com/hc/en-us/articles/115004423028-Convert-to-Baseline
- [S12] Segment Topstitch — https://support.clo3d.com/hc/en-us/articles/115002224507--Tool-Segment-Topstitch
- [S13] Offset as Internal Line — https://support.clo3d.com/hc/en-us/articles/115012380888-Offset-as-Internal-Line
- [S14] Notch placement details — https://support.clo3d.com/hc/en-us/articles/115015735467-Notch
- [S15] Segment Sewing — https://support.clo3d.com/hc/en-us/articles/115012381248-Segment-Sewing
- [S16] Edit Sewing — https://support.clo3d.com/hc/en-us/articles/115012380148-Edit-Sewing
- [S17] Check Sewing Length — https://support.clo3d.com/hc/en-us/articles/115012226027-Check-Sewing-Length
- [S18] Segment Sewing legacy tool — https://support.clo3d.com/hc/en-us/articles/115000498767--2D-Tool-Segment-Sewing
- [S19] Internal Polygon/Line tool — https://support.clo3d.com/hc/en-us/articles/115000481707-Internal-Polygon-Line
- [S20] Pattern Instruction Lines — https://support.clo3d.com/hc/en-us/articles/115015802448-Pattern-Instruction-Lines
- [S21] Pattern Annotation — https://support.clo3d.com/hc/en-us/articles/115004324627-Pattern-Annotation
- [S22] Create POM — https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM
- [S23] Edit Curvature — https://support.clo3d.com/hc/en-us/articles/115012380008-Edit-Curvature
- [S24] Merge Points on Internal Lines — https://support.clo3d.com/hc/en-us/articles/115000390268-Merge-Points-on-Internal-Lines
- [S25] Snap to Grid — https://support.clo3d.com/hc/en-us/articles/115000305508-Snap-to-Grid
- [S26] Linked Editing — https://support.clo3d.com/hc/en-us/articles/24228902330265-Linked-Editing
- [S27] 2D Pattern View Controls — https://support.clo3d.com/hc/en-us/articles/115004270628-2D-Pattern-View-Controls
- [S28] Set Grading — https://support.clo3d.com/hc/en-us/articles/115015798567-Set-Grading
- [S29] 2D Pattern DXF Import/Export — https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export

### Local implementation and reference materials

- `research/screenshots/clo-pattern-2334-reference.png` — exact user reference screenshot copied without editing.
- `research/screenshots/clo-live-inspector-2d-20261017.png` — read-only capture from the authorized signed EXO CLO Inspector, currently displaying the open Male T-shirt garment preview.
- `research/clo-2d-analysis/official-reference-findings.md` — independent research audit with extensive source links and P0/P1/P2 details.
- `research/clo-2d-analysis/qa-2d-reference.md` — independent QA plan and existing test harness review.
- `src/components/ClothCraftBoardV2.jsx` and `src/core/clothcraft2dGeometry.js` — native EXO 2D rendering and metric geometry.
- `src/components/ClothCraftWorkspace.jsx` — native event handling, Rust editing commands and persistent project interaction.

The companion PDF preserves one report page per numbered chapter, with this bibliography on page 37.

---

# Updated 2026 inspection and implementation deep audit (new content)


---

## Page 38 — CLO 7 screenshot evidentiary boundaries

**Evidence separation.** The supplied native inspector image records a visible CLO session labelled CLO 7.0.242 and Male_T-shirt.zpac. Treat it as a frozen raster observation: pattern placement, garment identity, displayed panels and any visible toolbars may support visual comparison, but the image cannot prove which tool was active before capture, whether a mark is an editable notch, nor what happened after a drag.

**Documentary and implementation support.** Official [Select](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) and [2D Pattern View Controls](https://support.clo3d.com/hc/en-us/articles/115004270628-2D-Pattern-View-Controls) are behavioral references.

**Verification design.** Register native screenshot width/height, viewport crop, canvas bounds, reference garment panel count, selection state if readable, and camera view. Capture equivalent EXO frame with same fixture and metric framing. Where object identity is not inspectable mark U and request a property editor inspection.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R001 | Select whole pattern via Transform Pattern | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R002 | Select boundary vertex via Edit Pattern | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R003 | Select boundary segment via Edit Pattern | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R004 | Double-click Edit Pattern to select full pattern | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R005 | Shift-select multiple editable items | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R006 | Marquee/lasso select patterns | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R007 | Highlight selected outlines and points distinctly | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R008 | Pick overlapping geometry intentionally | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 39 — Two-editor architecture and coordinate contract

**Evidence separation.** EXO currently exposes a React project-local point editor whose data uses centimeters and quadratic Q curves, and a native Rust-backed board whose points and cubic control handles are stored in metres. This is not merely a palette difference: shifting data between editors without an explicit conversion layer risks losing curvature, edge associations and precision.

**Documentary and implementation support.** Implementation anchors: `src/core/project.js:154-181`, `src/core/draftingPrecision.js:64-149`, `src/components/PatternEditor.jsx:44-59`, `research/oss/clothcraft/src/garment/polygon.rs:28-60`, `src/core/vectorPatternBezier.js:23-47`.

**Verification design.** Specify a `PatternTopologySnapshot` mapping material-space metres, stable edge IDs, cubic controls, and import provenance. Require an explicit quadratic-to-cubic conversion with measured contour error, rollback on mismatch, and no silent overwriting of source curve data.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R009 | Expose context menu for selected edge | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R010 | Transform pattern by translation | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R011 | Transform pattern by rotation | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R012 | Transform pattern by scale | D | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R013 | Retain physical geometry under zoom | D | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R014 | Fit selected pattern to window | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R015 | Fit all visible patterns | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R016 | Drag guide from ruler | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 40 — Point and segment hit-testing contracts

**Evidence separation.** A single pointer coordinate may overlap a true vertex, visible control handle, internal shape, notch, seam, and annotation. A tool-specific resolver must select semantic geometry, while the actual click region may exceed the visible glyph radius. Test seam and point editing at intersections and high zoom.

**Documentary and implementation support.** Official [Edit Pattern](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern), [Select/Move Point/Segment](https://support.clo3d.com/hc/en-us/articles/360000012828-Select-Move-Point-Segment).

**Verification design.** Record hit candidate list at an overlap and active tool. Ensure Edit Pattern favors boundary geometry, Edit Sewing favors relation ranges, Notch favors anchored notch glyphs and pan gestures do not mutate physical geometry.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R017 | Switch ruler among mm cm and inches | V | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) |
| R018 | Create closed polygon | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R019 | Create rectangle pattern | U | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R020 | Create ellipse pattern | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R021 | Maintain explicit outline vertices | D | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R022 | Maintain ordered boundary segments | D | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R023 | Add point on an existing segment | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R024 | Split segment into two | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 41 — Bezier handle interaction and tangent preservation

**Evidence separation.** The documented Bézier system distinguishes line dragging, direct handle dragging, Alt independent handles and Ctrl/Command handle-angle conservation. EXO native exposes two cubic controls and its current Alt/Shift semantics differ from the older standalone React quadratic editor. Precision neckline authoring requires a visible mapping between smooth, corner and cusp behavior.

**Documentary and implementation support.** Official [How to Edit Bézier Curves](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) and [Edit Curvature](https://support.clo3d.com/hc/en-us/articles/115012380008-Edit-Curvature). Native edit paths `ClothCraftBoardV2.jsx:779-845`; React `PatternEditor.jsx:1346-1365`.

**Verification design.** Exercise before/after handle vectors in native and React on the same neckline; check tangent angle continuity, segment length stability and exact undo. Record platform-specific modifier behavior as U in CLO 7 until executed.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R025 | Split segment by entered length | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R026 | Split segment by entered ratio | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R027 | Divide segment uniformly | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R028 | Reverse split interval direction | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R029 | Enter numeric length during drawing | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R030 | Apply Shift drawing angle constraints | U | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R031 | Keep interior line geometry separate from outline | D | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R032 | Undo last point placement | V | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 42 — Curve point versus Bézier representation

**Evidence separation.** Curve points on an interpolating contour and Bézier off-curve handles are not identical edit objects. The official staff discussion states historically they were not freely interchangeable; an editor that hides the distinction invites unintended outline deformation.

**Documentary and implementation support.** [CLO staff curve-point answer](https://support.clo3d.com/hc/en-us/community/posts/20145738258201-Why-can-t-I-see-the-legs-of-my-curved-paths?page=1), [Edit Bézier Curves](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves).

**Verification design.** Add explicit `curveKind` to selected edge inspector. Conversion operations must either preserve the curve within a numeric tolerance or request a conscious lossy replacement; save and reopen must retain kind.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R033 | Use Edit Curvature separately from Edit Pattern | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R034 | Use Edit Curve Point separately from Edit Curvature | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R035 | Drag straight segment to curve it | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R036 | Drag curved segment to alter bow | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R037 | Expose Bézier handles on segment point | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R038 | Drag handle endpoint to control tangent | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R039 | Alt drag one handle independently | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R040 | Ctrl or Command preserve handle angle | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 43 — Exact splitting of a curved boundary

**Evidence separation.** Native Rust de Casteljau subdivision preserves cubic locus when splitting, but chooses the parameter by flattened arc-distance approximation. React splits clicked quadratics via 24-step projection and subsequently resamples for remapping. Both approaches risk stationing error on tightly curved armholes.

**Documentary and implementation support.** Native `research/oss/clothcraft/src/authoring.rs:457-486,866-945`; React `PatternEditor.jsx:740-759`, `src/core/draftingSplit.js:45-55` and `App.jsx:464`. [Split Line](https://support.clo3d.com/hc/en-us/articles/115012380288-Split-Line).

**Verification design.** Use a high-resolution adaptive arclength reference for a strongly bowed/S-shaped curve; request 50% length split; compare physical station and contour before/after separately. Proposed 0.01 mm oracle threshold is EXO QA, not an official CLO standard.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R041 | Alt drag segment point to create Bézier | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R042 | Render new Bézier handle pair | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R043 | Delete a Bézier handle | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R044 | Convert point to curve point via context action | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R045 | Insert curve point on edge | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R046 | Move interpolating curve point | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R047 | Delete interpolating curve point | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R048 | Keep cusp and smooth corner distinct | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 44 — Native sewn-edge splitting and topology migrations

**Evidence separation.** Current native `SplitBoundary` rejects edges carrying seams, allowances, notches or target lengths. This protects existing references, yet prevents drafting adjustments after construction. The JS editor has more developed interval remapping for splits, so the native engine needs an atomic migration design.

**Documentary and implementation support.** `research/oss/clothcraft/src/authoring.rs:866-896`, `src/components/ClothCraftBoardV2.jsx:920-937`; React `App.jsx:421-652`. [Segment Sewing](https://support.clo3d.com/hc/en-us/articles/115012381248-Segment-Sewing).

**Verification design.** Fixture: two sewn pattern edges with multiple notches and allowance widths. Split exactly 50% arc length; require all derived intervals and attachments point at correct child-edge ranges, with one reversible transaction. Document unsupported cases instead of dropping relations.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R049 | Preserve neckline silhouette on edit | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R050 | Preserve armhole silhouette on edit | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R051 | Recompute curved segment arclength | V | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R052 | Avoid silently mixing curve-point and handle representations | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R053 | Retain near-tangent continuity through a smooth join | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R054 | Hit-test arc rather than endpoint chord | D | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) |
| R055 | Show selected segment length | V | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R056 | Change Length through context command | V | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 45 — Deletion and stale edge-index references

**Evidence separation.** React anchor deletion updates certain notches, sewing indices and allowances but does not systematically update all topstitch, zipper and binding owners. A deletion before edge index three can leave attachments on the wrong geometric edge with no visible warning. Native deletion is conservative and rejects any adjacent curve handles or construction metadata.

**Documentary and implementation support.** `App.jsx:2481-2550`, `App.jsx:500-511`; native `research/oss/clothcraft/src/authoring.rs:958-1005`.

**Verification design.** Define an attachment-owner registry and identify affected references before mutation. Validate the same real geometry edge is targeted after deletion; for merged curved edges either fit a cubic to tolerance or preview flattening with explicit confirmation. Record rollback invariants.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R057 | Keep anchored endpoint explicit | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R058 | Accept exact movement values | V | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R059 | Provide scale reference value | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R060 | Show pivot position for rotation | U | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R061 | Transform selected segment independently | V | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R062 | Move a selected point precisely | V | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R063 | Do not alter unselected adjacent pieces | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R064 | Recalculate segment length after vertex move | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 46 — Invalid boundaries and false sewing bridges

**Evidence separation.** The current `cutlinePoints` filter in `src/core/freeSewingGeometry.js` silently joins surviving points across missing interior entries; `[0,0],[1,0],null,[5,0]` produces a fictional line from x=1 to x=5. This was reproduced in the source audit with a minimal Node command.

**Documentary and implementation support.** `src/core/freeSewingGeometry.js:8-9,23-89`; `src/core/clothcraft2dGeometry.js:26-40`. [Free Sewing](https://support.clo3d.com/hc/en-us/articles/115012226527-Free-Sewing).

**Verification design.** Before sewing, ensure host edge is complete and contiguous or restrict projection to separately labeled runs. Test null vertex at beginning/middle/end, missing mesh sample, zero-length edge and reversed interval. No gap may be surfaced as a continuous sewable segment.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R065 | Recalculate length after handle edit | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R066 | Detect zero-length edge | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R067 | Detect outline self-intersection | D | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R068 | Undo geometric change | V | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) |
| R069 | Create open internal polyline | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R070 | Double-click to finish internal line | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R071 | Create closed internal polygon | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R072 | Create internal rectangle | U | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 47 — POM persistence versus ephemeral tape

**Evidence separation.** Native EXO shows two-point ephemeral tape and panel bounding dimensions; current code has physical edge/perimeter metrics but not the complete saved, editable CLO POM graph. JS project measurement stations include clothing-specific edge and ID assumptions. These are useful display helpers until bound construction records are authored.

**Documentary and implementation support.** `ClothCraftBoardV2.jsx:298-319,1499-1508`, `clothcraftSelectionMetrics.js:49-103`, `src/core/measurements.js:43-86`; [Create POM](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM).

**Verification design.** Create named POM with several anchors bound to real curves/internal shapes, store units and grade-size scope, then move a boundary and verify actual physical recomputation. Reopen a saved document and inspect object identity, not only an SVG label.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R073 | Create internal ellipse | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R074 | Add points to internal line | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R075 | Edit internal line control point | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R076 | Curve internal segment | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R077 | Snap internal endpoint to boundary | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R078 | Show center/fold line marking | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R079 | Create pattern instruction line | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R080 | Create Place on Fold marking | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 48 — Grading and measurement correspondence

**Evidence separation.** CLO supports grading-dependent measures and notch placement rules. For EXO, a size expansion changes boundary geometry and can change points-of-measure, seam lengths and notch positions simultaneously. A fixed relative width guide must not be presented as a complete spec table for all grades.

**Documentary and implementation support.** [Set Grading](https://support.clo3d.com/hc/en-us/articles/115015798567-Set-Grading); [Create POM](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM).

**Verification design.** Create S/M/L pattern grades and record chest, waist, shoulder, armhole and sleeve measure as named POMs. Report source grade, tolerance policy and adjusted notch positions after update; do not infer size from 2D pixel width.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R081 | Add pattern annotation | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R082 | Create clone as reference line | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R083 | Independently hide internal marks | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R084 | Maintain line's parent pattern | D | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R085 | Mirror a construction line | V | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R086 | Keep baseline and internal line types distinct | D | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) |
| R087 | Add notch to outline | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R088 | Position notch by click | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 49 — Seam relationship directed interval model

**Evidence separation.** Structural sewing pairs connect directed portions of physical edges or internal lines. Orientation glyphs, user-created cutting notches and decorative red marks have different ownership. Drawing a colored stroke between arbitrary points is insufficient to persist and re-evaluate seams after topology changes.

**Documentary and implementation support.** [Segment Sewing](https://support.clo3d.com/hc/en-us/articles/115012381248-Segment-Sewing), [Free Sewing](https://support.clo3d.com/hc/en-us/articles/115012226527-Free-Sewing), [Edit Sewing](https://support.clo3d.com/hc/en-us/articles/115012380148-Edit-Sewing).

**Verification design.** Store two directed intervals with edge IDs and arc-length ranges; display orientation and measured pair deltas. Reverse without changing lengths, then alter the curve and expect recomputed mismatch. Delete sewing as a complete relation.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R089 | Position notch by exact length split | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R090 | Add notch at existing point | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R091 | Add point to notch | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R092 | Select notch without selecting whole piece | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R093 | Drag notch along host edge | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R094 | Edit notch length | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R095 | Edit notch angle | U | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R096 | Flip notch | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 50 — Notch path anchoring and seam allowance interaction

**Evidence separation.** A notch is path-owned manufacturing registration geometry. It must follow the host curve tangent/normal as curvature changes. Seam allowances are offset shapes and can display corresponding notch positions, yet their visual proximity must not reparent the notch to the allowance polygon.

**Documentary and implementation support.** [Notch](https://support.clo3d.com/hc/en-us/articles/115015735467-Notch), [Create Notch](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch), [2D Seam Allowance](https://support.clo3d.com/hc/en-us/articles/115015714428-2D-Seam-Allowance).

**Verification design.** Set two notches on a bowed side seam with different distances and widths; apply mixed allowances, change curvature and validate stable notch arc stations and normal orientations. Show selected notch and allowance as separately named properties.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R097 | Edit notch type | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R098 | Retain notch attachment during geometry edit | D | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R099 | Create seam allowance on edge | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R100 | Set allowance width | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R101 | Set allowance start extent | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R102 | Set allowance end extent | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R103 | Handle join/intersection options | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R104 | Regenerate automatic allowance on edit | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 51 — Internal lines and physical line categories

**Evidence separation.** Visible chest/waist/center lines can be derived guides, native internal construction geometry, reference baselines, decorative topstitch or fold marks. Rendering them all in blue-violet sacrifices edit semantics. The baseline already warns the reference crop is insufficient to identify each stroke.

**Documentary and implementation support.** [Internal Polygon/Line](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line), [Convert to Baseline](https://support.clo3d.com/hc/en-us/articles/115004423028-Convert-to-Baseline).

**Verification design.** Click each stroke in its intended tool mode and inspect actual object kind; conversion from derived guide to persistent InternalLine should atomically create a native ID. Confirm saved version and that optional sewing or topstitch attachment targets authored geometry.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R105 | Toggle allowance visibility independently | V | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R106 | Preserve original seamline separate from allowance | D | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) |
| R107 | Pair edges using Segment Sewing | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R108 | Create Free Sewing intervals | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R109 | Support pairing to internal lines | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R110 | Show sewing direction markers | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R111 | Detect reversed pair orientation | D | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R112 | Offer Reverse Sewing action | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 52 — Display/selection layers and interaction precedence

**Evidence separation.** The 2D viewer needs independent visual toggles for cut contour, seam allowance, notch, sewing, baseline, topstitch, measurement and annotation. Hiding an object changes rendering and hit-testing but must not delete it or cause incompatible edit modes to select its hidden geometry.

**Documentary and implementation support.** [2D Vertical Toggle Icons](https://support.clo3d.com/hc/en-us/articles/360011148874-2D-Vertical-Toggle-Icons), [Select](https://support.clo3d.com/hc/en-us/articles/115012227067-Select).

**Verification design.** Exercise overlapping seam, notch and internal line while toggling layers; selected object inspector must agree with visible target. Switch modes, pan, zoom, Escape and undo; no unrelated native revision should change.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R113 | Show selected sewing pair | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R114 | Deactivate/activate sewing line | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R115 | Delete sewing relation | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R116 | Independently hide sewing lines | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R117 | Check sewing lengths | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R118 | Show length discrepancy | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R119 | Indicate red mismatch when above 1 mm | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R120 | Support multiple segment sewing | U | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 53 — Numerical tolerances, arclength and export fidelity

**Evidence separation.** Production measurements must derive from stored material-space coordinates and accurate integration. Sampled polyline approximations are appropriate for raster hit testing only when their approximation error is bounded. A physical pattern export needs auditable units and a calibration reference.

**Documentary and implementation support.** `src/core/draftingPrecision.js:98-127`, `src/core/draftingTopology.js:54-135`; [DXF Import/Export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export).

**Verification design.** Test 100 mm line, 300-400-500 mm right triangle, cubic curved reference and strongly bowed quadratic; compare viewport-independent values in mm/cm/in, repeat at zoom 0.5–4x. Explicit tolerance values belong to EXO manufacturing requirements.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R121 | Support M:N Free Sewing | U | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R122 | Maintain sewing association after curve modification | D | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R123 | Keep physical notch separate from directional marker | D | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R124 | Create Segment Topstitch | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R125 | Create Free Topstitch | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R126 | Move topstitch endpoint | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R127 | Set topstitch offset | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |
| R128 | Hide topstitch separately | V | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 54 — Persistent data model and save/reopen regression

**Evidence separation.** A visually correct 2D state is not enough when geometry attachments fail to survive document serialization. Selected edge IDs, control handles, segment topology, notches, seam intervals and POM anchors must round-trip. Cross-editor imports need explicit schema version and precision/role metadata.

**Documentary and implementation support.** Foundation Page 31 typed schema; native `research/oss/clothcraft/src/garment/polygon.rs:28-60`; [Edit Pattern](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern).

**Verification design.** Create deterministic fixture and JSON export of semantic entities before and after save/reload; compare identities, coordinate max-error, edge interval ownership and reference counts. Do not mistake recreated view guides for persisted objects.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R129 | Expose physical ruler units | D | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R130 | Create 2D POM | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R131 | Edit existing POM | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R132 | Attach POM to outline | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R133 | Attach POM to internal line | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R134 | Support grouped POM | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R135 | Report summed multi-segment measure | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R136 | Snap POM placement | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 55 — Prioritized engineering backlog and safe rollout

**Evidence separation.** The audit identifies two immediate correctness hazards in pointer-driven editing and two structural architecture gaps. Prioritize attachment remap for native splits and React deletions, broken boundary filtering, then a unified cubic editor contract and persistent POM path. Instrument QA before generalizing beyond T-shirt.

**Documentary and implementation support.** Local geometry audit P0/P1/P2 findings with precise module locations; official [Edit Pattern](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern), [Free Sewing](https://support.clo3d.com/hc/en-us/articles/115012226527-Free-Sewing).

**Verification design.** P0 gate: no corrupted edge references after edits. P1 gate: neckline/armhole precise handles and saved bound measurements. P2 gate: grade-aware authoring and parity testing for hood, jeans and imported pieces. Record one specific automated check for each blocker.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R137 | Use angle guide for measurement | U | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R138 | Open POM browser data | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R139 | Update POM when geometry changes | D | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R140 | Support grade-size dependent POM | U | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R141 | Expose fixed notch grading | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R142 | Expose proportional notch grading | V | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R143 | Retain measurement data after reload | D | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |
| R144 | Keep export true scale | D | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 56 — End-to-end T-shirt reproducibility suite

**Evidence separation.** The canonical garment is CLO 7.0.242 Male_T-shirt.zpac. It needs a fixed camera setup and authoritative pattern geometry before asserting CLO-versus-EXO parity. Use the screenshot for layout and visible styling only; use native-tool observations and actual file metadata for geometry semantics.

**Documentary and implementation support.** Native screenshot `research/clo-2d-analysis/live-clo-inspector-20261018.png`; foundation Page 34; [2D Pattern View Controls](https://support.clo3d.com/hc/en-us/articles/115004270628-2D-Pattern-View-Controls).

**Verification design.** Perform controlled same-fixture import, fit to window, edit neckline control, insert point in sleeve cap, add notch, sew sleeve, measure matching lengths, save/reopen and compare property inspector. Record CLO and EXO app versions and each screen before claiming a pass.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R145 | Create symmetric pattern | V | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R146 | Create symmetric pattern with sewing | V | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R147 | Create linked instance pattern | U | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R148 | Mirror paste geometry | V | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R149 | Maintain explicit linked status | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R150 | Propagate linked modifications | U | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R151 | Support pattern cut operations | V | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R152 | Support pattern merge | V | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).


---

## Page 57 — Evidence ledger, source coverage and next inspection

**Evidence separation.** This update draws from three distinct kinds of evidence: official CLO help for advertised operations, older research and the supplied inspector screenshot for the visual state, and source-level EXO code audit for implementation limitations. Each category answers a different question; none alone proves feature parity.

**Documentary and implementation support.** Official CLO source catalog in foundation Page 37 and R001–R162 matrix; local deep audit source locations; native screenshot provenance.

**Verification design.** A feature row becomes independently verified only after an observed interaction with input state, resulting geometry or data, metric check, and save/reopen result. Keep unresolved version-specific shortcuts, Bézier conversion, sewing thresholds and graded POM details marked U.

**Operational acceptance matrix (all items pending EXO verification):**

| ID | Required behavior | Basis | Official reference |
|---|---|---|---|
| R153 | Retain references on edge split | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R154 | Retain references on point delete | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R155 | Serialize control handles | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R156 | Serialize curve points | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R157 | Serialize notches | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R158 | Serialize sewing pair direction | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R159 | Undo compound edit atomically | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R160 | Redo compound edit atomically | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R161 | Reject invalid geometry without corrupting document | D | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |
| R162 | Test saved garment reload | V | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) |

**State and failure checks.** Before issuing any mutation, record source pattern IDs, the addressed segment or point, real coordinate units, and current revision. After a successful command, compare geometric ownership, all dependent attachments, normalized arc station and preview to persisted result. On an invalid command, require an explicit reason and unchanged authoritative model. A visible mark without an underlying selected record is a visual-only success, not a construction pass.

**Evidence classification.** Official links support the named tool operation (V); the proposed transactional, serialization, error-bound and UX assertions are derived acceptance (D); exact CLO 7.0.242 menu placement, target shortcuts and the runtime behavior of the supplied garment remain unverified here (U).

