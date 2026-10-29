# EXO ClothCraft V2 — PHOTO STUDIO implementation blueprint

**Research and engineering specification · 17 October 2026 · Proposed architecture, not a claim of shipped functionality**

## 1. Product objective and operating contract

PHOTO STUDIO is a single planning surface where a fashion designer can pin a precise garment revision, arrange that garment on an avatar in a measurable 3D set, choose a photographic camera and lighting arrangement, produce a storyboard, commission high-quality synthetic reference frames, and carry the plan to a real physical shoot. Its central output is not merely a pleasing picture. It is an executable creative brief: an approved shot list, compatible equipment package, practical floor plan, production schedule, named responsibilities, and reference visuals whose provenance can be traced to the exact garment specification used to create them.

Three distinct output classes must remain visible. A **virtual proof** is a deterministic 3D rendering of an identifiable digital garment at a recorded revision. A **previsualization** is a planning aid indicating expected composition, blocking, geometry and approximate light direction; it may differ from an actual photograph. A **real-shoot record** is evidence that people, equipment, garments and locations were actually present, linked to captured photographs and on-set notes. A fourth optional class, **creative concept**, can include generative imagery or artistic references, but is never automatically evidence that the product's cut, sewing details or physical color will look identical.

Target users include a small clothing label planning e-commerce photography, a creative director building an editorial campaign, a photographer translating visual references into a lighting plan, a producer organizing a crew, and a manufacturing lead verifying that campaign assets represent the approved sample. PHOTO STUDIO should accept feedback from all these roles without granting everyone permission to alter garment CAD.

Success means the user can open an approved style, select a preset such as “Seamless e-commerce on white,” construct six deliberate frames, export a contact sheet and call sheet, send a dimensioned lighting diagram to the crew, and capture actuals on set. The project can subsequently answer: *Which exact garment was shown in shot 04? Which lens and lighting arrangement was intended? Who approved the revision? What changed on set? Which file is the final photographer capture?*

## 2. Existing EXO evidence and integration boundaries

The examined October 17 repository exposes `src/data/stagePresets.js` with twenty IDs (five runway R01–R05 and fifteen studio S01–S15). These are source records describing EXO-authored interpretations of publicly indexed CLO CONNECT scenes. The original listing thumbnails and model assets were not verified in the source comments. The currently visible `src/components/StageCatalog.jsx` instead features five selectable scenes: the MIKRISTIAN Cathedral House plus R02, R03, S01 and S10. The catalog explicitly says the scenes are still work in progress and are not photoreal. Preserve all twenty stored stage records as source inventory and distinguish them from the current five curated options; archived or experimental scenes should remain accessible through an explicitly labeled library management view once approved.

`src/core/createStageEnvironment.js` loads EXO stage GLBs through Three.js `GLTFLoader`, positions the cathedral room relative to the avatar, handles empty and failed loads, and attaches loaded geometry to a Three.js scene group. `src/App.jsx` has StageCatalog hookups for selecting a rendering stage. These provide plausible integration points for preview, yet do **not** establish a working professional photo planner, an automated studio layout system, or a shipped Cycles render farm. Some other EXO features already mention saved Blender output from a garment fit job, which is a separate workflow. PHOTO STUDIO must be built and tested as its own pipeline.

The companion apparel production research in `docs/research/apparel-production-deep-dive-2026/03-strategy-and-sources.md` specifically calls for construction-preserving imagery, immutable design manifests, dimensionally validated Blender export, source-linked assets, and independent roundtrip checks. Those requirements constrain this product. New photo planning services should consume approved CAD/simulation snapshots via documented interfaces and never directly mutate a production pattern or released manufacturing packet.

## 3. User journeys and product surfaces

The primary navigation path is **Style → PHOTO STUDIO → Campaign → Scene → Shot → Production → Review**. The PHOTO STUDIO landing screen is an image-forward campaign board. Its upper edge shows campaign identity, locked style revision, selected colorway/size, render status and next shoot date. Below, a strip of large shot thumbnails shows each camera setup; selecting a thumbnail loads the editable scene while preserving that shot's camera and lighting parameters. Unsaved edits are displayed as a draft and must never invisibly overwrite an approved board.

The **3D Studio** screen dedicates its main area to a perspective camera preview, with optional top, side and front orthographic panes. Left panels house stage, backdrop, props, avatar/pose and shot preset catalogs. Right panels expose physical camera controls, lens fields, grip/lighting objects, garment identity and output settings. A bottom timeline selects shots and approved variations. A visible switch cycles among camera view, stage floor plan, light plot, storyboard layout and technical garment inspection. Material settings imported from CAD are read-only while pinned to a production revision; editorial overrides live in a separate layer and must be called out.

The **Shot Planner** is a table/calendar hybrid with reorderable shot cards, thumbnails, look/size/colorway, approximate setup and capture durations, lenses, setup ID, styling notes, references, deliverable ratios and dependencies. A shot is not ready for scheduling until required talent, garment unit, stage, light rig and permission fields are resolved. It can still exist in a draft state with incomplete entries clearly flagged.

The **Set Builder** offers actual studio dimensions, doorways, columns, electrical circuits, ceiling height, light stands, modifiers, camera and photographer footprints, subject marks and safety clearances. Toggle a real-world measurement grid. The **Production Desk** presents crew assignments, equipment bookings, location access, releases, catering, call times, break rules, shot progress, contact channels and files to distribute. The **Review Board** groups synthetic drafts, Cycles finals and real camera captures side by side with a difference register and approval history.

Use a dark, clean visual system consistent with the user's EXO studio direction. Keep large photos above dense metadata, allow a compact technical mode, provide keyboard operation, accessible labels and numerical input for all transform fields, and make rendering status visible without obstructing editing. On hover, stage and gear cards should show actual 3D previews plus measurable metadata where known. Never use a static decorative image to imply that a specific 3D model has loaded successfully.

## 4. Preset system: reproducible creative starting points

Presets are versioned parameter packages, not hardcoded screenshots. A preset references a stage archetype, framing template, camera profile, light-rig profile, posing defaults, shot sequence and deliverable targets. The initial catalog can contain: (1) white seamless e-commerce front/three-quarter/back/detail; (2) neutral concrete editorial hard side light; (3) suspended softbox beauty; (4) black-on-black rim-lit silhouette; (5) streetwear lookbook with architecture and moving poses; (6) monochrome flat lay and macro trims; (7) runway walkthrough; (8) outdoor location golden hour; (9) campaign concept with CRT/column props; (10) factory product inspection with high-detail seam and hardware close-ups.

Each preset should declare **expected resources**, including space required, ceiling height, blackout needs, backdrop width, number of light fixtures, grip supports, compatible camera sensors, human operators and nominal setup time. For example, the white seamless preset might produce front, quarter-left, profile, back, logo macro and seam close-up shots. Provide framing templates with ratios 1:1, 4:5, 9:16, 16:9 and 3:2 but preserve the original sensor gate when doing lens mathematics.

A “duplicate preset” command creates an editable campaign-specific instance and records its parent preset version. Updating a shared preset must not retrospectively alter approved shot boards. Preset substitutions should produce a comparison: lost props, revised costs, camera/framing incompatibilities and changed time estimates. Presets are suggestions until a producer validates the actual venue and equipment.

The user can apply one preset to an entire campaign, mix individual shot templates, or select a physical set and ask EXO to propose a coverage sequence. Generated coverage should be deterministic enough to regenerate, yet users may manually reorder, rename or omit shots. Intelligent proposals must identify missing product evidence: a front hero frame alone does not cover the back print, cuff texture, closure detail or fit profile.

## 5. Immutable garment identity and simulated product truth

A Photo Garment Lock is a read-only reference to `styleId`, `garmentRevisionId`, `colorwayId`, `sizeId`, canonical CAD model hash, pattern/stitch/seam manifest hash, material assignment hash, accessory manifest hash and a dated simulation snapshot hash. The snapshot must include 3D vertex geometry, UV/material bindings, intended pattern-piece identity, target avatar dimensions, reference scale and any approved visual smoothing. A signed content manifest should record who locked it, when, the producing application/build, and any unresolved warnings.

Adopt content-addressed immutable assets rather than storing “latest.glb” as the sole source. Maintain editable CAD origin and frozen render mesh separately. Simulated drape is a result of mesh, physics parameters, avatar collision, gravity, pose and solver version; a pose update can require a newly generated simulation snapshot even when the underlying garment design revision remains constant. Track this distinction explicitly. An approved pattern does not guarantee the fit simulation matches a manufactured sample without measured fabrics and fit validation.

When a producer selects a different fabric color, material colorway or garment revision, the app creates a new garment lock or shot variant and flags dependent finals as stale. Modifying only the camera, stage or lights should retain the lock. An “art direction correction” to fabric roughness or logos must be an overlay recorded independently; technical product proof forbids replacing approved seam lines, buttons or proportions using uncontrolled AI edits.

Every frame displays a subtle revision link in its inspector and outputs a machine-readable sidecar containing the source garment hashes. Provide a visual verification function that projects named seam paths, logo polygons and fastener positions into the render-camera image, checking visibility and expected coordinates. This complements human approval and catches dropped mesh parts or unauthorized material substitutions. Preserve source photographs and license/consent records where real people or third-party assets contribute.

## 6. Avatar, posing and wardrobe setup

Separate casting **avatar identity** from **pose**. Avatar records carry height, measured body landmarks, skeleton standard, rig revision, proportions, skin/head presentation permissions and source type (generic mannequin, licensed performer scan, calibrated body form). Pose records contain rig joint transforms, root placement, gaze target, hand articulation and floor contact constraints. Store pose libraries covering upright e-commerce, three-quarter turn, walking cycle at selectable frames, seated editorial, bent elbows, hands-in-pocket, jacket-open and torso-only detail.

For complex garments, posing must trigger a simulation check for penetration, extreme strain, dropped accessories and hem distortion. The operator sees whether a pose is “approved garment drape,” “quick deformation preview” or “unverified pose.” The renderer must not claim that skinning alone supplies physically accurate garment drape. Maintain separate approvals for visual pose and fit proof.

Wardrobe includes physical garment unit ID, sample size, colorway, alteration record, styling layers, required steaming/prep, handling requirements and on-set continuity photos. Physical unit ID may link to a production sample record without implying that the virtual and physical garment are identical. The shot planner should alert if one unit or stylist is scheduled for incompatible simultaneous scenes.

For more than one model, include personal space, eyelines, cast staging and assignment of garment locks per avatar. Pose libraries need clear rights for reference photography and mocap. A storyboard can use licensed abstract placeholders until final casting is confirmed.

## 7. Physically meaningful cameras, framing and continuity

Define cameras by world transform, sensor width/height, focal length in millimeters, focus distance, aperture f-number, shutter duration, ISO as exposure planning metadata, shift/tilt if supported, shutter direction/rolling-shutter note, aspect gate, crop mode and lens-distortion profile. Use declared coordinate units and explicit lens vertical/horizontal FOV conversion. The simulated image perspective depends on sensor gate, lens and subject distance; “85mm portrait” alone is insufficient if sensor format changes.

The camera panel allows exact numeric controls and direct manipulation through orbit/dolly/track/pan/tilt with separate lock modes. Preserve a physical eye height from the floor. A camera move can be blocked by studio walls, truss/stand objects or avatar collision; mark the blockade rather than silently moving geometry. Include composition helpers: thirds, centered crop, horizon/level line, safe logo region, focus plane, height/distance ruler and projected field of view on floor.

Shot coverage uses precise identifiers such as CAM-A-01 rather than filenames. Duplicate a shot to compare 35mm and 85mm without changing its look or light rig. A lens equivalence note should state the camera sensor used. Motion shots need keyframes for rig/camera movement, duration, frame rate, shutter angle and speed ramp notes, with real-world stabilization equipment attached to the camera movement plan.

Camera matching from an on-set plate is explicitly approximate unless calibrated with known geometry, lens metadata, distortion chart and accurately surveyed points. EXIF focal length cannot recover every camera position and lighting attribute. Capture a calibration card and checkerboard when match accuracy is important.

## 8. Light rigs and engineering-grade lighting plots

Design a light rig as a collection of individual emitters and physical fixtures. Each emitter has canonical position, orientation, shape/size, emitted color, intensity, angular spread, IES asset if available, shadow controls and parent rig. A physical fixture adds manufacturer/model, power draw, power supply, circuit, stand/truss support, modifier, required clearances, safety cable, sandbag, rental source and operator. Represent a softbox as a physically sized emitting surface for Cycles even if a realtime preview approximates it.

Initial rig presets: broad clamshell, one-key fashion portrait, dramatic split, three-point product, dual-strip rim, top-down flat lay, storefront window illusion, high-key seamless and low-key black backdrop. Expose “Lighting Diagram” as a top-down metric plan containing subject/camera axes, key/fill/rim labels, modifiers, fixture heights, angles, distances, stand positions and cable paths. Provide an elevation view for ceiling clearance and vertical boom reach.

Record intent separately from measured reality. Studio simulations cannot guarantee exact output for a particular softbox because diffusion, spill, barn doors, flagging, wall bounce, power calibration and fixture spectral distributions affect a real shoot. A color temperature value alone does not model real spectral response or fabric metamerism. Standardize on measured reference targets, gray card and calibrated monitor protocols; store discrepancies as test evidence.

Circuit planning must total manufacturer-rated wattage against verified local electrical capacity with qualified venue review, not automatically certify safety. Show blocked egress, stand overlaps and camera travel collisions as warnings. The exported light plot has a version and map scale; print a dimension bar so crew can reconstruct positions rather than rely on approximate thumbnail spacing.

## 9. Stages, sets, props and location geometry

The stage library contains curated public UI choices and a larger internal asset inventory. Introduce asset status `draft | measured | visual_reviewed | approved | archived` and separate geometry quality from asset ownership. The current five visible EXO stages are useful concept starting points, but their present work-in-progress quality must remain labeled until visual QA proves otherwise. The remaining twenty preset records are not proof of twenty photorealistic ready-to-shoot stages.

Every stage record should declare geometric bounding box, floor normal, world origin, scale, light bakes, texture dependencies, density/mesh counts, license provenance, thumbnails, compatible renderer versions and a confidence flag for measured physical correspondence. Imported architectural environments such as the MIKRISTIAN cathedral house can serve as virtual sets; they cannot automatically stand in for a rentable location until practical access and dimension surveys exist.

For real studios, build a measured scene using dimensions, walls, doors, windows, ceiling, columns, immovable fixtures, loading paths, outlets, blackout conditions, allowed rigging points and photographed reference marks. Source options are manual room builder, surveyed plan import, photogrammetry or point-cloud import where available. Separate survey-proven geometry from inferred geometry with color-coded validation and record coordinate uncertainty.

Props have mesh, units, owner, rental status, physical dimensions, collision volume, material/texture and placement. Give each prop a canonical anchor and practical handling/transport note; studio chairs, concrete blocks, display columns, CRTs and fabric rolls are exemplary. For a campaign concept with a column and CRT, the virtual preview must include the actual dimensions and intended cable routing if this is to become a real set.

Provide compatibility scoring for lighting access, real dimensions, floor loading, photographer movement and stage height. Do not confuse the user's creative desire for “hyper realistic” with proof that an arbitrary low-poly GLB is sufficient. Promotion to approved requires inspected material response, realistic scale, relevant camera views, missing texture checks and Cycles output review.

## 10. Scene representation and Three.js → Blender Cycles architecture

Keep PHOTO STUDIO's canonical scene specification engine-neutral in a versioned JSON manifest with content-addressed assets. Three.js provides interactive composition, approximate light placement, animation blocking and low-cost thumbnails. Blender Cycles reconstructs the scene for offline fidelity using a pinned Blender version, renderer settings and tested material adapters. A GLB can deliver geometry and standard PBR materials, but many application-specific procedural shaders, lights, IES profiles, volumes, cloth caches, color management transforms and camera parameters require separate conversion code.

Define a `sceneCompiler` that reads the manifest, validates all referenced hashes, resolves orientation and units, and emits both a Three scene definition and a Blender Python build plan. Recommended canonical dimensions use meters and a right-handed, Y-up viewport convention; Blender uses Z-up, so an explicit basis transform with roundtrip assertions is mandatory. Never apply unrecorded auto-centering or auto-scaling inside the offline renderer. Preserve exact model and lens transforms and assert expected silhouettes.

Renderer profiles include `preview-webgl`, `proof-cycles-draft`, `proof-cycles-final` and `editorial-cycles-final`. Each specifies resolution, samples, adaptive sampling, denoising version, bounces, color management, view transform, exposure, seed, world/environment mapping, motion blur and AOV/pass outputs. Prefer multilayer OpenEXR for masters with consistent color pipeline; generate sRGB JPEG/PNG review derivatives, preserving original bit depth and the transform used. Cycles can produce diffuse/specular, depth, normal, shadow and Cryptomatte information useful for compositing, depending on the selected version.

Submit jobs with immutable manifests; workers verify their inputs, build a clean Blender scene, render into a temporary directory, validate expected dimensions/frame count, then atomically publish assets and metadata. Use worker limits for CPU/GPU memory, concurrency, deadline, retry budget and cancellation. A job never reads current mutable UI state after submission. On crash, publish diagnostic logs and keep the previous successful render. Output names include campaign, shot, variant, manifest hash and render iteration; no ambiguous `final-final.png` overwrites.

Explicit equivalence limits: realtime Three.js shadows, tone mapping, environment lighting, lens bokeh, texture filtering and transparency may differ from Cycles; avatar cloth simulated in a different solver may not reproduce identical folds; denoisers can hide fine knit texture; nonstandard shaders and displaced seam details require translation or bake; sensor response and actual physical fixtures cannot be fully modeled from an illustrative render. Display “preview matched geometrically” and “offline appearance reviewed” as separate review states. Calibrate with reference spheres, color chart and a golden test stage before promising visual parity.

## 11. Render queue, auditing and provenance

The queue should expose `queued → validating → compiling → ready → rendering → compositing → verifying → published`, with recoverable `failed`, `cancelled` and `stale` states. Progress must be derived from worker events: completion count per frame/tile and observed render statistics, never invented percentages. Job records store the exact scene manifest SHA-256, mesh and textures digests, cloth cache hash, Blender build, add-on versions, GPU/CPU model, graphics driver, renderer profile version, seed, color-management config, sample count, timestamps, error logs, pass list and final output digests.

Idempotency key = hash of scene manifest + renderer profile + requested frames + deterministic build fingerprint. Replaying an identical job should return the existing valid result or deliberately create a new iteration with a traceable cause. Never discard a failed job's manifest. Operators may prioritize a small e-commerce proof ahead of a full editorial animation, but must preserve queue ordering rationale and resource fairness. Expensive batch submissions should show estimated compute cost based on locally measured benchmarking, with uncertainty range.

Every final output has a chain of custody: who requested it, whose garment lock it used, its render parameters, human approval annotations, and all later retouches. A composited photograph incorporating a real model and virtual stage needs layer-level source attribution. A purely generated background must not be presented as an actual location scouting photograph.

## 12. Storyboards, shot lists and photographic coverage

Represent `StoryboardFrame` separately from `Shot`. A shot is a practical unit of work with camera setup and deliverables; a storyboard frame is an illustrative moment or variation. Multiple frames can belong to a shot, and one shot may yield front, quarter and detail image captures. Fields include intent, visual frame, orientation, focal subject, pose time/frame, garment features to reveal, movement notes, mood, lighting cue, production constraints, reference rights and approval.

The shot list must include `shotCode`, `lookCode`, `garmentLockId`, `sceneId`, `cameraRigId`, `lightingRigId`, `modelId`, `stylistId`, estimated setup minutes, estimated capture minutes, deliverable aspect ratios, minimum acceptable frames, contingency/weather dependency, owner and current state. Group shots by shared light rig and physical location to reduce setup moves while respecting talent and wardrobe constraints.

Generate storyboard sheets at selectable A4/letter and video-frame layouts, with thumbnails, product description, shot ID, exact camera height, angle, approximate distance, focal length, lighting diagram identifier, prop positions and notes. Include a revision watermark and explicit “virtual reference” label; photographers should never mistake it for an actual captured proof. The storyboard review workflow records comments pinned to the frame and resolves them by updating the specific shot variant instead of editing generic global campaign text.

Coverage validator examples: a garment with front and rear branding should have both visible somewhere; a fastening-detail shot must be closer than a defined pixel visibility threshold; a reflective hardware photo should have a verified highlight strategy; a complete marketplace pack requires any platform-specific ratio and background constraints entered by the user. These are user-configurable requirements, not universal rules.

## 13. Scheduling, equipment, crew and call sheets

Treat the physical shoot as a resource-constrained production plan. Crew records include role, display name, contact channels, availability windows, assignment, call time, vendor status and permissions. Equipment records include SKU/model, serial/reference, power, grip requirements, reservation window, location, booking approval and contingency. Talent records include fitting time, hair/makeup slot, required breaks, travel window, call/release time and wardrobe looks; private contact and contractual records must be protected by role-based access.

The scheduling engine orders setup tasks before capture, respects availability and location handoffs, inserts wardrobe/hair/makeup changes, and estimates contingency. A call sheet includes date and location, loading/staging instructions, expected weather and backup if outdoors, producer contact, emergency/venue contacts, parking/access, nearest approved emergency facility where verified, crew/talent calls, shot schedule, meal and break plan, wardrobe, major props, rig/equipment summary, reference storyboard link and revision timestamp. Location-specific facts are operator-supplied or fetched from verified services, never fabricated.

Produce a downloadable PDF and mobile-friendly private link with a stable revision ID and access logs. Crew can acknowledge receipt and leave structured comments; each reissued call sheet records what changed and who received it. On-set “actual start,” “actual wrap,” “captured,” “needs pickup” and “blocked” events allow rescheduling. A producer can copy the approved plan into an alternate date without implying that talent or rental reservations have been made.

The day-of-shot view minimizes clutter and presents the next shot, reference image, light diagram, setup checklist and cue notes. Crew attachments should survive weak connectivity through offline capture and eventual sync with conflict resolution, if the installed platform supports it. Actual photographs ingest original file hashes and metadata, without destructive file renaming or recompression of masters.

## 14. Domain entities, storage and relationship rules

Suggested relational core, with immutable blobs in object storage and append-only activity records:

| Entity | Key identifiers and required fields | Relationships / invariants |
|---|---|---|
| `Campaign` | id, title, owner, briefRevision, targetDate, status | Has scenes, shots, one or more production days |
| `GarmentLock` | id, styleRevisionId, materialHash, geometryHash, simulationHash, lockedAt | Immutable; changed content creates new lock |
| `Asset` | id, kind, digest, license, units, status, bounds | Reusable stage, prop, fixture, LUT, HDRI, texture |
| `SceneVersion` | id, campaignId, manifestDigest, floorPlanId, revision | References immutable stage/props/avatar placements |
| `AvatarInstance` | id, avatarAssetId, rigRevision, poseVersion, transform | Exactly one revision per placed character |
| `CameraRig` | id, sensor, lens, exposure, pose, target | Camera calibration values are explicit |
| `LightingRig` | id, fixtures, modifiers, transforms, version | Physical fixture links and lighting approximation |
| `Shot` | id, code, order, sceneVersionId, garmentLockId, shotState | Camera and lighting rig versions pinned |
| `StoryboardFrame` | id, shotId, cameraFrame, imageDigest, notes | May be multiple frames per shot |
| `ProductionDay` | id, date, venueId, status, timezone | Has scheduled calls, planned shots and actual events |
| `CrewAssignment` | id, productionDayId, personId, role, callTime | Rights-scoped contact information |
| `GearBooking` | id, assetId, reservationRange, bookingState | No false confirmation of an unbooked item |
| `CallSheetRevision` | id, productionDayId, scheduleDigest, pdfDigest, publishedAt | Every issue is immutable and auditable |
| `RenderJob` | id, shotId, sceneDigest, profile, status, workerFingerprint | Inputs immutable after dispatch |
| `RenderArtifact` | id, jobId, pass, digest, dimensions, colorSpace | Original and review derivatives distinct |
| `Capture` | id, shotId, ingestDigest, takenAt, cameraMetadata, approval | Physical photograph tied to planned shot |
| `AuditEvent` | id, actor, entity, version, action, timestamp, diffDigest | Append-only history for meaningful edits |

Example canonical shot manifest (illustrative API contract; versions and IDs are proposals):

```json
{
  "schema": "exo.photo-shot/1.0",
  "campaignId": "cmp_001",
  "shotId": "shot_004",
  "shotCode": "LOOK01-CAM-A-04",
  "garmentLock": {
    "styleRevisionId": "style_rev_012",
    "colorwayId": "washed-black",
    "sizeId": "M",
    "geometrySha256": "<verified-sha256>",
    "simulationSha256": "<verified-sha256>"
  },
  "scene": {
    "stageAssetId": "stage-cathedral",
    "sceneVersionId": "scene_rev_008",
    "units": "m",
    "upAxis": "Y",
    "origin": [0, 0, 0]
  },
  "camera": {
    "sensorWidthMm": 36,
    "sensorHeightMm": 24,
    "focalLengthMm": 85,
    "fStop": 5.6,
    "focusDistanceM": 3.2,
    "transformRef": "camera-a-04"
  },
  "lightingRigVersionId": "light_rig_03_v2",
  "avatarPoseVersionId": "pose_walk_12_v1",
  "intent": "rear detail with visible raised stitching",
  "deliverables": [{"aspect": "4:5", "width": 2400, "height": 3000}]
}
```

The hash placeholders above must be replaced with real 64-character SHA-256 digests before final submission. Data validation requires foreign keys, units, ISO8601 timezone-aware timestamps, nonzero lens dimensions, normalized quaternion transforms, unique shot code within a campaign, and scoped modification rights. Database transaction boundaries should ensure approving a shot pins all referenced revisions atomically.

## 15. API and event contract

The proposed API is versioned and can be implemented in existing local services or a future team collaboration backend. Read operations: `GET /api/v1/photo/campaigns/:id`, `GET /api/v1/photo/stages?status=approved`, `GET /api/v1/photo/shots/:id`, `GET /api/v1/photo/render-jobs/:id`, `GET /api/v1/photo/production-days/:id/call-sheet`. Writing operations: `POST /api/v1/photo/campaigns`, `POST /api/v1/photo/garment-locks`, `POST /api/v1/photo/scenes/:id/versions`, `POST /api/v1/photo/shots`, `PATCH /api/v1/photo/shots/:id` with `If-Match` revision, `POST /api/v1/photo/shots/:id/approve`, `POST /api/v1/photo/render-jobs`, `POST /api/v1/photo/production-days/:id/publish-call-sheet`, and `POST /api/v1/photo/captures/ingest`.

Mutations return a changed entity revision and event identifier. Render requests take only manifest digests and pinned profile IDs rather than reconstructing values from current frontend controls. Use idempotency keys for render submissions and call-sheet publication; scene version create requires server-side normalization. An approval operation refuses unresolved critical validation warnings, mismatched source revision or unlicensed required media.

Events can use `photo.shot.updated`, `photo.garment-lock.created`, `photo.scene.approved`, `photo.render.status-changed`, `photo.callsheet.issued`, `photo.capture.ingested`, and `photo.asset.invalidated` with stable event IDs, ordering token and actor. Downstream consumers rebuild only derived thumbnails/diagrams affected by the dependency graph. The manufacturer tech-pack dashboard may link to an approved marketing artifact, but factory release authority remains separate from creative approval.

## 16. Three complete workflows

**Workflow A: white seamless e-commerce.** Open a garment with an approved revision and choose size M, black colorway. Create a PHOTO STUDIO campaign and select “white seamless catalog.” EXO builds a dimensioned cyclorama set with a fixed subject mark and proposes six frames: front, three-quarter, profile, back, chest detail and cuff/label detail. The stylist chooses a generic avatar and checks the fit/drape revision; photographer selects a full-frame sensor and fixes a nominal focal length/camera distance. A light tech chooses a soft key/fill arrangement, places fixtures on the floor plan and checks venue ceiling and circuit data. Draft low-res previews go to the art director for approval. A frozen six-shot Cycles batch produces reference images and a linked storyboard. The producer assigns the actual sample, crew, cameras, lights and venue, then publishes the call sheet. On set, the photographer records real images against the shot IDs; the reviewer flags any product discrepancy and chooses final captures. Success evidence includes six pinned garment identities, six renders, one practical light plan, a published call sheet and six captured shot associations.

**Workflow B: architectural editorial campaign.** Choose a single colorway and three design looks with different approved garment locks. Select the curated cathedral stage or verified custom room model as a concept environment. Place a model at measured landmarks, choose a walking pose and plan a combination of wides, details and motion frames. The director draws a camera movement path and creates alternate frame crops. A producer can compare use of a real building against construction of a studio facade, with location survey confidence and rental feasibility shown independently of artistic previews. Set designers create a prop and floor plan with actual moving clearances. The team approves a ten-frame storyboard and builds a schedule grouped by lighting rig, wardrobe changes and space moves. Render provenance records where geometric virtual equivalence is limited. The final review board separates synthetic campaign plates, original on-site captures and composited finals; it never implies that a virtual cathedral proves the physical venue exists or can be rented.

**Workflow C: studio campaign with CRT and column.** Start from a narrative shot concept using a column, television, garment and dark studio sweep. Import correctly dimensioned versions of the column and CRT. Author a top-down floor plan including CRT power, stand load, camera travel, light booms, cable route and model marks. Generate storyboard frames of the avatar approaching the column, turning toward the CRT, and a closeup of the garment. Request a Cycles proof with separate light passes to judge the screen glow versus product legibility. The physical producer checks CRT availability, a tested playback source and practical display exposure, and schedules lighting and wardrobe changes. On shoot day the assistant sees scene diagrams and tracks continuity frames. Afterwards images and notes attach to exact scene/shot versions and the director marks whether each planned shot was captured, altered or cut.

## 17. Validation strategy and falsifiable acceptance criteria

Build fixtures that test geometry, production metadata, camera parity, offline fidelity and traceability. Start with a 1-meter cube, mannequin, calibrated color chart, reflective sphere and one real garment. Assertions should include:

1. Import a GLB scene, export to Blender and verify known anchors and bounding box dimensions within an engineering-set tolerance (initial target 1 mm on static calibration cubes; document real mesh deviations). Test Y-up to Z-up conversion in both directions.
2. Lock garment revision A, change the production CAD source to B, and prove previously approved shots, renders and PDFs retain A and are visibly marked stale relative to the project current revision.
3. Change only camera focal length and verify pattern, material and cloth hashes remain unchanged; change pose and confirm any derived cloth snapshot is independently versioned.
4. Render the same approved shot twice with the same build, seed and inputs. Verify provenance equality and appropriate pixel equality policy (exact only if deterministic hardware conditions allow; otherwise bounded visual metrics).
5. Compare camera projection of test landmarks between Three.js and Cycles with an explicitly defined pixel or angular tolerance. Distinguish geometric projection from color/light comparison.
6. Load a missing or empty stage GLB; expect a visible error and no “ready” or approved scene badge. A stage that is only a flat thumbnail must not pass 3D acceptance.
7. Serialize, close, reopen and reproduce a six-shot campaign. Verify all IDs, transforms, gear reservations, user annotations and immutable references survive.
8. Attempt to approve a shot whose garment lock is missing, material is unlicensed or light rig references missing objects. Receive a field-specific validation error.
9. Generate a dimensioned lighting diagram with a known 3-meter key distance; measure its exported vector/PDF scale and validate numeric annotations.
10. Schedule two incompatible uses of the same garment sample and one booked lens. Flag conflicts, suggest permitted reorderings and never auto-book equipment.
11. Issue a call sheet, change an approved call time and reissue it. Confirm revision comparison, recipient acknowledgment status and audit evidence.
12. Simulate a cancelled render midway; prove no partial output is labeled complete and the original render settings and error logs remain available.
13. Attach real camera RAW and JPEG derivatives; hash the originals, link both to the correct shot and preserve metadata without silently converting masters.
14. Test RBAC: styling guests comment on visual boards, photographers update captures, producers publish call sheets, and none can rewrite locked CAD geometry.
15. Validate accessibility: keyboard selection of shot cards, tooltips with names, visible focus, labels, motion-reduced option and readable contrast in dark mode.

Golden image acceptance needs a human-reviewed baseline across WebGL preview and Cycles final at the same shot, with known expected differences recorded. Regression should inspect seam silhouettes, trims and logo placement, especially for dark black garments where denoising or texture compression can erase construction detail. Run a small production pilot with an actual photographer and producer and compare virtual floor plan to measured tape distances. Record misses and update rig assumptions before advertising production readiness.

## 18. Implementation milestones and ownership

**Milestone 0 — data truth and inventory.** Inventory existing GLBs and assets, photograph QA of five curated stages, source licenses, scene bounds and current renderer behavior. Define schemas and migration plan for per-campaign photo documents. Deliver a reference fixture suite with one garment, camera, light and stage. Exit gate: all referenced assets resolve and each source is traceable.

**Milestone 1 — interactive photo storyboard.** Add PHOTO STUDIO navigation, shot cards, gallery, versioned presets, stage/avatar/pose/camera/light controls and floor-plan representation. Build geometric projectors and shot serialization first. Exit gate: six-shot campaign can save/reopen and reproduce camera framing; no garment CAD mutation.

**Milestone 2 — offline render bridge.** Implement manifest compiler, Blender adapter, worker queue, deterministic profiles, EXR outputs, thumbnail generation, progress/errors and provenance. Exit gate: comparable calibration scenes maintain dimensions, camera match tolerance and archived reproducible render manifests.

**Milestone 3 — physical production desk.** Add venue survey, prop/equipment inventory, practical light plots, talent/crew assignments, schedule conflict checks, call sheets and shot status recording. Exit gate: one small actual production day can operate entirely from EXO's approved packet while original camera files remain intact.

**Milestone 4 — review and continuity.** Build on-set capture ingestion, side-by-side rendered/real contact sheet, comments/approvals, discrepancies and final export package. Exit gate: every approved marketing image links to a shot, locked style revision, real/synthetic origin, responsible reviewer and source file lineage.

Suggested technical ownership: garment identity/CAD maintainer owns source revision contracts; frontend/Three.js owner builds studio interaction; graphics pipeline owner builds Blender compilation and material test fixtures; backend owner handles hashes, queue and audit; production-design representative validates call sheets, venue surveys and equipment ergonomics; QA owns geometric and photographic pilot comparisons. Integrate in incremental feature flags so unfinished Cycles/physical production features are labeled preview.

## 19. Security, rights, resiliency and practical constraints

Projects may contain model measurements, confidential samples, private sets, shoot locations, identifiable crew contacts and unpublished campaign images. Enforce per-project access, least privilege for render workers, signed media access links, retention options and separate permissions for public portfolio publishing. Asset imports need license terms, redistribution flags and review of third-party likeness rights. An inspiration image never automatically grants permission to distribute its source mesh or reproduce identifiable performers.

Run rendering in controlled worker processes using vetted asset paths and sandboxed file resolution. Prevent relative path traversal in imported material references, protect against zip-bomb asset packages, cap geometry and texture sizes, and isolate uploads before Blender imports. Sanitize EXIF location metadata from outward-facing proof sheets when appropriate, preserving metadata in authorized originals.

Recovery requires autosaved draft snapshots, conflict-aware writes, immutable prior revisions, clear disk-usage reporting, crash-safe queue checkpoints and backup/restore rehearsal. Large EXR and asset files need deduplication and lifecycle rules. Losing worker connectivity may delay rendering but must never corrupt campaign boards. A portable project package should include all referenced assets or a manifest of missing rights/remote dependencies.

## 20. Source references and evidence status

**Inspected local sources:** `src/data/stagePresets.js`, `src/components/StageCatalog.jsx`, `src/core/createStageEnvironment.js`, `src/App.jsx` (referenced StageCatalog locations), and `docs/research/apparel-production-deep-dive-2026/03-strategy-and-sources.md`. All current-state statements in Sections 2 and 9 are based on these file inspections on October 17, 2026. Asset quality claims remain limited to what the components themselves disclose; there was no independent photoreal inspection of all source scenes in this research pass.

**Technical primary references:**

- Blender 4.5 LTS Manual, Render Layers and Passes: https://docs.blender.org/manual/en/4.5/render/layers/passes.html — available data passes, light groups and compositing limits.
- Blender Manual, Cycles introduction: https://docs.blender.org/manual/en/latest/render/cycles/introduction.html — reference for offline physically based rendering behavior and settings; verify exact deployed Blender version.
- Blender Manual, Color Management: https://docs.blender.org/manual/en/latest/render/color_management.html — explicit exposure/view transform and image pipeline.
- Khronos, glTF 2.0 specification and extensions: https://github.com/KhronosGroup/glTF/tree/main/specification/2.0 and https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_lights_punctual/README.md — interoperability baseline and the defined punctual-light types; rich area lights require independent representation.
- Khronos, glTF asset/object model: https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/ObjectModel.adoc — asset graph and extension mapping.
- OpenUSD documentation: https://openusd.org/release/index.html — potential future scene interchange, layering and asset composition; adoption is an architectural option, not a currently implemented EXO integration.
- Academy Color Encoding System documentation: https://docs.acescentral.com/ — optional production color pipeline guidance requiring an explicit configured implementation.
- CIPA EXIF metadata reference: https://www.cipa.jp/std/documents/e/DC-008-Translation-2024-E.pdf — metadata interpretation; do not assume EXIF alone calibrates perspective.

All proposed APIs, IDs, job profiles, acceptance thresholds and production workflow entities in this document are **design recommendations**. Before implementation, validate specific camera vendors, lighting gear, supported import formats, Cycles build, and physical production practices with working professionals. In particular, no simulation should be described as a pixel-identical preview of an eventual real photograph absent controlled measurements and validation.
