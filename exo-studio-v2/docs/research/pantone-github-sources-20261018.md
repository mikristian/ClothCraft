# Pantone community repository research — 2026-10-18

This is a source inventory for EXO ClothCraft V2. GitHub visibility does not establish rights to redistribute Pantone proprietary color books, names, data, or artwork. Approximate HEX color is not a manufacturing color standard.

| Repository | Stated content | Engineering use | Verification status |
| --- | --- | --- | --- |
| https://github.com/consultpater/pantone | 5,020 TCX/TPG/coated/uncoated entries, committed `colors.json` | Search UX, import-schema design and comparison | Community HEX approximations; redistribution license of data not established |
| https://github.com/Margaret2/pantone-colors | 2,310 FHI codes, names and HEX values | Textile code coverage investigation | Archived 2022; completeness/current validity unconfirmed; rights unverified |
| https://github.com/pedroduke/pantone-tcx | Nearest TCX name/code/HEX via LAB matching | Candidate matching algorithm, subject to measurement limits | Repository describes ISC license; data provenance requires separate review |
| https://github.com/bconglet/Pantoner | 3,238 colors in JSON/CSV/YAML/XML | Interchange/print lookup investigation | Overlap with other sources; scope and permission unverified |
| https://github.com/adai-me/Pantone-color-libraries | Adobe `.acb` books including textile TCX | Import-format compatibility research | Treat actual color-book files as restricted pending express permission |
| https://github.com/BeefySerpent/Color-Book-AIR | Scraped FHI/Coloro/H&M data | Compare schemas only | Scraping provenance and redistribution rights require review |

Recommended implementation: accept authorized swatch catalogs through existing `src/core/pantoneLibrary.js` validator, expose searching and reference assignment in `src/components/PantoneColorLibrary.jsx`, keep provenance per record and clarify that HEX previews cannot certify dye or fabric color. An official complete factory Pantone library needs authorized current Pantone data and physical-swatch/lab-dip confirmation. Do not silently merge sources into a purported canonical official library; duplicates, revisions and systems can conflict.
