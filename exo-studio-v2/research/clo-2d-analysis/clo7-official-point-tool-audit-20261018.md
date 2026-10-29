# CLO official 2D pattern point and tool audit — October 18, 2026

Official-document-based EXO acceptance matrix. **Not a live CLO 7 certification.** `V`: function documented in cited official reference or linked catalog; `D`: derived EXO implementation/QA requirement; `U`: behavior/version-specific detail requires inspection on installed CLO. No production edits.

## Sources and version notes

- S1: https://support.clo3d.com/hc/en-us/articles/115012227067-Select
- S2: https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit
- S3: https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves
- S4: https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern
- S5: https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line
- S6: https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch
- S7: https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing
- S8: https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM
- S9: https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit

Additional official pages: https://support.clo3d.com/hc/en-us/articles/115012380008-Edit-Curvature ; https://support.clo3d.com/hc/en-us/articles/115012226527-Free-Sewing ; https://support.clo3d.com/hc/en-us/articles/115012381248-Segment-Sewing ; https://support.clo3d.com/hc/en-us/articles/115015714428-2D-Seam-Allowance ; https://support.clo3d.com/hc/en-us/articles/360025716814-Edit-2D-POM ; https://support.clo3d.com/hc/en-us/articles/360010960074-Ruler-Guidelines ; https://support.clo3d.com/hc/en-us/articles/115015735687-Edit-Notch-Properties ; https://support.clo3d.com/hc/en-us/article_attachments/48293801440281

**Shortcuts in the CLO September 2021 toolbar guide:** Transform Pattern A; Edit Pattern Z; Edit Curvature C; Edit Curve Point V; Add Point/Split Line X; Segment Sewing N; Free Sewing M; Edit Sewing B; Polygon H; Internal Polygon/Line G. These are historical references and are **U** for CLO 7 until tested.

**Curve distinction:** the August 2025 official guide https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves specifies Alt for independent handle change, Ctrl (Windows)/Command (Mac) to maintain handle angle, Alt-drag to create a Bézier and deleting handles. The Edit Curvature page documents dragging the segment itself. The staff response https://support.clo3d.com/hc/en-us/community/posts/20145738258201-Why-can-t-I-see-the-legs-of-my-curved-paths?page=1 warns curve points and Bézier handles did not work interchangeably in that documented 2023 behavior. Exact conversion in CLO 7 is **U**.

## Acceptance matrix

### Selection

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R001 | Select whole pattern via Transform Pattern | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R002 | Select boundary vertex via Edit Pattern | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R003 | Select boundary segment via Edit Pattern | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R004 | Double-click Edit Pattern to select full pattern | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R005 | Shift-select multiple editable items | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R006 | Marquee/lasso select patterns | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R007 | Highlight selected outlines and points distinctly | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R008 | Pick overlapping geometry intentionally | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R009 | Expose context menu for selected edge | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R010 | Transform pattern by translation | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R011 | Transform pattern by rotation | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R012 | Transform pattern by scale | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | D |
| R013 | Retain physical geometry under zoom | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | D |
| R014 | Fit selected pattern to window | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R015 | Fit all visible patterns | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R016 | Drag guide from ruler | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |
| R017 | Switch ruler among mm cm and inches | [S1](https://support.clo3d.com/hc/en-us/articles/115012227067-Select) | V |

### Pattern construction

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R018 | Create closed polygon | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R019 | Create rectangle pattern | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | U |
| R020 | Create ellipse pattern | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R021 | Maintain explicit outline vertices | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R022 | Maintain ordered boundary segments | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R023 | Add point on an existing segment | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R024 | Split segment into two | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R025 | Split segment by entered length | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R026 | Split segment by entered ratio | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R027 | Divide segment uniformly | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R028 | Reverse split interval direction | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R029 | Enter numeric length during drawing | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R030 | Apply Shift drawing angle constraints | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | U |
| R031 | Keep interior line geometry separate from outline | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R032 | Undo last point placement | [S2](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |

### Curvature and points

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R033 | Use Edit Curvature separately from Edit Pattern | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R034 | Use Edit Curve Point separately from Edit Curvature | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R035 | Drag straight segment to curve it | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R036 | Drag curved segment to alter bow | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R037 | Expose Bézier handles on segment point | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R038 | Drag handle endpoint to control tangent | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R039 | Alt drag one handle independently | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R040 | Ctrl or Command preserve handle angle | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |
| R041 | Alt drag segment point to create Bézier | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R042 | Render new Bézier handle pair | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R043 | Delete a Bézier handle | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R044 | Convert point to curve point via context action | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R045 | Insert curve point on edge | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R046 | Move interpolating curve point | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R047 | Delete interpolating curve point | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R048 | Keep cusp and smooth corner distinct | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |
| R049 | Preserve neckline silhouette on edit | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |
| R050 | Preserve armhole silhouette on edit | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |
| R051 | Recompute curved segment arclength | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | V |
| R052 | Avoid silently mixing curve-point and handle representations | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |
| R053 | Retain near-tangent continuity through a smooth join | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |
| R054 | Hit-test arc rather than endpoint chord | [S3](https://support.clo3d.com/hc/en-us/articles/115002753388-How-to-Edit-B%C3%A9zier-Curves) | D |

### Length and transformation

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R055 | Show selected segment length | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | V |
| R056 | Change Length through context command | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | V |
| R057 | Keep anchored endpoint explicit | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R058 | Accept exact movement values | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | V |
| R059 | Provide scale reference value | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R060 | Show pivot position for rotation | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | U |
| R061 | Transform selected segment independently | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | V |
| R062 | Move a selected point precisely | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | V |
| R063 | Do not alter unselected adjacent pieces | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R064 | Recalculate segment length after vertex move | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R065 | Recalculate length after handle edit | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R066 | Detect zero-length edge | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R067 | Detect outline self-intersection | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | D |
| R068 | Undo geometric change | [S4](https://support.clo3d.com/hc/en-us/articles/115012380108-Edit-Pattern) | V |

### Internal lines

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R069 | Create open internal polyline | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R070 | Double-click to finish internal line | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R071 | Create closed internal polygon | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R072 | Create internal rectangle | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | U |
| R073 | Create internal ellipse | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R074 | Add points to internal line | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R075 | Edit internal line control point | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R076 | Curve internal segment | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R077 | Snap internal endpoint to boundary | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R078 | Show center/fold line marking | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R079 | Create pattern instruction line | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R080 | Create Place on Fold marking | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R081 | Add pattern annotation | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R082 | Create clone as reference line | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R083 | Independently hide internal marks | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R084 | Maintain line's parent pattern | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | D |
| R085 | Mirror a construction line | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | V |
| R086 | Keep baseline and internal line types distinct | [S5](https://support.clo3d.com/hc/en-us/articles/115012226687-Internal-Polygon-Line) | D |

### Notches and allowances

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R087 | Add notch to outline | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R088 | Position notch by click | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R089 | Position notch by exact length split | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R090 | Add notch at existing point | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R091 | Add point to notch | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R092 | Select notch without selecting whole piece | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R093 | Drag notch along host edge | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R094 | Edit notch length | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R095 | Edit notch angle | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | U |
| R096 | Flip notch | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R097 | Edit notch type | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R098 | Retain notch attachment during geometry edit | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | D |
| R099 | Create seam allowance on edge | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R100 | Set allowance width | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R101 | Set allowance start extent | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R102 | Set allowance end extent | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R103 | Handle join/intersection options | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R104 | Regenerate automatic allowance on edit | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R105 | Toggle allowance visibility independently | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | V |
| R106 | Preserve original seamline separate from allowance | [S6](https://support.clo3d.com/hc/en-us/articles/115013214287-Create-Notch) | D |

### Sewing and topstitch

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R107 | Pair edges using Segment Sewing | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R108 | Create Free Sewing intervals | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R109 | Support pairing to internal lines | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R110 | Show sewing direction markers | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R111 | Detect reversed pair orientation | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | D |
| R112 | Offer Reverse Sewing action | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R113 | Show selected sewing pair | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R114 | Deactivate/activate sewing line | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R115 | Delete sewing relation | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R116 | Independently hide sewing lines | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R117 | Check sewing lengths | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R118 | Show length discrepancy | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R119 | Indicate red mismatch when above 1 mm | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R120 | Support multiple segment sewing | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | U |
| R121 | Support M:N Free Sewing | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | U |
| R122 | Maintain sewing association after curve modification | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | D |
| R123 | Keep physical notch separate from directional marker | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | D |
| R124 | Create Segment Topstitch | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R125 | Create Free Topstitch | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R126 | Move topstitch endpoint | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R127 | Set topstitch offset | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |
| R128 | Hide topstitch separately | [S7](https://support.clo3d.com/hc/en-us/sections/115000641848-Sewing) | V |

### Measurements and grading

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R129 | Expose physical ruler units | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | D |
| R130 | Create 2D POM | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R131 | Edit existing POM | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R132 | Attach POM to outline | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R133 | Attach POM to internal line | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R134 | Support grouped POM | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R135 | Report summed multi-segment measure | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R136 | Snap POM placement | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R137 | Use angle guide for measurement | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | U |
| R138 | Open POM browser data | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R139 | Update POM when geometry changes | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | D |
| R140 | Support grade-size dependent POM | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | U |
| R141 | Expose fixed notch grading | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R142 | Expose proportional notch grading | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | V |
| R143 | Retain measurement data after reload | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | D |
| R144 | Keep export true scale | [S8](https://support.clo3d.com/hc/en-us/articles/360025716774-Create-POM) | D |

### Linked editing and safety

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R145 | Create symmetric pattern | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R146 | Create symmetric pattern with sewing | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R147 | Create linked instance pattern | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | U |
| R148 | Mirror paste geometry | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R149 | Maintain explicit linked status | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R150 | Propagate linked modifications | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | U |
| R151 | Support pattern cut operations | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R152 | Support pattern merge | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |
| R153 | Retain references on edge split | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R154 | Retain references on point delete | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R155 | Serialize control handles | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R156 | Serialize curve points | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R157 | Serialize notches | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R158 | Serialize sewing pair direction | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R159 | Undo compound edit atomically | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R160 | Redo compound edit atomically | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R161 | Reject invalid geometry without corrupting document | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | D |
| R162 | Test saved garment reload | [S9](https://support.clo3d.com/hc/en-us/sections/115000617868-2D-Pattern-Edit) | V |

**162 distinct requirements; none currently marked EXO pass.**

## Live CLO 7 unknowns and test protocol

1. Record actual installed CLO version, edition, OS and opening each tool flyout; screenshot menu labels and keyboard mappings.
2. In one garment, draw neckline with two smooth cubics plus a sharp shoulder corner. Compare Edit Curve Point red points versus Bézier blue handles; test Alt, Ctrl/Command, conversion, deletion and undo.
3. Split the curved armscye by entered 25% and add two notches by exact millimeters. Change the outline, check notch migration, edit allowance widths, undo then redo.
4. Sew sleeve cap to armhole with Segment Sewing, inspect orientation arrows, reverse and restore. Repeat Free Sewing and M:N, check red mismatch when over 1 mm.
5. Create straight and curved POM lengths and grouped POM, switch mm/cm/in, move a geometry point and grade size; inspect browser and output values.
6. Save, close, reopen and compare shape coordinates, curve type, notch location, sewing orientation, POM and links. Repeat same sequence in EXO and record discrepancies.

## Evidence limits

The web and official support pages were reviewed; **native CLO application not directly opened or manipulated by this worker**. Acceptance items marked D are proposed engineering invariants, not source claims about CLO internals. Some official documentation predates newer Bézier methods and exposes legacy menu paths. Release-specific UX and any assertions of functional parity remain unverified.

