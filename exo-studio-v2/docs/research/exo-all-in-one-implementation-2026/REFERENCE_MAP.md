# Technical sources, evidence and assumptions | EXO implementation blueprint

**Cutoff: 17 October 2026.** The 30-page main document is an implementation plan grounded in current source inspection, earlier user research and the technical documentation linked here. It is not proof that manufacturer cloud collaboration, shot scheduling or physically predictive render-to-real matching exists in the current app. Product sources document capabilities; actual interoperability must be tested. Web URLs may change after the cutoff.

## Local EXO source and prior research

| Source | Relevant inspected capability and implication |
|---|---|
| `src/core/factoryPackage.js` | Existing read/write *export* functions produce `tech-pack.json`, factory HTML, POM CSV, BOM CSV, marker summaries, size-run and DXF package. A server-side website, collaboration, accounts and approval workflow still require implementation. |
| `src/core/measurements.js` | Existing point-of-measurement and size-run composition. Web projection should reuse actual numbers with immutable source revision; release validator must distinguish calculated from physical sample measured. |
| `src/core/productionPreflight.js` | Existing structural warnings for seam lengths, pattern shape, notches and marker overflow; `factoryCertified:false` is explicit. Add independent destination and actual factory acceptance before stronger claims. |
| `src/core/productionCost.js` | Fabric-only estimates with incomplete-marker and missing-price status; cannot substitute for supplier quotes, labor, trims, shipping or landed manufacturing cost. |
| `src/App.jsx` | Current render controls include `stageId`, environment/lighting and still output settings. The main app saves significant UI/editor state locally, so multiorganization collaboration needs a new backend. |
| `src/data/stagePresets.js`, `src/core/createStageEnvironment.js`, `src/components/StageCatalog.jsx` | Stage catalog and Three.js scene controls can seed Photo Studio. Existing catalogue scene concepts do not imply measured physical studio light/camera workflows or render queue. |
| `docs/research/clo-connect-community/blender-scenes/` | Existing authored `.blend` studio/runway scenes for curated virtual sets; confirm current curation/assets and tested scene before first shoot presets. |
| `docs/EXO_INTERACTIVE_WEB_TECHPACK_PLANNING_2026-10-16.md` | Previous first-person user concept and more detailed future factory-site specifications: interactive POM/pattern/BOM, manufacturer comments, versioned releases, role-sensitive views. This blueprint extends and operationalizes it. |
| `docs/EXO_PPF_MATERIALS_IMMERSIVE_STUDIOS_FUTURE_ARCHITECTURE_2026-10-16.md` | Distinct physical solver, PBR appearance and stage asset plans; explicitly documents PPF contact and seam gap historical failures and cautions around cloth-fit certification. |
| `docs/EXO_STUDIO_V1_V2_STATE_MANAGEMENT.md` | Protected V1/V2 isolation and current disconnect between native Rust source editor and legacy EXO draft manufacturing widgets; typed synchronization and truth audit are prerequisites. |
| `docs/research/apparel-production-deep-dive-2026/EXO_APPAREL_SOFTWARE_GAP_ATLAS_30_PAGES.md` | Previous 30-page user-research report identifying grading, cutter, tech pack, simulation, costing and interoperability gaps. |
| `docs/research/apparel-production-deep-dive-2026/SOURCE_REGISTER.md` | 41 linked industry, official, standards and community sources; see for provenance on specific product claims and qualitative practitioner complaints. |

## Platform, auth and API documentation

| Specification or official guide | Use in this plan |
|---|---|
| [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | Deny-by-default, per-object external data permission enforcement and tests. |
| [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) | API tenant-isolation, object-level authorization and account/function exposure risks. |
| [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) | Defense in depth for multi-tenant row access alongside application policy. |
| [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) | Typed REST API contract, web and desktop client generation. |
| [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) | Uniform actionable API validation/conflict/problem reporting. |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessible comment reading, keyboard actions, small-device portal usability. |
| [CLO-SET Web Tech Pack BOM](https://support.clo-set.com/hc/en-us/articles/45303192584601-Web-Tech-Pack-BOM) | Example of existing industry technical-pack collaboration concepts; do not claim web BOM is a new invention. |
| [Browzwear Tech Pack API](https://help.browzwear.com/en/articles/13066153-create-a-tech-pack) | Existing structured asset-backed technical-pack API; EXO differentiator must be audited revisions and geometry link. |
| [ISO 2859-1](https://www.iso.org/standard/2859-1) | Lot-by-lot AQL acceptance sampling; licensed tables and qualified policy are needed for accurate acceptance planning. |

## Photo previsualization, 3D, color and camera

| Documentation | Use in this plan |
|---|---|
| [Blender Manual: Cycles](https://docs.blender.org/manual/en/latest/render/cycles/index.html) | Offline high-quality scene rendering; distinguish render completion from review acceptance. |
| [Blender Manual: Cameras](https://docs.blender.org/manual/en/latest/render/cameras.html) | Sensor/focal-length, aperture and framing parameters in saved shot manifests. |
| [Blender Manual: Color Management](https://docs.blender.org/manual/en/latest/render/color_management.html) | Repeatable look-development color transforms and output pipeline. |
| [Blender Python API](https://docs.blender.org/api/current/) | Scripted deterministic scene assembly and batch output jobs; exact version pinned by render worker. |
| [glTF 2.0 and extensions, Khronos](https://registry.khronos.org/glTF/) | Web-friendly garment presentation assets, texture/material limitations and schema interoperability. |
| [OpenUSD composition](https://openusd.org/25.11/usdfaq.html) | Optional advanced reference/variant infrastructure, only after tested Three.js/Blender adapters. |
| [OpenUSD Core Specification](https://aousd.org/usd-core-specification/) | Standards basis for later composition/asset model, not required for first pilot. |
| [OpenColorIO](https://opencolorio.org/) | Color transform interoperability and provenance for image review. |

## Proposed, unverified and excluded claims

The report does **not** claim that a 3D stage photo can perfectly predict physical flash exposure, cloth fit, color or model appearance. Photorealism is not equivalent to construction accuracy. Blender area-light watt values do not universally correspond to flash energy in watt-seconds. Equipment lists are planning aids until a producer checks real venue inventory. Existing stage scenes may be visually valuable but not measured architectural twins of real venues.

The report does **not** claim that static tech-pack data, a 3D garment preview or a successful DXF export constitutes a factory-approved production packet. That status requires responsible reviewer, physical sample evidence as specified by the manufacturer, verified size/grade/cut layers, immutable release record and acknowledgements. Nor does the report claim that local-first, multi-tenant SaaS collaboration is already built. The listed future folders and APIs are proposals with tests and integration gates.

## Project-specific discovery required

Before external launch, consult a professional patternmaker, one cut-room/CAD operator, at least two different factory users, and a photographer/producer. Ask them to walk through a real example and explicitly identify who can approve a revised size, how they send sample photos, whether a phone-friendly website is practical at factory stations, what privacy is expected among suppliers, and which physical studio constraints matter. Obtain consented synthetic/anonymized fixtures rather than publishing the owner's private garment source or physical avatar data.
