# Reference register | EXO all-in-one implementation

**Cutoff: 17 October 2026.** This is an engineering proposal grounded in examined EXO source and prior qualitative research, not evidence that the new portal or production studio exists in the shipped app. Vendor docs describe capabilities but are not independent quality benchmarks. Dates are publication dates where known; undated documentation is marked as such. For additional official and manufacturer sources see the two long companion blueprints.

## Source-code and prior research audit (local primary source)

1. **Current React app**: `src/App.jsx` (render settings, still capture/export, local storage, stage selection), `src/core/measurements.js` (measurement and tech pack creation), `src/core/factoryPackage.js` (factory package JSON/POM/BOM/size-run/pattern exports), `src/core/productionCost.js` (estimated fabric costs), `src/core/productionPreflight.js` (structural checks), `src/core/createStageEnvironment.js` (Three.js scene insertion), and `src/data/stagePresets.js` (stage definitions). Claims about implemented features are limited to inspected modules and companion current-state documentation; they do not replace end-to-end live runtime testing.
2. **Earlier interactive manufacturer website design**: `docs/EXO_INTERACTIVE_WEB_TECHPACK_PLANNING_2026-10-16.md`. Contains intended designer/manufacturer roles, comments, snapshots, POM, sample and release workflow; describes future concept, not a deployed portal.
3. **Earlier photo/immersive architecture**: `docs/EXO_PPF_MATERIALS_IMMERSIVE_STUDIOS_FUTURE_ARCHITECTURE_2026-10-16.md`. Distinguishes visual/physical fabrics, native physics, stage scenes, camera/light workflows and render-source provenance; records limits of available simulation and assets.
4. **Stage inventory**: `docs/research/clo-connect-community/README.md` and `blender-scenes/` with original scene files, source caveats and generated previews. Current `StageCatalog` may show a curated subset; do not claim every recorded stage preset is available in every browser mode.
5. **Source model split**: `docs/EXO_STUDIO_V1_V2_STATE_MANAGEMENT.md` describes the protected V1 and native Rust/legacy draft V2 data distinction, which requires typed migration and parity checks before cloud release.
6. **Previous gap analysis**: `docs/research/apparel-production-deep-dive-2026/EXO_APPAREL_SOFTWARE_GAP_ATLAS_30_PAGES.md` and `EXO_FEATURE_GAP_INVENTORY.md`; qualitative software gaps, manufacturing/grade/fit priorities and evidence qualifiers.

## Public engineering documentation

7. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) (living technical guidance, accessed Oct 2026): least privilege, denial by default, object-specific multi-tenant authorization. A role label alone does not authorize access to another organization's release.
8. [OWASP Authorization Regression Testing](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html) (living guidance): multi-user replay, horizontal and vertical privilege tests for object and nested endpoints.
9. [OWASP REST API Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) (living guidance): API authentication/authorization, request constraints, operational safety.
10. [Blender manual](https://docs.blender.org/manual/en/latest/) (living, version-specific): camera, light, Cycles, compositor, scene and rendering tools. Feature availability and hardware support must be tested in installed version.
11. [Blender render passes](https://docs.staging.blender.org/manual/en/latest/render/layers/passes.html) (Blender 5.2 LTS documentation): depth/normal/object passes and light groups, useful for reusable edit-friendly image outputs.
12. [Alliance for OpenUSD Core Specification](https://aousd.org/usd-core-specification/) (current official standardization): composition, layers, references, variants and scene-data interchange; specific EXO adapter support would require engineering verification.
13. [OpenUSD documentation FAQ](https://openusd.org/25.11/usdfaq.html) (25.11): layered composition and asset references. USD is a scene composition framework, not a ready-made factory sewing specification.
14. [NVIDIA Learn OpenUSD layers](https://docs.nvidia.com/learn-openusd/latest/composition-basics/layers.html) (learning guide): separating room, lights, garment and camera asset editing non-destructively.
15. [Khronos glTF 2.0](https://registry.khronos.org/glTF/) (interoperability standard): 3D mesh/material/scene transport; Blender lights and complete physically matched textile simulation do not automatically survive generic GLB export.
16. [ASTM sewn-product pattern data interchange](https://store.astm.org/d6673-04.html) (apparel 2D exchange standard overview): helps delimit pattern/grade data; sewn-assembly relationship representation requires other data contracts.
17. [ISO 2859-1 sampling](https://www.iso.org/standard/2859-1) (ISO 2859-1:2026): lot-by-lot AQL-indexed acceptance sampling, not an unqualified fixed-percentage garment check.

## Apparel workflow baselines and independent complaints

18. [CLO CONNECT community AI/MD MCP workflow](https://connect.clo-set.com/community/post/b28130de75f2473f959414c687f3cdd2) (8 Oct 2026): an independently built bridge and measured incremental edits; not an official generic EXO/CLO factory API.
19. [Browzwear VStitcher tech packs](https://help.browzwear.com/en/articles/13065817-tech-packs-in-vstitcher) (official): tech packs are a known competitor feature; EXO's proposed differentiation depends on audited links/approval and collaboration.
20. [Optitex marker workflow](https://optitex.com/products/marker/) (vendor): factory marker production and order constraints are mature capabilities; EXO should benchmark accuracy rather than describe marker making as generally missing.
21. [CLO manufacturing/annotation grading discussion](https://www.reddit.com/r/CLO3D/comments/1mk0swb) (7–8 Aug 2025): firsthand rule reuse and DXF interoperability concerns; qualitative and nonrepresentative.
22. [CLO DXF/RUL to Gemini mismatch case](https://www.reddit.com/r/CLO3D/comments/1ii9o70) (5 Feb 2025): single reported graded dimension mismatch across CAD/cutter, useful for round-trip test fixture.
23. [Tech pack workflow and revision comments](https://www.reddit.com/r/ClothingStartups/comments/1t6i0ah/what_part_of_creating_tech_packs_feels_the_most/) (May 2026): anecdotal accounts of repeated updates and factory communication friction; not market-wide prevalence.
24. [r/CLO3D AI garment visual drift report](https://www.reddit.com/r/CLO3D/comments/1shhfqp/is_there_a_good_way_to_use_ai_for_my_garment/) (10 Apr 2026): reported difficulty preserving seam/hardware details in generated images, motivates explicit construction locks.

## Proposed ideas requiring field validation

The manufacturer portal's comments-on-source, measurement observations, role-scoped proposals and auditable approvals are specified in `MANUFACTURER_PORTAL_BLUEPRINT.md` and the first 20 sections of the main report. The virtual-to-real photography studio, camera/lens/light and shoot crew workflow is specified in `PHOTO_STUDIO_BLUEPRINT.md` and sections 21–28. **No published evidence in this report verifies supplier adoption, physical-photo scene parity, garment fit certification or a complete implemented shared garment source.** Validate those with real factory operators, a photographer/lighting tech, numerical export fixtures and filmed repeatable shoot tests.
