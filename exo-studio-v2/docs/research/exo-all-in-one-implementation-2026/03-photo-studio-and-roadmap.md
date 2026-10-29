## Page 21 | EXO Photo Studio: virtual photographs and real-shoot plans

Add a **Photo Studio** workspace designed for two outputs at once: convincing 3D images of the approved garment and a practical preproduction plan for shooting that garment with real people, cameras and lights. The workflow is not only choosing a filter or stage; it plans individual frames, sequential looks, the physical footprint of the studio, crew, equipment, lighting modifications, garment samples and actual shoot time.

**Photo Studio home:** each `ShootProject` belongs to a style collection or campaign and contains one or more `Look` records, shot templates, sets, sessions, production tasks and assigned users. Users begin with “Create shoot” and choose purpose: ecommerce pack, editorial/lookbook, campaign, fit/product details, or showroom/runway. A setup wizard asks which garment revision to photograph, which sizes/colorways are ready, whether a physical sample exists, target aspect ratios and planned deliverables.

**Workspace composition:** left column **Looks / Sets / Shots / Assets**; center realtime stage with movable garment/model/camera/light handles and camera-view toggle; right inspector **Camera / Lens / Framing / Lights / Pose / Props / Material / Rendering**; bottom storyboard/contact-sheet timeline showing every shot thumbnail, status and real-shoot schedule. A second tab displays a top-down scaled floor plan rather than 3D. A third tab displays the call sheet and crew/equipment list.

**Preset workflow:** “White E-commerce / 8-shot kit” creates shot placeholders with front, back, side, three-quarter, mid, logo/zipper detail, material macro and lifestyle image. “Editorial Concrete / 5-shot story” creates hero, angle/pose variants, intimate texture and dynamic transition shots. Each preset is a template with editable cameras, backgrounds and actions; it should never rewrite a user's authored camera rigs without explicit choice.

**Output:** preview stills, photorealistic render jobs, storyboard with notes and numbered filenames, shot list spreadsheet/CSV, set plan with equipment positions, photographer-facing image contact sheet, crew timeline and shoot-day call sheet. EXO can later ingest actual photographer selects and pair them with their virtual reference shot IDs.

<!-- PAGE -->

## Page 22 | Build on the actual EXO Stage Library

Current EXO has 20 original procedural stage concepts and original Blender scene sources, with a more curated StageCatalog view. These establish useful source assets but do **not** automatically provide lighting-calibrated physical studio plans, photoreal garment renders, camera rigs or a queued production-grade Blender pipeline. The implementation must retain a distinction between `StageDefinition` and `ShootSet` that references the stage and adds physical camera/light and delivery semantics.

**StageDefinition:** stable stage ID, master Blender file/GLB, authored room scale, floor and collision reference, lighting placeholders, camera-ready clearances, source rights, texture dependencies and supported render versions. Catalog groups: white/neutral cove, concrete editorial, classic interior, industrial set, dark showroom, muslin backdrop, runway and outdoor environment. Curation matters more than many inconsistent presets.

**ShootSet:** selected stage version, placement transform, usable floor footprint and ceiling height, real studio correspondence, backdrops, props, light fixtures, V-flats, stands, practical lamps and camera movement zones. A virtual scene may include objects that a real photographer cannot rent or physically fit; flag these as “virtual-only” unless mapped to a real asset or custom-build task.

**Asset library:** cameras, focal-length templates, model avatars, poses, furniture, turntable podium, floor sweep, diffusion frames and studio lights each have size/unit, licensing, real-world equivalent (optional), condition and bounding volume. Tag effects such as simulated fog or physically impossible light source as editorial choices, not preproduction guarantees.

**Preset properties:** stage type, scene renderer compatibility, named camera spots, light positions in metres, nominal modifier dimensions, backdrop dimensions, safe movement areas, shot templates, rough render budget and texture/mesh resource requirements. Each library preset produces an independent shot instance; editing that instance never corrupts the global catalog.

**Quality gate:** open every selected native .blend fixture and web GLB derivative; confirm units and orientation, available camera and lights, no missing textures and usable garment insertion at reference origin. Establish fast Three.js parity screenshots and reference Cycles renders for a few flagship stages, then expand coverage.

<!-- PAGE -->

## Page 23 | Shot boards, looks, story and contact sheets

A single image is a `Shot`, a set of views forms a `ShotGroup`, and the campaign's ordered list forms a `ShotBoard`. Each shot records a unique number, title, intent, garment version, colorway, approved appearance profile, model/pose ID, set, camera, lights, planned prop, crop, resolution, notes, approval status, expected duration and linked outputs. A shot can be duplicated into a variant without losing the original. Sequence matters for storytelling and for an efficient real-world schedule.

**Storyboard UI:** use a horizontal filmstrip or responsive grid of thumbnails. Cards show “SH-005: Hoodie zipper detail,” look name, approval, camera and render status. Drag to change sequence or group shots by garment look, camera setup, lighting setup or real shoot time. On selection, the 3D viewport moves to the exact saved camera and light state; the right inspector displays the reference and a director's note.

**Shot presets:** garment on avatar front/back; side and three-quarter; front flat-lay; hero low-angle; close-up seam; full-body model; seated portrait; motion/walking; product turntable; texture/specimen comparison; twin-model look; campaign environmental establishing shot. Assign physical-sample dependencies: a close-up zipper requires the actual final trim for the real shoot, even if the virtual file has a convincing placeholder.

**Preview modes:** low-cost viewport screenshot for blocking; intermediate contact-sheet render using same stage/pose/camera but reduced samples; full editorial render for approved look. An approval must specify what is approved: composition, lighting direction, styling, product fidelity or final publication. A director approving a gray-box story does not certify garment texture or physical fit.

**Exports:** produce a shot board PDF with image, focal length, estimated camera height/distance, lighting note, pose reference, props, styling, sample readiness and planned output crop. Export the same dataset as CSV/JSON for producers and photographers; include stable shot IDs in filenames and optional QR lookup in printed board.

**Approval loop:** Creative director comments “Raise eye-line camera 15 cm, soften left shadow,” assistant updates only camera/light parameters, creates V02 preview and preserves the existing V01 thumbnail. Approved variants become frozen shoot instructions and render manifest inputs.

<!-- PAGE -->

## Page 24 | Virtual cameras and studio lights mapped to equipment

Define a `CameraRig` with transform, target/subject anchor, projection, focal length in millimetres, sensor dimensions, crop/aspect, resolution, aperture, focus distance, shutter style, ISO/exposure-equivalent controls and depth-of-field settings. Save the actual numerical position in metres; a camera thumbnail screenshot alone does not reproduce real composition. Camera presets may map to common full-frame equivalents such as 35 mm environmental, 50 mm portrait, 85 mm product and 100 mm macro, but lens-equivalence calculations must use the chosen sensor/crop.

**Light rigs** include key/fill/rim/background/grids, modifier type and actual size, light position and orientation, beam/spread, correlated color temperature, intensity estimate, falloff, attachment stand and real equipment mapping. A virtual rectangular area light can approximate a softbox shape; physical strobes are rated in watt-seconds with modifiers, flash duration and distance, so do not advertise a direct 1:1 Blender watt-to-flash-energy conversion.

**Realtime editing:** select a light in 3D and drag its stand/aim handle; show a virtual top-view plan with distance measurements, shadow direction and obstruction/safety overlays. Record ratios as relative exposure/appearance plus tested real-world light-meter notes if available. Support white seamless wall, V-flats, negative fill, reflectors, flags, diffusion scrims and practical lamps as useful studio objects.

**Real room checks:** Enter room width/depth/height, loading access, electrical limits, shooting distance and backdrop width. EXO can warn when the virtual 100 mm lens camera is too far from the subject for a 6 m room, when a boom stand sits in a doorway or the light modifier intersects the model. Those checks require measured studio geometry; an arbitrary virtual room proves nothing about a booked physical venue.

**Color discipline:** renderer working space, view transform, exposure, output ICC/color conversion and display assumptions are saved. Use a neutral material proof mode for fabric/color references; editorial color grading may deliberately shift perceived colors and should never redefine the approved factory dye reference.

**Acceptance:** Open the same shot on two machines and compare camera framing/bounds and light positions numerically. Export a measured floor plan; a photographer can assemble corresponding camera/light positions without guessing solely from the rendered reference.

<!-- PAGE -->

## Page 25 | Product realism, drape validity and source safety

For credible 3D product photos, lock the actual garment **construction identity**: pattern revision, visible silhouette, seam/topstitch IDs, hardware count and positioning, artwork/logos, colorway and material assignments. The render may add staging, lighting, camera and model pose, but must not silently change those elements. Studio art and production engineering have different authority.

**Input pipeline:** a frozen authoring source produces a presentation mesh plus source/solver/provenance manifest. Material visual profiles include PBR albedo, normal, roughness, sheen, scale and fiber direction. The physical profile is separate, and any draped frame should identify simulation backend, material approximation and acceptance/verification. Previous PPF audit found garment-contact/seam failures, so do not present a cosmetically smooth frame as certified fit or cloth-body clearance.

**Two preview paths:** browser Three.js produces interactive fast camera/staging previews; Blender Cycles produces controlled high-sample still images using the same shot manifest after a conversion/compatibility check. The exported GLB can lose Blender light setups and certain material features, so the adapter must instantiate cameras/lights explicitly for each backend and flag unsupported differences.

**Quality controls:** protect logos and graphic locations, compare garment topology and material IDs, check UV direction and fabric repeat size, ensure expected pieces/fasteners exist, calculate crop and camera visibility, inspect contact shadows and clip/penetration, and use neutral reference shots for calibrated fabrics. Cosmetic denoising can alter microtexture; verify details at 100% display.

**Render status:** A job can finish computationally and still be rejected by visual QA for missing trim, black texture, unsupported shader, unexpected clipping or inaccurate product identity. Distinguish `RENDER_COMPLETED` from `VISUALLY_ACCEPTED` and `PHYSICAL_PRODUCT_VERIFIED`.

**Important distinction:** 3D render is useful for previsualizing a real studio photo, but actual fit, skin/hair, fabric sheen, physical sample construction and real equipment may differ. Include an unobtrusive “virtual visualization” provenance indicator for internal reference. Do not promise pixel-perfect correspondence to reality.

<!-- PAGE -->

## Page 26 | Render farm and versioned shot production

Begin with a **local render worker** on the user's Mac and a controlled Blender installation. A RenderJob references immutable `shotManifestHash`, scene asset versions, garment/presentation mesh hash, validated material maps, selected renderer, resolution, sample count, denoising, output format, GPU/CPU capabilities and queue priority. The server or local service submits one job at a time or within measured hardware quotas, returns progress and writes outputs with unique filenames and hashes.

**Pipeline:** User chooses shot → EXO validates required asset hashes and licenses → compile a Blender scene from the source `.blend` stage plus frozen garment and camera/light config → open/render headlessly → collect output PNG/EXR plus optional object/matte/depth/material passes → run technical image checks → attach preview, settings and diagnostics to shot. Keep original scene and output layers available for revisions.

**Queue states:** `QUEUED`, `VALIDATING`, `ASSEMBLING`, `RENDERING`, `POSTPROCESSING`, `COMPLETED`, `REJECTED_QA`, `FAILED`, `CANCELLED`. Changing a shot after submission does not mutate its queued manifest; the user can cancel and create a new version. Cache reuse keys must incorporate garment/scene/light/material revisions and render version.

**Interoperability:** Exchange transforms in metres with explicit axis conversions, color management, UV tangent conventions, physically separate fabric front/back shaders and named material channels. OpenUSD's layered/reference composition and variant sets may help later with reusable looks and shot variants, but should not be adopted blindly before Blender and web support are measured: https://openusd.org/25.11/usdfaq.html and https://aousd.org/usd-core-specification/.

**Performance:** draft renders use lower resolution and controlled samples. Finals are queued with resource estimates and optional hardware profiles. Track CPU/GPU backend, available memory, frame duration, asset weight and estimated credits/cost. Do not launch hidden GPU jobs just because a user switches stage; explicit render actions should control expensive work.

**Acceptance:** Batch 12 shots; verify no cross-shot camera leakage, deterministic manifest hashes, recognizable image thumbnails, cancel/resume behavior and asset provenance. Restart the worker mid-job, restore statuses without declaring partial images complete and preserve the user's saved garment and ongoing native app session.

<!-- PAGE -->

## Page 27 | Make the digital plan usable on a real shoot day

The distinctive goal is **rehearsing the physical shoot before paying for the studio**. Add “Convert to Real Shoot Plan” to a reviewed shot board. Ask for studio venue, floor measurements, set access, time window, model/crew roles, available lights/cameras/lenses, equipment rentals and final physical samples. Virtual shot parameters are then translated into annotated floor and elevation diagrams showing subject/pose points, camera tripods, focal lengths, light stands, modifiers, V-flat placement, background distance and clearances.

**Producer view:** Group shots by lighting setup and wardrobe change to minimize resets. Estimate setup and shooting duration per group with explicit human-adjustable assumptions; derive a draft chronological call sheet including crew call, model/talent arrivals, hair/makeup, first shot, breaks, location restrictions and wrap. Crew safety, labor rules, venue access and equipment power capacity require a real production manager's confirmation.

**Gear breakdown:** camera body/sensor, lenses, tethering/capture laptop, color cards, tripods, seamless rolls and support, softboxes/stripboxes/reflectors, stands/booms, clamps, sandbags, props, garment steamers, styling clips, spare trim and sample size/color inventory. EXO can recommend a list based on the shot plan while leaving availability and supplier price as “unconfirmed” until supplied.

**Talent and garment readiness:** Use one row per look: chosen model, approved physical sample size, styling/shoes/hair/makeup, backup sample, fit notes, responsible stylist and shot IDs. A campaign with three garment colorways should not imply that a virtual colorway is available as a sewn physical sample. The platform explicitly flags missing sample or incompatible fit.

**Outputs:** downloadable shot board/contact sheet, schedule CSV/ICS or compatible calendar artifact, PDF floor plan with metre dimensions, crew-facing call sheet, gear list, location notes and reference images. Version the package and collect approvals before distribution. The photographer should be able to print or open these without EXO accounts if granted a production-safe export.

**Day-of-shoot:** mark each shot pending/captured/selected/reshoot, attach RAW/JPEG references and contact sheet links, and record discrepancies to the virtual plan. Never overwrite the approved virtual preview with a physical capture; pair them through shot ID for later comparison.

<!-- PAGE -->

## Page 28 | The physical-photo / virtual-render comparison loop

Each shot should have a **reference render**, an **on-set capture**, a **selected final** and a **change log**. Review them side by side at matched crop, camera orientation and known garment features. Virtual shots answer “What will the planned composition look like?” Physical photos answer “What actually happened with this garment, model and set?” Their differences can improve future previsualization.

**Useful metrics:** camera/lens/subject-position mismatch, shadow direction and contrast, visible garment hue under real lights, pattern/zipper/logo framing, sample fit/silhouette differences, set-prop mismatch and shot coverage. Optional image alignment tools may help compare edges and composition, but subject movement and depth of field can make naive pixel differences misleading.

**On-set dashboard:** show each shot card with reference thumbnail, completion state, capture notes, assigned photographer/stylist and approved select. A remote director can mark “retake logo detail at shallower angle” with visual pin; the task belongs to `Shot SH-07`, not a generalized project message. Offline photo teams can import from a standardized directory with filenames carrying shot IDs and capture timestamps.

**Approval specificity:** a client can approve composition but request better fabric texture; a production manager can approve time/gear plan but mark an electrical issue unresolved; a brand owner approves final marketing image only after verifying product identity. Preserve all these distinct review decisions. Published files should reference a final selected asset rather than a provisional render whose source later changes.

**Reproducibility and honesty:** Store color pipeline, image metadata, garment appearance revision and renderer version for virtual outputs. Store actual camera/lens metadata and approved edit lineage for physical photos when provided. Mark any composited/generated product modifications clearly in the internal provenance trail; do not use a fabricated stitch, zipper or silhouette as manufacturing truth.

**Later opportunities:** automated shot grouping by crew/lighting, AR overlays for camera positions, light-meter integration and production scheduling optimization. Validate each against real shoots first. The strongest V1 value is likely a usable 3D storyboard and a practical physical studio plan, even before advanced AR features exist.

<!-- PAGE -->

## Page 29 | Roadmap, team, effort and decision gates

**Month 0–1: source and interface contract.** Audit the active V2 hybrid garment state. Define canonical `GarmentSnapshot`, revision IDs, POM/BOM and 3D appearance pointers. Establish synthetic factory fixture and a white-studio shot fixture. Choose storage and API deployment strategy. Gate: full source readback, saved hashes and no silent drift between native and EXO draft geometry.

**Months 1–3: two visible prototypes in parallel.** Team A builds private read-only living tech pack with technical sections, POM viewer, released PDF and fixture preview. Team B builds Photo Studio shot list, stage selection, camera/light controls, four presets and storyboard PNG. Both reference immutable garment fixture revisions. Gate: pattern/model and shot revisions remain independent; source export matches displayed data.

**Months 3–5: factory review & real-photo planning.** Build scoped partner accounts, pinned comments, photo uploads, factory questions, change proposals and approvals; implement physical studio dimensions, shot floor plans, call sheet/gear list and actual-vs-virtual shot pairing. Gate: complete sample-review demo with two isolated factories; 8-shot storyboard yields usable physical plan signed off by a photographer.

**Months 5–7: reliable releases & rendered imagery.** Implement immutable R01/R02, acknowledgement and diff; complete render queue with Blender Cycles scene assembly, material/color checks and source hashes. Gate: reconstruct factory release/shot manifest after restart and prove accepted renderer matches required garment identity without missing assets.

**Months 7–10: manufacturer pilot and launch quality.** Add mobile portal, source change propagation, production milestone reporting, per-order access, role revocation, backup/restore, secure downloads and approved virtual look exports. Gate: real manufacturing partner can work through one complete sample iteration with readable offline files; shot previsualization used in at least one physical studio test.

**Months 10–12+: selective expansion.** Costing, deeper BOM/cut/marker checks, QC tracking, translations, supplier APIs and optional advanced shoot automation. Prioritize based on partner feedback and availability of validated native geometry. Actual timelines are estimates contingent on existing project stability, team skill, stakeholder access and competing V2 repair work.

**Indicative staffing:** one CAD/Rust/native integration engineer, one backend/auth/DB engineer, one full-stack portal engineer, one 3D/Blender/render pipeline engineer, one product/UX designer, and fractional professional patternmaker, factory reviewer and photographer/producer. Tasks can be shared, but reliable multiuser security and calibrated render parity add nontrivial calendar time. No procurement or shipping date is approved by this research.

<!-- PAGE -->

## Page 30 | Priorities, acceptance ledger and first build slice

**The first high-confidence build slice:** (A) one versioned read-only Tech Pack website generated from EXO's existing factory JSON/POM/BOM/2D previews; (B) one camera-aware Photo Studio shot board using the existing white/neutral stage and garment visual asset. Both have a fixed source revision and a shared Style Overview. This proves the platform's navigation and data contract without risking a real production release.

**Next build slice:** authenticated factory partner, anchored POM/edge/photo comments, sample observation, approval proposals and R01/R02 diff. Parallel studio work adds visual presets, virtual camera/lights, physical floor dimensions and an eight-shot printable storyboard. Ship each as a separately testable vertical workflow before attempting enterprise PLM or a massive render farm.

**Gate F1 — technical provenance:** Every Tech Pack section shows source revision and whether values are supplied, calculated, measured or approved. **Gate F2 — release integrity:** R01 never changes after issue; R02 requires valid diff and owner sign-off. **Gate F3 — access:** Factory B cannot read Factory A's files, comments or costs. **Gate F4 — production:** sample observation and corrective spec changes remain linked to their original release. **Gate S1 — shot fidelity:** eight camera/lighting/garment manifests reopen reproducibly. **Gate S2 — physical plan:** a photographer can recreate set placement within documented measurement tolerance using exported diagrams. **Gate S3 — renderer:** a completed high-quality image identifies source, render engine and files; errors are surfaced before editorial sign-off.

**Risks needing early mitigation:** old-vs-native garment source mismatch; rendering physically implausible fitted poses; missing supplier material data; unsafe file/share permissions; silent 2D annotation drift after topology changes; lack of sample verification; mismapped Blender/glTF lighting and color; optimistic schedule estimates; partner reluctance to use an online portal. Each risk receives an assigned acceptance test and fallback.

**Sources and companion plans:** The prior `docs/research/apparel-production-deep-dive-2026/` Gap Atlas and 86-item inventory; EXO's `docs/EXO_INTERACTIVE_WEB_TECHPACK_PLANNING_2026-10-16.md`; `docs/EXO_PPF_MATERIALS_IMMERSIVE_STUDIOS_FUTURE_ARCHITECTURE_2026-10-16.md`; official Blender manual (https://docs.blender.org/manual/en/latest/), OpenUSD (https://openusd.org/25.11/usdfaq.html), OWASP Authorization Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and dedicated `MANUFACTURER_PORTAL_BLUEPRINT.md` / `PHOTO_STUDIO_BLUEPRINT.md`. Consult the accompanying reference register for full provenance and unresolved feasibility questions.
