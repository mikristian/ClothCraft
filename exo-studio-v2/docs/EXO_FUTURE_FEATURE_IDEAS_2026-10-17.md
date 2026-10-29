# EXO ClothCraft — future feature ideas and priority notes

**Captured:** 17 October 2026  
**Status:** Saved product vision / idea backlog only. None of the items in this document authorizes implementation or implies that a feature is complete.  
**Origin:** User's proposed open-source, local-first CLO 3D-style garment app roadmap.  
**Related existing plans:** [Engineering master roadmap](EXO_MASTER_ROADMAP.md), [Feature atlas](EXO_FEATURE_ATLAS.md), [Fabric digitization](FABRIC_SCAN_PROVENANCE_PIPELINE.md), [Production pipeline](EXO_PRODUCTION_PIPELINE.md), and [Native garment roadmap](GARMENT_STUDIO_NATIVE_ROADMAP.md).

## Product vision

Build an open-source, local-first garment design and physical simulation app inspired by CLO 3D. Connect 2D pattern CAD, 3D sewn fit, fabric digitization, local AI assistance, manufacturing deliverables, accessible physical tools, and a future community ecosystem. Make core authoring usable offline and avoid making cloud accounts or subscription services mandatory.

## Ideas to retain

### 1. Embedded local AI assistant

- Embed an optional local language model using llama.cpp, ideally shipped within the installed app package and running in-process rather than requiring a separate assistant server or paid API. Package model weights and native dependencies explicitly, subject to distribution licenses and device resource limits.
- Provide a Settings toggle and idle unloading to recover RAM/VRAM when the assistant is unused or disabled.
- Convert instructions such as **“make the sleeves looser”** into previewable, validated, undoable app operations using a documented command/function API.
- Local voice input with Whisper or a compatible local speech-recognition engine, plus local text-to-speech output.
- Animated, interactive tutorials that highlight controls, move the 3D camera and execute real reversible operations rather than playing disconnected videos.
- Long-term concepts: opt-in personal style memory, critique mode, and natural language batch editing.
- Clarification: local inference avoids paid *API token fees* and can run offline; it still uses hardware resources. Network access is not needed for the embedded assistant. Separately opted-in remote collaboration/community features would use networking.

### 2. Fabric digitization with two inputs to one profile

- **Visual path:** photograph/scan a physical swatch and produce calibrated repeatable appearance/texture maps, such as albedo, roughness, normal or height, with physical texture scale and color-reference guidance.
- **Physical path:** accept manufacturer measurements including fabric weight, stretch percentages and drape coefficient; support additional measured directional bending/shear parameters when available.
- Use type-based defaults such as **cotton poplin** as explicitly estimated presets with known uncertainty.
- Recognize the traditional Cusick drape tester as an established method for drape-coefficient measurement; retain a low-confidence DIY photograph-based estimator as a later advanced option.
- Appearance maps and mechanical properties remain separate but linked in the same fabric profile; neither a photograph nor a single drape coefficient by itself fully determines accurate fabric physics.

### 3. Production and workflow

- Automatic graded pattern size runs from a master size with editable grading rules and per-size verification.
- Manufacturability checker for tight/invalid curves, incompatible seam lengths, missing notches, problematic allowances and related construction errors.
- Yardage-based material costing including width, marker yield and waste, followed eventually by trim, labor and factory cost inputs.
- Git-like named revisions, checkpoints, comparison, branching and restoration for pattern/project files.
- Print and pattern placement across seams with deliberate motif matching, repeat alignment and grainline awareness.
- Optional live collaboration with conflict resolution and permissions, while local files remain authoritative in offline mode.

### 4. Open-source DIY hardware

- Build/document a DIY 3D-printed plotter/cutter assembled using accessible off-the-shelf components.
- Export full-scale pattern paths and provide an in-app machine calibration wizard for scale, XY skew, tool offset and measured repeatability.
- Optional custom cutting/plotting table for the hardware setup.
- Protect physical use with explicit dry-run and correct-scale test patterns before cutting fabric.

### 5. Projection workflows

- Project true-size patterns directly onto cloth for cutting, with explicit scale, throw, perspective and surface calibration.
- Use MediaPipe or comparable on-device hand tracking for selecting, moving, rotating and inspecting pieces (without unintentionally changing physical pattern dimensions).
- Integrate projector calibration and basic projection mapping inside the app rather than requiring external projection mapping software.
- Use outside 3D-scanning tools such as Blender for scanning or reconstructing the table; import the resulting 3D model into the app.

### 6. AR, body diversity and fit

- Phone-camera AR overlay of simulated garments using pose/body tracking, with clear limitations for occlusion, depth, fit and size accuracy.
- Permission-based community-sourced body-size/fit information, with privacy-aware aggregation and confidence indicators.
- Broaden avatars across heights, shapes, sizes, abilities and accessibility requirements, while validating fit geometry rather than relying only on visual scale.

### 7. Sustainability and community

- Explainable fabric sustainability ratings that show data source, methodology and missing information rather than asserting an unsupported single score.
- Compare physical versus digital sample costs/carbon using documented assumptions and actual sample counts.
- An open-source pattern-sharing/remix community and marketplace with attribution, clear licenses, and optional paid or free distributions.

## Working recommendation (ideas, not committed milestones)

| Practical priority | Candidate | Why it matters | Dependency / first useful version |
| --- | --- | --- | --- |
| **Foundation / now** | Reliable 2D-to-3D edit, sew, simulate, save, reopen and undo | Every premium feature depends on trustworthy source geometry and physically meaningful changes | One verified end-to-end garment flow with clear error states |
| **1 — strong near-term return** | Manufacturability checks integrated into pattern editing | Prevents expensive errors and is useful before a garment ever reaches a factory | Seam walks, allowances, curves, notches, validated source geometry |
| **2 — strong near-term return** | Fabric presets + two-path digitization | A differentiated bridge from real textile samples to virtual design | Calibrated visual maps; unit-labeled, provenance-labeled physical specs |
| **3 — strong near-term return** | Dependable named revision history | Makes experimentation and AI automation safe; excellent for complex garment projects | Versioned immutable project snapshots, comparison and restore |
| **4 — high value after grading stabilizes** | Automated grading + size verification | Directly supports real apparel production and reproducible size runs | Grading rules applied to real edges/measurements across sizes |
| **5 — high value after verified exports** | Yardage/marker costing and repeat print placement | Turns design choices into real material and manufacturing decisions | Reliable marker scale, fabric width and repeat coordinate data |
| **6 — distinctive optional layer** | Embedded local AI command assistant | Could be a major differentiator and an accessible learning interface | Stable, typed, reversible command API; start text-only then voice/tutorials |
| **7 — accessible maker workflow** | True-scale pattern projection | Gives independent makers a low-cost path from pattern to cutting | Full-scale projection calibration and printed reference verification |
| **Later experiments** | DIY cutter, AR try-on, live collaboration, social marketplace, sustainability and body-data network | Promising but broader physical accuracy, privacy, moderation or infrastructure needs | Prove pilot workflows before committing large development effort |

## Design and architecture guidelines

1. Keep the source garment, pattern geometry, fabric profile, grade rules and revision history coherent across 2D, 3D, exports and automation.
2. For **AI**, implement a small reversible command vocabulary before adding a larger embedded model, voice mode or automatic tutorials; require an explicit preview/undo path for bulk changes.
3. For **fabric**, separate measured data from estimated data and material appearance from cloth physics. Display confidence and source information.
4. For **production**, distinguish plausible CAD output from a tested real-world factory handoff; document scale, material units and tolerances.
5. For **projection and hardware**, calibrate against physical references; hand tracking is an interface tool, not a source of physical dimensional truth.
6. For **collaboration**, optional synchronization must never compromise the offline project or silently replace revisions.
7. Preserve accessibility in the core desktop workflow, independent of AR or hand gestures.

## Original suggested sequence, preserved for future planning

1. Core 3D design and simulation engine.
2. Fabric digitization with presets.
3. Local AI assistant as an optional layer.
4. Production tools.
5. DIY hardware and projector workflows.
6. AR, community data and marketplace.

The recommended practical sequence above moves basic manufacturing checks and revision reliability ahead of AI because they reduce errors now and also form the safe command/data foundation for the later assistant.

**Decision:** Archive these ideas for future milestone planning. No application functionality, user data or active tasks changed by this document.
