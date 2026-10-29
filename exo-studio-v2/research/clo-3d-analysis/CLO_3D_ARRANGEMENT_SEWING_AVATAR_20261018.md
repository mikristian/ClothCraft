# CLO 3D Window — Arrangement, Sewing and Avatar Guide Research

Date: 2026-10-18. Research-only architectural reference for EXO ClothCraft V2. This original analysis is based on publicly available CLO official documentation and linked support material; it is not a direct live CLO interaction or a parity certification.

**Evidence key:** **D** = explicitly documented by CLO official Help Center; **I** = original engineering inference or proposal; **U** = unverified in this release, or community-described behavior requiring live inspection. Acceptance criteria and suggested APIs are requirements for our application, not claims about proprietary CLO source code.

## Executive architecture model

An avatar owns skeleton-relative bounding volumes. Volumes own positioning anchors called arrangement points. A flat 2D pattern remains the authoritative manufacturing geometry; its 3D arrangement holds a projection/warp transform, orientation, offset, winding, and an immutable snapshot of the pre-simulation position. An independent sewing graph links pairs of edge intervals or internal paths with direction correspondence. The simulated cloth state is separately writable and can be reset to the authored arrangement without discarding 2D geometry. Avatar body guides, tape, measurements and debug volumes are separate visual layers and can be turned on independently. These boundaries are implementation proposals grounded in CLO's publicly documented tool contracts.

**Primary official references:** [CLO Pattern: 3D Arrangement index](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement), [CLO Avatar Editor Guide](https://support.clo3d.com/hc/en-us/articles/360052611653-CLO-Avatar-Editor-Guide), [CLO 3D toolbar guide (historical PDF)](https://support.clo3d.com/hc/en-us/article_attachments/48293801440281), [CLO 3D Pencil new in 2026.0](https://support.clo3d.com/hc/en-us/articles/55461410696345-3D-Pencil-Avatar).

## 01. Evidence and scope

**Evidence D.** The official 3D Arrangement manual index separates auto arrangement, point placement, smart placement, reset, redrape and superimpose. These are distinct user commands. [Official source](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement).

**Implementation rule and acceptance:** A command registry with distinct undoable operations; acceptance: invoking each command modifies only its declared state.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 02. Avatar-space convention

**Evidence I.** Bounding volumes track avatar joints; coordinate transforms must therefore be defined in avatar-relative terms. [Official source](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

**Implementation rule and acceptance:** Store worldFromAvatar and worldFromJoint transforms and verify that all anchors follow avatar translation, rotation and resize.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 03. Bounding-volume anatomy

**Evidence D.** The editor supports volumes associated with beginning and ending joint names, shape, height and section dimensions. [Official source](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

**Implementation rule and acceptance:** Provide joint pair selectors and mesh preview; verify torso cylinder follows shoulder and pelvis joints across two poses.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 04. Cylinder and rounded cuboid

**Evidence D.** CLO lists cylinder and cuboid shapes and cuboid round-corner adjustment. [Official source](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).

**Implementation rule and acceptance:** Implement both swept volume types with positive dimensions and round-corner bounds; preserve mirrored handedness.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 05. Bounding-volume visibility

**Evidence D.** Avatar Display provides a separate bounding-volume toggle. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Toggle volume wireframes without modifying avatar, cloth, collisions, selections or persisted positions.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 06. Arrangement-point visibility

**Evidence D.** Avatar Display offers a separate arrangement-point visibility toggle. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Toggling points shows anchors with deterministic hit targets, independent of volume display.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 07. Point depends on volume

**Evidence D.** The official guide states arrangement points are invisible without corresponding bounding volumes. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Reject orphan point creation or show invalid-reference state, and restore display upon relinking the volume.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 08. Point coordinate properties

**Evidence D.** Points have X/Y placement, an avatar offset, selected arrangement bounding volume and wrap direction. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Expose numerical X, Y, offset and wrap controls; updating any control immediately updates preview and commits through undo.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 09. Point offsets and collision

**Evidence I.** CLO separates offset from volume geometry; positive clearance is an implementation design requirement, with exact CLO clearance calculation undocumented. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Define normal-aligned clearance from surface; acceptance: at offset=1cm no initially penetrating points on standard avatar.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 10. Symmetric point naming

**Evidence D.** The guide names _R and _L suffix behavior and identifies symmetric point presentation. [Official source](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).

**Implementation rule and acceptance:** Support mirror linking and broken-link warnings; test one mirrored pair edited from left and right sides.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 11. Symmetric pattern arrangement

**Evidence D.** CLO supports pairing symmetric patterns with symmetric arrangement points. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Place both paired panels together with mirrored orientation and stable IDs, preserving seam mapping.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 12. Pre-placement preview

**Evidence D.** Hovering a point previews the pattern and clicking commits its centered position. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Preview without document mutation; commit after click, Escape cancels; test preview/render consistency.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 13. Curved wrap over volume

**Evidence D.** Patterns placed on arrangement points follow the curves of the associated volume. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Produce curved 3D vertices from planar source while retaining immutable 2D geometry; test circumference and preserved surface area.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 14. Shape Style flat versus curved

**Evidence D.** Arrangement properties include flat or curved Shape Style. [Official source](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

**Implementation rule and acceptance:** Switch flat/curved without changing source vertices, reset snapshot or sewing topology.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 15. Post-place adjustments

**Evidence D.** Point-arranged patterns expose X/Y, Offset, Orientation, Shape Style and Point Name. [Official source](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

**Implementation rule and acceptance:** Properties update placement predictably; position editing preserves selected point identity and inverse transform.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 16. Curvature parameterization

**Evidence I.** The source confirms curvature, not an exact formula. A swept surface chart is an engineering proposal. [Official source](https://support.clo3d.com/hc/en-us/articles/115002101968-Arrangement-Property-Setting).

**Implementation rule and acceptance:** Define arc length parameter s, longitudinal t, surface S(s,t), outer normal N, and placement S+offset*N; require low distortion on cylinder.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 17. Overlong cuff spiral

**Evidence D.** CLO notes narrow/long pieces may spiral when their length exceeds the volume and provides Flip Wrap Direction. [Official source](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).

**Implementation rule and acceptance:** Handle unwrapped angles beyond 2π without clamping and provide flip operation; test long cuff wraps in both directions.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 18. Normals and winding

**Evidence D.** Flip Normal switches fabric wrong/right sides and may invert fold angle sign. [Official source](https://support.clo3d.com/hc/en-us/articles/115000306008-Flip-Normal).

**Implementation rule and acceptance:** Keep orientation, visual face and fold metadata consistent; verify reversed normal preserves seam endpoints.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 19. Gizmo placement

**Evidence D.** CLO supports unified and divided transform gizmos in simulation-off state. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513928-Move-Rotate-Pattern-with-Gizmo).

**Implementation rule and acceptance:** Implement 3-axis movement, 3-axis rotation and planar free drag; ensure transforms act on arranged 3D mesh only.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 20. Direct positioning

**Evidence D.** Hover follows garment/avatar surface and click fixes position; Shift constrains rotation. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513508-Direct-Positioning).

**Implementation rule and acceptance:** Raycast avatar/cloth hit, project selected pattern center and preview position; Shift locks orientation; click commits.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 21. Reset 3D selected

**Evidence D.** CLO returns selected patterns to pre-simulation placement and permits multiple selection. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513128-Reset-3D-Arrangement).

**Implementation rule and acceptance:** Cache arrangement-rest pose per panel; after simulation only selected panels restore to exact cached geometry.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 22. Reset 3D all

**Evidence D.** CLO has separate all-pattern reset in menu and toolbar. [Official source](https://support.clo3d.com/hc/en-us/articles/115000513128-Reset-3D-Arrangement).

**Implementation rule and acceptance:** Restore every panel to its authored arrangement pose in one undoable transaction; subsequent simulate reruns constraints.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 23. Reset 2D arrangement

**Evidence D.** CLO explicitly rearranges 3D panels according to their 2D layout. [Official source](https://support.clo3d.com/hc/en-us/articles/115000512988-Reset-2D-Arrangement).

**Implementation rule and acceptance:** Build flattened 3D staging layout matching board positions; acceptance: all panel centers agree with documented 2D-to-3D scale.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 24. Re-drape after avatar sizing

**Evidence D.** Re-drape considers changed body dimensions; CLO limits supported avatars to CLO or custom avatars with fitting suits. [Official source](https://support.clo3d.com/hc/en-us/articles/360034333873-Re-drape-3D-Arrangement-ver-5-1).

**Implementation rule and acceptance:** Reproject anchors after size change without reusing stale collision poses; if avatar unsupported display capability notice.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 25. Auto arrangement entry

**Evidence D.** CLO 7.1 documents auto arrangement based on pattern shape, with symmetry and sewing information improving placement. [Official source](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

**Implementation rule and acceptance:** Present a proceed/preview/accept flow, with deterministic fallback for unknown garment panels.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 26. Auto arrangement staging

**Evidence D.** CLO uses staged candidate sets classified by color/transparency and Back/Next navigation. [Official source](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

**Implementation rule and acceptance:** Group suggestions by explicit confidence, expose Back/Next, and commit only selected reviewed results.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 27. Auto arrangement failure handling

**Evidence D.** CLO warns very small pieces and same-location analyses may not arrange reliably. [Official source](https://support.clo3d.com/hc/en-us/articles/13200837772185-Auto-3D-Arrangement-ver-7-1).

**Implementation rule and acceptance:** Mark unassigned panels, offer manual point assignment and do not fabricate certainty for weak predictions.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 28. Smart arrangement

**Evidence D.** CLO can position an already sewn new panel on the draped assembly. [Official source](https://support.clo3d.com/hc/en-us/articles/115000525027-Smart-Arrangement).

**Implementation rule and acceptance:** Use sewing adjacency to identify target surface and retain existing draped state; acceptance: collar lands near neck seam.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 29. Superimpose layer positions

**Evidence D.** CLO supports Over, Under and Side for a new sewn pattern relative to associated panels. [Official source](https://support.clo3d.com/hc/en-us/articles/115000512508-Superimpose).

**Implementation rule and acceptance:** Implement offset along panel normal with over/under sign and side adjacency; show selection only when sewing relation exists.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 30. Segment sewing visual state

**Evidence D.** 3D segment sewing highlights sewable edges and shows sewing lines in both workspaces; notch crossing reverses sewing result. [Official source](https://support.clo3d.com/hc/en-us/articles/360001771047--3D-Tool-Segment-Sewing).

**Implementation rule and acceptance:** Render bold candidate edges and directional arrows; test clicked segments and detect reversed correspondence.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 31. Free sewing in 3D

**Evidence D.** Free sewing can connect chosen edge portions and internal lines in 3D. [Official source](https://support.clo3d.com/hc/en-us/articles/360001771527--3D-Tool-1-N-Free-Sewing).

**Implementation rule and acceptance:** Raycast and parameterize normalized edge intervals; preserve seam endpoints as geometry changes and test partial-edge correspondence.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 32. M:N sewing direction and invalidity

**Evidence D.** CLO highlights staged M:N selection neon, unsuitable segments red, and supports Delete/Escape cancellation. [Official source](https://support.clo3d.com/hc/en-us/articles/360001754668--3D-Tool-M-N-Free-Sewing).

**Implementation rule and acceptance:** Use explicit provisional states M, N, invalid and committed; test aborted operations leave no document seam.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 33. Sewing activated versus disabled

**Evidence D.** Deactivated lines render white in 2D and 3D, with no constraint applied during simulation. [Official source](https://support.clo3d.com/hc/en-us/articles/115000528308--Popup-Activate-Deactivate-Sewing-Lines).

**Implementation rule and acceptance:** Persist active:boolean; draw white for disabled and exclude matching solver constraint; toggle must work without deleting pairing.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 34. Sewing visibility

**Evidence D.** CLO supports hide selected/all sewing lines in both 2D and 3D. [Official source](https://support.clo3d.com/hc/en-us/articles/115000528428--Popup-Show-Hide-Sewing).

**Implementation rule and acceptance:** Distinguish visual hidden state from active mechanical constraints; hidden active seam must still constrain cloth.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 35. Sewing colors versus 3D seamline maps

**Evidence D.** Edit Sewing shows directional and state cues, while 3D Seamline property governs render normal-map intensity and thickness. [Official source](https://support.clo3d.com/hc/en-us/articles/115013404848--Property-3D-Seamline).

**Implementation rule and acceptance:** Represent stitch correspondences, overlay visibility and render seam effects as independent entities.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 36. Avatar visibility categories

**Evidence D.** CLO distinguishes Show Avatar, Arrangement Points, Bounding Volumes, Measurements, Tape and 3D Lines. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Provide independent toggles with saved viewport preferences; changing any display flag must not change mesh data.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 37. Avatar surface guide geometry

**Evidence D.** CLO supports lines and shapes drawn on the avatar and separate visibility for those drawings. [Official source](https://support.clo3d.com/hc/en-us/articles/115008890587-Show-3D-Pen-Avatar).

**Implementation rule and acceptance:** Project editable polyline control points to avatar mesh; preserve binding through avatar movement.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 38. Avatar 3D pencil 2026

**Evidence D.** CLO 2026.0 describes front/back constrained drawing with symmetry and conversion to 3D pen. [Official source](https://support.clo3d.com/hc/en-us/articles/55461410696345-3D-Pencil-Avatar).

**Implementation rule and acceptance:** Allow constrained projection drafting and mirrored guide sketches; acceptance: resize keeps strokes on avatar.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 39. Avatar guide planes

**Evidence U.** A CLO community explanation describes temporary axis-aligned guide planes with Shift when marking tape; this is user discussion, not complete versioned specification. [Official source](https://support.clo3d.com/hc/en-us/community/posts/360037847513-I-can-t-draw-the-shoulder-tline-for-Avatar-Tape-Line).

**Implementation rule and acceptance:** Prototype optional transverse/sagittal/coronal intersections with adjustable height and orientation, then verify in target CLO release.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 40. Body landmark overlays

**Evidence I.** The official product documents measurements and tapes, not a standard chest-center/bellybutton overlay naming contract. [Official source](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Implementation rule and acceptance:** Define optional authorable landmarks: center-front, center-back, bust/chest, underbust, waist, navel, hip, shoulder and armhole; do not claim CLO built-in exact labels.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 41. Attach seam to tape

**Evidence D.** CLO highlights selected garment edge/internal line and avatar tape red; simulation attaches the seam to the avatar tape. [Official source](https://support.clo3d.com/hc/en-us/articles/115012225987-Attach-to-Avatar-Tape).

**Implementation rule and acceptance:** Store tape and garment edge reference, render red preview and produce a solver attachment constraint only when supported.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 42. Avatar editor file persistence

**Evidence D.** CLO lists .arr for points, .pan for volumes and .avt for a richer avatar including arrangement information. [Official source](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats).

**Implementation rule and acceptance:** Persist native JSON equivalents including joint refs, point IDs, wrap metadata and stable version; import/export CLO formats separately after validation.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## 43. Validation ladder and QA

**Evidence I.** Official docs describe user workflows but not numerical parity tolerances; acceptance thresholds here are project-defined. [Official source](https://support.clo3d.com/hc/en-us/sections/115000641628-Pattern-3D-Arrangement).

**Implementation rule and acceptance:** Run geometry unit tests, visual snapshots, avatar resize tests, sewing roundtrip, pose changes and end-to-end simulation comparisons with saved input fixtures.

**Engineering failure cases to inspect:** stale transformed geometry after avatar changes; pattern identity mismatches after edit/undo; viewport decorations interfering with ray-pick; visually concealed seams incorrectly losing simulation constraints. Record applicability per feature rather than assuming every risk applies.

## Recommended data contracts (original proposal)

```ts
type ArrangementVolume = {id:string; avatarId:string; jointStartId:string; jointEndId:string; kind:'cylinder'|'rounded-cuboid'; dimensionsCm:[number,number,number]; cornerRadiusCm?:number; enabled:boolean};
type ArrangementAnchor = {id:string; volumeId:string; name:string; xCm:number; yCm:number; offsetCm:number; wrapDirection:1|-1; mirrorAnchorId?:string};
type PanelArrangement = {panelId:string; anchorId?:string; shapeStyle:'flat'|'curved'; offsetCm:number; positionCm:[number,number]; orientationDegrees:number; face:'right'|'wrong'; restPositions3D:number[]; geometryRevision:string};
type SewingEdgeRef = {panelId:string; boundaryPathId:string; startFraction:number; endFraction:number; direction:1|-1};
type SewingConstraint = {id:string; first:SewingEdgeRef; second:SewingEdgeRef; active:boolean; visible:boolean; displayColor:string; renderSeamIntensity:number; renderSeamThickness:number};
type AvatarGuide = {id:string; avatarId:string; type:'centerline'|'chest'|'waist'|'navel'|'hip'|'tape'|'measure'|'custom'; pointsAvatarLocal:[number,number,number][]; visible:boolean; snapEnabled:boolean};
```

All float quantities above should be unit-tagged at the API boundary. Array ordering, coordinate handedness, polygon winding and collision-clearance semantics require a single shared specification. The shapeStyle terminology tracks an official CLO property; the data representations above are original.

## Reference geometry for curved pre-simulation placement (original proposal)

1. Resolve the avatar's current pose transform and the chosen bounding volume's swept axis. Fail explicitly if joints or surface parameters are invalid.
2. Build a differentiable chart `S(u,v)` with `u` horizontal arc length and `v` vertical position on the volume. Use an unwrapped arc coordinate so cuffs longer than circumference may turn more than one revolution.
3. Center a pattern's 2D manufacturing coordinates at its desired anchor, apply orientation in the local tangent plane, then evaluate `S(u,v) + d*N(u,v)`, with `d` the user-visible offset and `N` outward surface normal.
4. For flat shape style, choose a tangent plane at the anchor and map every point by the tangent basis, preserving all original planar coordinates. For curved shape style, apply the swept surface mapping and test orientation/winding.
5. Save resulting vertices as `restPositions3D`, then generate any simulation meshes as disposable derived geometry. Never bake projected vertices into the original 2D cutline or change manufacturing measurements.
6. A solver may subsequently deform from this rest arrangement; Reset 3D Arrangement restores the saved rest positions. Reset 2D Arrangement instead reconstructs staging positions from 2D board coordinates. These are different commands.
7. Propose geometric checks: all vertices finite, triangle winding consistent, target clearance positive within tolerance, 2D boundary lengths recoverable from original source, and no point-anchor drift under viewport orbit/zoom.

This numerical model is an **engineering approximation**, not a reverse-engineered or officially specified CLO wrap formula. CLO documents the presence of curved arrangement, its controls, and flip direction, not the detailed interpolation method.

## Sewing color and geometry semantics

| Independent state | Documented appearance or behavior | Proposed application behavior |
|---|---|---|
| Previewing sewable edges | Eligible edges bold in 3D sewing tools | Bold edge overlay restricted to eligible paths |
| M:N provisional selection | Neon highlighted; invalid red | Provisional colors remain until confirm/cancel |
| Direction notch | Correspondence direction affects twist/reversal | Show arrows on each joined interval |
| Sewing deactivated | White in 2D and 3D, ceases to sew | Disable physical constraint while retaining relationship |
| Sewing hidden | Hidden as a display choice | No change to constraint enabled state |
| 3D seamline appearance | Render normal-map thickness/intensity | Independent visual seam-material pass |
| Avatar-tape attach | Red highlight then attachment during simulation | Distinct garment-to-avatar constraint |

Sources: [segment sewing](https://support.clo3d.com/hc/en-us/articles/360001771047--3D-Tool-Segment-Sewing), [M:N free sewing](https://support.clo3d.com/hc/en-us/articles/360001754668--3D-Tool-M-N-Free-Sewing), [deactivate](https://support.clo3d.com/hc/en-us/articles/115000528308--Popup-Activate-Deactivate-Sewing-Lines), [hide](https://support.clo3d.com/hc/en-us/articles/115000528428--Popup-Show-Hide-Sewing), [seamline property](https://support.clo3d.com/hc/en-us/articles/115013404848--Property-3D-Seamline), [attach to tape](https://support.clo3d.com/hc/en-us/articles/115012225987-Attach-to-Avatar-Tape).

## Avatar landmark and construction guide taxonomy

**Documented CLO layers:** avatar visibility, arrangement points, volume display, avatar measurements, avatar tapes, 3D drawn lines. [Avatar display reference](https://support.clo3d.com/hc/en-us/articles/115012381328-Show-Hide-Avatar).

**Proposed EXO overlay set:** sagittal center-front and center-back lines, horizontal center-chest across bust/chest circumference, under-chest line, waistline, navel-height line, high hip and full hip, shoulder baseline, neck-height plane, armscye reference ring, elbow and wrist level, thigh/knee/ankle circumference guides. These are proposed ergonomic guides; precise CLO default names, placements, auto-calculation and snapping behavior remain unverified. Every point should be stored in avatar-local position or surface barycentric binding, recalculated under pose/resize, visible independently of arrangements, and nonphysical unless the user deliberately attaches a pattern line to an avatar tape.

## High-value acceptance scenarios

| Scenario | Required visible result | Invariant |
|---|---|---|
| Place symmetric front panels | Preview two mirrors, click both placed | Stable symmetric anchor IDs |
| Place body panel on torso | Curved panel floats around chest before simulation | 2D cutline unchanged |
| Change shape style | Flat and curved 3D states visibly differ | No source pattern mutation |
| Adjust positive offset | Panel moves outward from avatar | Finite coordinates and outward normal |
| Flip cuff wrap | Spiral direction changes | No edge remapping or seam loss |
| Adjust avatar girth | Volumes, anchors and preview reposition | No obsolete world-pose binding |
| Reset selected after sim | One panel returns to its arranged rest geometry | Other panels unchanged |
| Reset all after sim | All panels return to arranged rest geometry | Sewing pairing retained |
| Reset 2D | 3D panels appear in board-like staging | No replacement of arrangement snapshots until commit |
| Create an M:N seam | Direction notch and pair highlighted | Constraint endpoints valid |
| Hide active seam | Connection graphics disappear | Solver pairing remains active |
| Deactivate seam | Connection is white and does not constrain cloth | Pairing editable and recoverable |
| Toggle guides | Center chest/navel guides appear/disappear | Picking cloth remains correct |
| Attach edge to tape | Both highlight and connect during simulation | Garment-to-avatar binding is explicit |

## Research caveats and follow-up evidence

These notes intentionally avoid asserting any CLO private implementation algorithm. The official support documentation may combine features from differing versions; individual citations should be retested against the exact installed release before pixel-level UI parity decisions. The PDF toolbar guide is historically dated and serves as a tool-inventory reference, not as proof of the current icon placement. The supplied research task did not authorize changing application source and no direct software interactions were performed during this pass. Follow-on engineering should document an actual live inspection with app version, screenshot, command sequence, expected result and observed result for each feature. No claim is made that EXO already implements or passes these requirements.

