# EXO apparel grading / manufacturing software research — 17 October 2026

This qualitative market research expands the October 16 CLO CONNECT investigation into professional apparel pattern CAD, grading, marker making, software interoperability, 3D fit and simulation, tech packs, PLM, sourcing, manufacturing execution, QA and AI workflows.

## Deliverables

- **`EXO_APPAREL_SOFTWARE_GAP_ATLAS_30_PAGES.pdf`**: designed 30-page main report, physically paginated and verified in PDF renderer.
- **`EXO_APPAREL_SOFTWARE_GAP_ATLAS_30_PAGES.md`**: complete 9,610-word editable main-report source.
- **`EXO_FEATURE_GAP_INVENTORY.md`**: 86 numbered feature/tool candidates across nine functional groups, with priority and evidence distinction.
- **`SOURCE_REGISTER.md`**: 41 linked primary/public references, with dated Reddit examples, official vendor documentation, published standards, and limitations.
- **`grading-cad-evidence.md`**: 5,232-word separate deep dive into Gerber, Lectra, Optitex, TUKAcad, Gemini, Assyst, StyleCAD, GRAFIS, Seamly2D, Valentina and Wild Ginger, with vendor references and grading/interop acceptance tests.
- **`manufacturing-plm-evidence.md`**: 5,524-word deep dive into PLM, tech packs, costing, supplier workflows, production, AQL, traceability, and comparisons to Centric, FlexPLM, WFX, Techpacker, Zedonk and ApparelMagic.
- `01-foundations.md`, `02-production.md`, `03-strategy-and-sources.md`: source sections preserved for easier iterative editing.
- `build_report.py`: reproducible renderer for the Markdown master and 30-page PDF.

## Report coverage by page

| Pages | Topic |
|---|---|
| 1–4 | Research scope, findings, confidence and canonical garment-data graph |
| 5–10 | Best grading criteria, platform landscape, geometry, parametrics, allowance, sewing |
| 11–13 | Inclusive size systems, DXF/ASTM/RUL exchange, marker/cutting |
| 14–17 | Physical fit, simulation diagnostics, fabric calibration, hardware/trim construction |
| 18–22 | Tech packs, approvals, sourcing, manufacturing QA and textile traceability |
| 23–26 | Safe AI agent, construction-locked imagery, Blender/Unreal exchange, accessibility |
| 27–30 | Ranked priorities, 12-month roadmap, acceptance tests and source/disclosure guide |

## Verification

Report exported successfully as **30 physical PDF pages**, with independently counted text on each page; source Markdown generated at **9,610 words**. Representative page 1 and pages 5/30 were visually checked; page extraction and font output are legible. See companion Markdown for direct-click source URLs. The source books and feature list are research artifacts; no EXO application functionality was changed by this research.

## Important evidence classification

Do not conflate **software currently has a feature** (vendor or manual evidence), **one practitioner reported trouble** (Reddit), and **EXO should build or verify this capability** (product hypothesis). The sample is qualitative and cannot support market-wide frequency estimates. No personal or copyrighted user pattern files were acquired. Compare current licensed versions and real factory/cutter workflows before declaring a competitor feature absent or EXO production-ready.

## Regeneration

From the EXO workspace root:

```bash
python3 docs/research/apparel-production-deep-dive-2026/build_report.py
```

Requires local Python `reportlab` and `pymupdf` (`fitz`), as used during generation. The script reads the three numbered source parts, assembles the Markdown master and renders the 30-page PDF.
