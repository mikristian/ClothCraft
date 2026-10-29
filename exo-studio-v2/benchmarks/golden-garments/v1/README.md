# EXO Golden Garment Benchmark Library — v1

This is a **frozen development-regression library**, not an industrial certification collection. It contains 25 deterministic JSON fixtures covering five garment categories, each with a six-size XS–XXL run (150 graded size cases). No fixture claims an externally approved physical garment, proprietary CAD design, or factory production status.

## Inventory

| Category | Cases | Basis | Limitation |
|---|---:|---|---|
| T-shirt | 5 | EXO Foundation Tee draft | Development body/neck/sleeve fit |
| Trousers | 5 | EXO Straight Pants draft | Construction not factory-approved |
| Jackets | 5 | EXO Hoodie/Zip Hoodie drafts | Hooded-top **proxies**, not tailored-jacket patterns |
| Dresses | 5 | EXO A-line Skirt drafted panels | Elongated skirt-derived **proxies**, not complete bodice/dress |
| Complex curved | 5 | EXO tee, hoodie, zip and pants curved pieces | Curved-construction regressions, not receiving-CAD approvals |

Each fixture includes authored piece vertices, curve controls, stitching/seam references, grainline orientation, cut quantity, physical seam allowances, edge allowances, notches, internal lines, six-size grading rules, fabric width and spacing settings, and source-generated expected graded CUT areas/vertex/curve/notch counts. Data is fixed and SHA-256 locked by `manifest.json`. Some fixtures inherit no notches from their original templates; notch-bearing fixtures are explicitly represented.

## Required gate

`npm run qa:golden-garments`

This command validates inventory and SHA-256 digests, grades all 25 garments across six sizes, checks topology and CUT area within 0.002 cm², validates notch multiplicity, and strictly parses generic R12 manufacturing DXFs including mm units and size labels. `scripts/check-golden-garments-20261028.test.mjs` also proves changed and missing fixtures are detected. The gate is included in `.github/workflows/public-ci.yml` on pushes and pull requests.

The library must be immutable within its version. To intentionally change reference geometry, create a separately reviewed `v2` collection with explicit technical justification and preserve `v1` for historical comparisons. Do not casually run the builder: `node scripts/build-golden-garments-20261028.mjs` replaces version-1 reference files and requires review and re-approval before committing.

## Outstanding industrial acceptance

Passing the golden gate is **not** proof of full Lectra Modaris, Optitex or Gerber interchange; genuine receiver-specific AAMA/ASTM import/export, grading correspondence, factory-approved seam balance, machine cutter driver, notch/drill execution, print scaling and physical production samples all remain separate gates. A representative library is not the same as a collection of independently validated production blocks. In particular, the current jacket/dress categories need purpose-drafted verified garments for genuine industrial parity.
