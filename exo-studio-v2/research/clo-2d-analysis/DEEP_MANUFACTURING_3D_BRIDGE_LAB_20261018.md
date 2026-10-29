# EXO Manufacturing and 3D Bridge Engineering Laboratory

**Date:** 2026-10-18. **Scope:** source-inspected EXO 2D DXF, grading, marker and PDF subsystems, and proposed manufacturing/3D bridge architecture. **Evidence key:** [I] inspected repository, [D] external documentation, [P] proposed engineering design, [U] unverified parity. External links are reference entry points; their latest contents were not independently fetched in this run.

## 01. DXF exchange contract

**Engineering question.** How can dxf exchange contract maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 02. DXF entity parsing

**Engineering question.** How can dxf entity parsing maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6673-10r24.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 03. Unit and coordinate semantics

**Engineering question.** How can unit and coordinate semantics maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6193-16r21.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 04. Closed contour recognition

**Engineering question.** How can closed contour recognition maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://clo3d.com/en/. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 05. Spline and bulge reconstruction

**Engineering question.** How can spline and bulge reconstruction maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Specific implementation:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Verification protocol:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.marvelousdesigner.com/products/release. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 06. Notches and drill marks

**Engineering question.** How can notches and drill marks maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Specific implementation:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Verification protocol:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.w3.org/TR/SVG2/paths.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 07. Internal construction geometry

**Engineering question.** How can internal construction geometry maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://docs.blender.org/manual/en/latest/modeling/meshes/retopology/index.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 08. AAMA and ASTM semantics

**Engineering question.** How can aama and astm semantics maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 09. DXF export sampling

**Engineering question.** How can dxf export sampling maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6673-10r24.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 10. Roundtrip loss accounting

**Engineering question.** How can roundtrip loss accounting maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6193-16r21.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 11. Native versus JavaScript implementation

**Engineering question.** How can native versus javascript implementation maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Specific implementation:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Verification protocol:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://clo3d.com/en/. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 12. Malformed input containment

**Engineering question.** How can malformed input containment maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Specific implementation:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Verification protocol:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.marvelousdesigner.com/products/release. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 13. Canonical pattern graph

**Engineering question.** How can canonical pattern graph maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.w3.org/TR/SVG2/paths.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 14. Seam correspondence

**Engineering question.** How can seam correspondence maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://docs.blender.org/manual/en/latest/modeling/meshes/retopology/index.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 15. Constraint propagation

**Engineering question.** How can constraint propagation maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 16. Curve arclength parametrization

**Engineering question.** How can curve arclength parametrization maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6673-10r24.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 17. Seam allowance offsetting

**Engineering question.** How can seam allowance offsetting maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Specific implementation:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Verification protocol:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6193-16r21.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 18. Grading anchor points

**Engineering question.** How can grading anchor points maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Specific implementation:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Verification protocol:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://clo3d.com/en/. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 19. Grading rules and size charts

**Engineering question.** How can grading rules and size charts maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.marvelousdesigner.com/products/release. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 20. Points of measure

**Engineering question.** How can points of measure maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.w3.org/TR/SVG2/paths.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 21. 3D panel triangulation

**Engineering question.** How can 3d panel triangulation maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://docs.blender.org/manual/en/latest/modeling/meshes/retopology/index.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 22. Remeshing and vertex identity

**Engineering question.** How can remeshing and vertex identity maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 23. 2D to 3D barycentric mapping

**Engineering question.** How can 2d to 3d barycentric mapping maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Specific implementation:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Verification protocol:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6673-10r24.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 24. Simulation rest metrics

**Engineering question.** How can simulation rest metrics maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Specific implementation:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Verification protocol:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6193-16r21.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 25. Sewing graph to mesh binding

**Engineering question.** How can sewing graph to mesh binding maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://clo3d.com/en/. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 26. 3D to 2D edit synchronization

**Engineering question.** How can 3d to 2d edit synchronization maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.marvelousdesigner.com/products/release. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 27. Fabric width and grainline

**Engineering question.** How can fabric width and grainline maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.w3.org/TR/SVG2/paths.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 28. Marker nesting objective

**Engineering question.** How can marker nesting objective maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://docs.blender.org/manual/en/latest/modeling/meshes/retopology/index.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 29. Marker placement validation

**Engineering question.** How can marker placement validation maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Specific implementation:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Verification protocol:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 30. PDF plotting scale

**Engineering question.** How can pdf plotting scale maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Specific implementation:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Verification protocol:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6673-10r24.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 31. PDF pagination and registration

**Engineering question.** How can pdf pagination and registration maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6193-16r21.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 32. Tech pack generation

**Engineering question.** How can tech pack generation maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://clo3d.com/en/. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 33. Manufacturing tolerances

**Engineering question.** How can manufacturing tolerances maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.marvelousdesigner.com/products/release. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 34. Factory approval gates

**Engineering question.** How can factory approval gates maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.w3.org/TR/SVG2/paths.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 35. Continuous integration fixtures

**Engineering question.** How can continuous integration fixtures maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Specific implementation:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Verification protocol:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://docs.blender.org/manual/en/latest/modeling/meshes/retopology/index.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 36. Release qualification

**Engineering question.** How can release qualification maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Specific implementation:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Verification protocol:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://help.autodesk.com/view/OARX/2025/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 37. Failure injection and fuzzing

**Engineering question.** How can failure injection and fuzzing maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Specific implementation:** **Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Verification protocol:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6673-10r24.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 38. Reference parity methodology

**Engineering question.** How can reference parity methodology maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Algorithm:** Define a versioned intermediate representation with immutable piece IDs, explicit unit scale, directed boundary loops, analytic line/arc/cubic segments, notch attachments by edge ID plus normalized arclength, and sewing relations keyed by stable edge intervals. Parse source into a temporary transaction, validate all references and finite coordinates, then atomically publish the converted document.

**Specific implementation:** **Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Verification protocol:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.astm.org/d6193-16r21.html. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 39. Performance benchmark protocol

**Engineering question.** How can performance benchmark protocol maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Decision:** Preserve source entity/layer/block metadata and original precision alongside normalized centimeter geometry. Every conversion must emit a machine-readable loss report covering unsupported DXF entities, approximated curves, discarded blocks, orphan marks and broken sewing relationships. Reject critical semantic loss at manufacturing export.

**Specific implementation:** **Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Verification protocol:** **Factory gate:** Record project revision, CAD engine revision, unit convention, size table revision, source hash, tolerance policy and acceptance results in a release manifest. The gate fails on invalid topology, unpaired required seam, grading discontinuity, unmatched notch, out-of-bounds marker, non-1:1 plot or missing measurement tolerance.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://clo3d.com/en/. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## 40. Prioritized implementation roadmap

**Engineering question.** How can prioritized implementation roadmap maintain dimensionally valid garment manufacturing data across 2D CAD, cloth simulation, and factory handoff?

**Test:** Use fixtures for a rectangular panel, cubic armhole, nested contours, mirrored sleeve, seam allowance, notches, drill marks, graded sizes, corrupt coordinates and an empty file. Compare topology, signed area, bounds, segment arclength and piece identity after export/import. For curves sample at adaptively chosen chord-error tolerance; never accept visual similarity as dimensional parity.

**Specific implementation:** **Failure case:** A closed polyline can represent a cut contour, internal hole or arbitrary annotation. Classification must use containment, winding, layer semantics and explicit author metadata; geometric closure alone is insufficient. Flag ambiguous classification for operator review rather than silently turning every loop into a cut piece.

**Verification protocol:** **Evidence:** `native_cpp/core/dxf_import.cpp` enforces a 24 MiB input limit, two million group-code pairs, 100,000 entities, 512 closed patterns and explicitly states that ASTM sewing graphs are not reconstructed. `src/core/dxf.js` exposes `projectToDxf` and a closed-outline import path. These facts establish geometry exchange as implemented and semantic garment exchange as incomplete.

**Acceptance threshold:** Explicit dimensional tolerances must be specified per material and production process. Default numerical checks should require finite values, closed boundary loops, consistent orientation and deterministic serialization; dimensional tolerances must never be invented as universal factory standards.

**Traceability:** [I] `native_cpp/core/dxf_import.cpp`, `native_cpp/core/dxf_export.cpp`, `src/core/dxf.js`, `src/core/grading.js`, `native_cpp/core/marker_pdf.cpp`, `src/core/marker.js`. [D] https://www.marvelousdesigner.com/products/release. [P] Proposed acceptance workflow; [U] CLO/ASTM full parity remains unverified.

## Cross-system release matrix

| Deliverable | Mandatory evidence | Blocking condition |
|---|---|---|
| DXF | Roundtrip fixtures, loss manifest, unit audit | Unexplained scale drift or topology loss |
| Grading | POM per size, rule provenance | Non-monotonic critical POM |
| 3D | Stable panel/mesh map, rest-shape metrics | Missing or inverted triangle mapping |
| Marker | Placement bounds, overlap proof, grainline | Invalid fabric placement |
| PDF | 100% print calibration, registration checks | Printer scaling ambiguity |
| Techpack | Revision, BOM, construction and tolerances | Missing manufacturing specification |

## Repository verification commands

```sh
node scripts/dxf-roundtrip-check.mjs
node scripts/check-native-cpp-dxf-import.mjs
node scripts/check-dxf-construction-fidelity.mjs
node scripts/check-native-cpp-grading.mjs
node scripts/check-native-cpp-marker-pdf.mjs
node scripts/check-techpack-portable-html.mjs
```

These commands are proposed verification entry points and are not claimed to have passed during this document authoring.
