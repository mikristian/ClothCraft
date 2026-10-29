# CLO garment source-curved preview pipeline

## Implemented

The garment library contains **CLO Male T-Shirt · Source Pattern**, a separate,
editable **seven-cut** garment template. Its single-garment 3D hover preview shows
the *real exported CLO 3D triangles*, including semi-curved front, back,
left and right sleeves and three neck pieces. Pattern drafting geometry and
preview geometry are separate source data with matching original CLO group IDs.
The preview renders **one of each original mesh**, not three copies of the
whole shirt. It opens in a separated seven-panel inspection arrangement so
all components are visible; `CLO placement` restores their exact export pose.
Both arrangements keep the original source mesh curvature and stitch guides.
The camera can rotate around this single scene.

The original garment in the installed CLO 7.0.242 environment was
`Male_T-shirt.zpac`. The approved workspace copy of the saved native project
is `../garment-studio/research/clo-reference/live-audit-20261014/current-autosave-COPY.zprj`;
it contains `autosave.zpac`, extracted without modifying the ZIP to
`research/clo-garment-source/Male_Tshirt-autosave-extracted.zpac`.
The source-specific CLO 3D and 2D data also had been exported through the
official CLO interface on October 14. Those sanctioned OBJ/XML and DXF
exports are the input to this feature; the native ZPAC binary has not been
reverse-engineered into a complete cross-garment pattern importer.

## Reusable garment conversion contract

For each other garment, export OBJ and XML sewing metadata from CLO and run:

```sh
node scripts/extract-clo-garment-preview.mjs \
  /path/to/garment.obj \
  public/garment-previews/my-garment.v1.json \
  /path/to/garment_meta_data.xml
```

The converter is generic across CLO OBJ groups. It preserves actual 3D
vertex positions (mm), UVs, indexed faces, 1-based source OBJ vertex IDs,
named groups, reference bounds, and original sewing pair vertex sequences.
No smoothing, seam reconstruction or drape result is fabricated. The
reusable renderer `src/core/cloGarmentSourcePreview.js` reads this format,
builds Three.js surface meshes, source cut-edge outlines, and optional
native stitch-path overlays. A corresponding editable 2D pattern document
can reference this preview through `project.cloReference.previewAsset`.

In the current T-shirt case, the 2D document is a separate cloned copy of
`src/data/cloMaleTshirtPattern.json`, normalized from CLO ASTM-DXF.
Seven source contours map to the seven OBJ groups via `sourceCloBlock`.
The preview fixture is `public/garment-previews/clo-male-tshirt.v1.json`.

## Source provenance and QA

The original CLO OBJ has **3,661 source vertices, 6,876 triangles and seven
named mesh groups**, with **23 source sewing groups / 182 ordered stitch
sample correspondences** in its XML. The original front/back and sleeves
already have nonzero 3D depth; these are the authored source shapes, not a
procedurally manufactured cylinder and not the foundation tee preview pose.
The output is intentionally marked `simulatedFitCertified:false`.

Run:

```sh
node scripts/check-clo-garment-source-preview.mjs
npm run build
EXO_QA_URL=http://127.0.0.1:5194 node scripts/qa-clo-garment-source-preview.mjs
```

Corrected seven-panel visual snapshots are in
`research/screenshots/clo-garment-single-preview-20261017/single-1440.png`
and `single-390.png`. The new reference is accessible via the garment
library's T-Shirts folder as well as the all-garments list. It does not
replace the separately working Foundation Tee or overwrite other drafts.

## Scope of this release

This **reproduces the staged, curved CLO snapshot** from the actual source
mesh. Imported 2D cut contours remain editable. Their edits do not yet
deform the original reference OBJ in real time. CLO's original seams are
retained as visual source paths and provenance; they are *not* promoted
automatically to fitted solver constraints. The experimental 947-partial-seam
candidate and 120-frame solver audit from October 14 remain explicitly
uncertified. A production garment simulation will require source-to-edited
pattern topology updates, verified stitch resampling, 3D assembly and body
contact validation.
