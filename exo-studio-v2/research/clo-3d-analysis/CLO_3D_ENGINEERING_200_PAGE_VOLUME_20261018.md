# EXO 3D Garment Engineering — Volume II: 200 Numbered Technical Research Sections

**2026-10-18 · Research and implementation specification, not a CLO solver reconstruction or manufacturer certification.** Each numbered section is a logical page, not a guaranteed typeset sheet. Labels: **V** verified local code or measured report; **D** public product documentation/research; **E** proposed engineering; **U** unverified commercial internals.

## Source and evidence map

- CLO official fit maps: https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps
- CLO strain map: https://support.clo3d.com/hc/en-us/articles/56500755006617--Fit-Map-Strain-Map
- Marvelous Designer simulation modes and CPU/GPU notes: https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation
- Marvelous Designer recent releases: https://www.marvelousdesigner.com/products/release
- Baraff and Witkin, implicit anisotropic cloth: https://publications.ri.cmu.edu/large-steps-in-cloth-simulation
- Incremental Potential Contact research: https://ipc-sim.github.io/
- CLO inspector and actual exported seam metadata: `docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md`
- EXO existing first volume: `research/clo-3d-analysis/CLO_3D_WINDOW_125_PAGE_ENGINEERING_RESEARCH_20261018.md`.

**Measured baseline (V):** CLO sample export 7 patterns/23 seam groups/182 correspondences, arranged worst seam gap 36.804 cm. EXO Thomas improved preassembly worst gap 18.742 cm, but the EXO PPF gate is ≤3 cm. Do not treat any curved visual preview as a collision-certified solver state.

## Competitive benchmark and release governance

**CLO’s published fit maps** include stress, strain, fit and pressure visualizations, but the public help pages do not disclose a reproducible constitutive-law implementation or industrial error bounds. The manufacturer-accuracy target must be determined by paired real fabric and completed garment specimens, not by matching displayed colors. See https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps and https://support.clo3d.com/hc/en-us/articles/56500755006617--Fit-Map-Strain-Map.

**Marvelous Designer’s documented simulation profiles** distinguish quality/performance and CPU/GPU execution. The release page introduces brush pinching, a pinching override and experimental seam ripping in 2026.1; these are competitive feature examples rather than proof of solver formulation, accuracy or performance on EXO hardware. See https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation and https://www.marvelousdesigner.com/products/release.

**Research baselines** must include implicit anisotropic dynamics (Baraff & Witkin, 1998: https://publications.ri.cmu.edu/large-steps-in-cloth-simulation) and barrier-based collision-safe dynamics (IPC: https://ipc-sim.github.io/). Benchmarks must establish the actual advantages and risks of each method at identical mesh size, textile properties, contact conditions and hardware.

### Non-negotiable cross-cutting acceptance gates

| Gate | Required record | Reject when |
| --- | --- | --- |
| Mesh conditioning | Minimum area, minimum angle, max aspect, singular-value bounds | Degenerate and badly conditioned elements enter an implicit solve |
| Initial sewing arrangement | Pair-wise seam gap max/p95/mean, sewn arclength mapping | EXO PPF worst gap > 3 cm for its documented standard profile |
| Static contact | Swept segment/triangle against real posed avatar and cloth | Any invalid initial or swept intersection |
| Dynamic contact | Per-frame CCD, penetration by body region and layer | Untested contact trajectory or hidden tunneling |
| Physical strain | Warp/weft/shear measurements and map calibration | Unmeasured textile calibration or unexplained strain spikes |
| Energy and convergence | Residual norms, condition estimates, line-search result | NaN/Inf, failure to converge or silent projection artifacts |
| Performance | Same fixtures on CPU/GPU, timing distribution, memory | Performance improvement sacrifices certified validation gates |
| Manufacturing validation | Physical garment sample, dimensions, repeat washes, tolerances | Sole evidence is a screenshot or uncalibrated simulation |

### Proposed system decomposition

`Pattern CAD source → metric mesh + persistent seam graph → anatomical arrangement optimizer → collision-safe physically admissible initial pose → staged sewing solver → validated shell simulation → fit analytics → calibrated physical sample comparison → versioned manufacturing export.`

The interaction layer retains orbit and editing responsiveness during long solver operations by reading immutable accepted snapshots; its preview state is clearly marked and cannot change physics input until an explicit geometry/arrangement transaction is committed. Each data transition has provenance and undo/redo semantics.


## Detailed algorithmic design decisions (architectural baseline)

### D1. Textile rest metric and anisotropic strain

For every triangle store 2D cutting coordinates `U=[u1,u2,u3]` in physical metres and current world coordinates `X=[x1,x2,x3]`. Let `Dm=[u2-u1,u3-u1]` be the rest 2×2 edge matrix, let `Ds=[x2-x1,x3-x1]` be the world 3×2 matrix. The deformation gradient `F=Ds*inv(Dm)` maps unit yarn directions to 3D. For warp `a=(cos θ,sin θ)`, weft `b=(-sin θ,cos θ)`, directional stretches are `λwarp=||F a||`, `λweft=||F b||`. Bias deformation requires measuring off-axis shear, e.g. `gamma=(Fa·Fb)/(||Fa||||Fb||)` or a calibrated Green strain tensor. The constitutive energy must fit lab extension and shear curves with loading/unloading hysteresis where relevant. An `Ewarp,Eweft` pair alone is not a complete textile model: bending, viscoelastic damping, fabric thickness, surface friction, yarn coupling and environmental state remain separate inputs. Handle near-singular `Dm` by rejecting/repairing elements, not numerical clipping followed by production approval.

### D2. Implicit integration and Newton residual

Define mechanical energy `E(x)` and mass matrix `M`. For implicit Euler, use a position-space minimization `Φ(x)=1/(2h²)(x-xpred)^T M (x-xpred)+E(x)` with `xpred=xn+h vn+h² M⁻¹ fext`; account for damping and imposed constraints consistently. Newton solves `H(xk) Δx=-∇Φ(xk)`. Global linear algebra must detect indefiniteness, poor conditioning, nonfinite residuals, and large search directions. Backtracking line search must preserve minimum admissible contact distances and positive rest-oriented triangle Jacobians. Publish residual norms and accepted line-search step; a solver returning finite numbers without convergence does not establish accurate force equilibrium. The Hessian may require PSD projection or modified Newton regularization; document the energy alteration this introduces rather than implying exactness.

### D3. XPBD preview solver versus physical final solver

XPBD is useful for low-latency manipulation when cloth constraints are expressed as energy-equivalent compliance. The update per constraint `C(x)` has approximate multiplier increment `Δλ=(-C(x)-α̃ λ)/(Σ wi||∇i C||²+α̃)`, `α̃=α/h²`; move particle `i` by `wi∇i C Δλ`. Material parameter mapping to measured tensile and bending behavior requires calibration and resolution tests. Per-iteration constraint projection does not guarantee true contact-safe motion between frames. Use XPBD as an interactive mode only if its quality envelope is explicitly measured, and a higher-confidence backend validates accepted garment samples. GPU parallel ordering or graph coloring changes convergence; regression thresholds must account for it.

### D4. Barrier contact, continuous collision and friction

For every candidate contact pair compute unsigned distance and a consistent separation normal; exclude topologically adjacent primitive pairs and intentional contacts. An IPC-style barrier uses a potential that diverges near forbidden gaps, while CCD computes a maximum safe step fraction along the current update. Self-collision tests need vertex-face and edge-edge cases; avatar collision needs the real deformed/skinned triangle mesh at matched time. Contact gradients on extremely thin geometry are sensitive to normal orientation, thickness and broadphase omissions. Contact forces cannot repair a missed swept intersection after the fact. Friction demands a history-aware tangential law, preferably regularized Coulomb with a quantified stick-slip transition. Never assert IPC guarantees if only a heuristic vertex projection was implemented.

### D5. Seam pairing by material arclength

Every sewing relation is an ordered pair of boundary curves, with `SewingSegment {id, patternA, intervalA, directionA, patternB, intervalB, directionB, easingRule}`. Sample by normalized arclength rather than pairing arbitrary triangulation indices. Maintain IDs through splitting, graded changes, point deletion and remeshing. Define residuals `ri=||xA(si)-xB(ti)||` and report mean, p95 and maximum; include seam tangent orientation and wrong-side seam reversal. For gathering, sample unequal lengths according to explicit ease ratios and potentially a nonuniform ease profile. Physically sewn seams are constraints or stiff energy couplings; colored viewport threads merely visualize correspondences and should never be treated as evidence of closure.

### D6. Body-relative preassembly as constrained continuation

Use anatomical target frames from the posed avatar: torso cross-section loops, left/right clavicle arcs, neckline, shoulder caps, armhole curves and sleeve longitudinal axes. Begin with expanded nonintersecting placement and reduce clearance in stages while solving a constrained optimization over panel rigid transforms plus low-distortion shape adjustments. Minimize `wseam Σ ri² + wskin Eclearance + wdistortion Estrain + worient Eflip + wlandmark Etarget`. Hard constraints prevent body/self intersections, invalid panel orientation and excessive rest-metric deformation. Perform swept feasibility testing for each candidate movement. The existing Thomas EXO benchmark with max initial gap 18.742 cm against ≤3 cm proves that a visually curved starting arrangement alone is insufficient; do not relax the acceptance gate in order to make screenshots look successful.

### D7. Adaptive remeshing and ID preservation

Adaptive refinement criteria can combine screen-independent geometric curvature, membrane strain variation, contact proximity, and solver error indicators. Avoid modifying 2D production cutting contours when remeshing physical triangle interiors: preserve an exact map from simulation vertices to immutable source piece UV positions and source boundary curve arclengths. At a remesh, transfer momentum and other state conservatively, regenerate seam constraints from material coordinates, rebuild contact broadphase, and validate mass and energy jumps. Mesh-resolution independence is evaluated by convergence on fixed physical fixtures, not simply by similar silhouettes. Ill-conditioned triangles cannot be hidden by a larger solver iteration count.

### D8. Material parameter identification from physical tests

For each lot and fabric orientation collect areal density, uniaxial force-extension in warp and weft, bias extension or picture-frame shear, bending (cantilever and/or bending moment), compression/thickness, static and kinetic friction against skin and fabric, and repeatability under cycles. Use explicit sample conditioning (humidity/temperature), gauge size, loading rate, and preconditioning. Fit model parameters with regularization and hold out unseen tests: `θ*=argminθ Σj wj ||predictedj(θ)-measuredj||² + λR(θ)`. Use confidence intervals, parameter covariance and provenance. Do not claim a material is calibrated because two visual drapes resemble a reference image. Show measured-vs-predicted plots and explain extrapolation limits.

### D9. Fit-map semantics, uncertainty, and diagnostics

Stress (force per area), strain (relative deformation), garment fit/tightness classification, and normal pressure on the body are different observables. Provide selectable warp/weft/bias strain, principal stress, contact normal pressure (kPa), tangential friction force and layer-to-layer contact. A map should have fixed or calibrated legend ranges, colorblind-accessible palette, explicit physical units, and uncertainty around material limits. Display spatial sampling/resolution and whether the map is from live preview, verified simulation or physical measurement. CLO publishes these as distinct fit-map families; do not claim EXO’s heuristics are numerically equivalent without controlled tests.

### D10. Coupled rendering, picking and solver snapshots

Maintain immutable scene snapshots tagged by `documentRevision`, `simulationRevision`, `time`, `avatarPoseId`, `topologyRevision` and active backend. The renderer may interpolate positions only between frames of compatible topology and state, without inventing a collision-certified intermediate trajectory. Attachment-driven seam lines, internal lines, foam pads and measurement anchors should store source UV/barycentric references so that they follow actual cloth motion. Picking should prioritize visible unlocked semantic objects, respecting depth with a small documented bias for near-surface overlays. Camera actions cannot silently alter physical placement. Long-running solver jobs should not block orbiting, hide failure metrics or repaint stale geometry as accepted output.

### D11. Competitive evaluation protocol

To claim superiority to CLO, Marvelous Designer, Browzwear, Optitex or other garment CAD tools, reproduce comparable input patterns, body mesh, exact material mechanical properties, sewing graph, layering, poses and export settings. Compare across five dimensions: (i) physical fit error against measured garments, (ii) usability time for documented design workflows, (iii) runtime and GPU/CPU resource use at matched error tolerance, (iv) technical production format fidelity, and (v) stability across sizes and body poses. Report confidence intervals and independent sample counts. Exact commercial internal algorithms are unknown unless officially disclosed. Publish reproducible fixtures and fail results transparently; benchmark wins in a single dimension are not universal superiority.

### D12. Verified build and QA milestone sequence

**Milestone M0:** single source-of-truth geometry, seam ID contract, finite-unit tests and machine-readable acceptance reports. **M1:** high-quality rest tessellation, conditioned anisotropic elastic model and material identification tests. **M2:** body-relative seam-aware initialization passing collision/strain/preflight. **M3:** solver coupling with CCD, seam convergence and body/self contact, including deliberately pathological cases. **M4:** accurate multi-size avatar motion and 3D sewing/guide tooling with undo, save and direct installed UI QA. **M5:** paired physical garment fitting and dimension validation with real manufacturing tolerances. **M6:** optimization and extensibility after comparable accuracy has been shown. Each milestone must end with a regression suite and explicit unsolved evidence, not a claim that feature icons, visually pleasing motion or a saved render certify production readiness.


## Additional competitor and open-research comparison

A rigorous competitive evaluation must include **Browzwear VStitcher** and **Optitex**, not only CLO and Marvelous Designer. Browzwear documents pressure/tension maps and side-by-side multi-size garment comparison; Optitex documents fabric measurement tooling and simulation connected to pattern editing. These are concrete workflows worth implementing and benchmarking, not proof of any proprietary solver algorithm. Sources: https://help.browzwear.com/en/articles/13065270-3d-window-details ; https://help.browzwear.com/en/articles/13065807-3d-review-workspace ; https://help.browzwear.com/en/articles/13854342-tension-map ; https://help.browzwear.com/en/articles/13854350-pressure-map ; https://optitex.com/products/fabric-management/ ; https://optitex.com/products/2d-and-3d-cad-software/.

Open scientific options require measured comparisons rather than vendor-inspired guessing. Macklin et al.'s XPBD method explicitly addresses timestep/iteration stiffness dependence relative to basic PBD (https://mmacklin.com/xpbd.pdf). Narain et al.'s anisotropic adaptive remeshing uses curvature and velocity gradients (https://doi.org/10.1145/2366145.2366171). Codimensional IPC adds thickness-aware contact and anisotropic strain-limiting barriers (https://arxiv.org/abs/2012.04457), with reference code at https://github.com/ipc-sim/Codim-IPC. Compare these methods on identical constrained garments, then choose hybrid preview and verified solver modes based on quantified accuracy.

**Competitive innovation proposals (E)**: live physical accuracy/confidence display; reversible pre-assembly optimizer with certified collision path; user-calibrated fabric library with measured uncertainty; real-time garment-versus-body arclength discrepancy visualization; side-by-side graded garments with stable matching landmarks; deterministic regression files that accompany manufacturing exports. These would provide meaningful value beyond tool-count parity, if implemented and independently validated.

## Architecture decision register and acceptance matrix

| Subsystem | Proposed algorithm/data design | Independent acceptance | Current risk / dependency |
| --- | --- | --- | --- |
| Canonical source model | Immutable pattern segment/arclength IDs; exact UV cm↔metre conversion | 2D/3D picking same ID; edits undo/reload without drift | Core source of truth before contact physics |
| Pattern metric mesh | Boundary-conforming constrained triangles; quality controls; source UV provenance | Min angle and aspect histograms; no degenerate elements | Fix historical sleeve/front/back sliver conditioning |
| Anisotropic textile law | Warp-weft material frame, nonlinear load curves, bias shear, hysteresis | Out-of-sample force-vs-displacement and drape sample tests | Do not infer mechanics from photographic textures |
| Shell and bending | Rest curvature and bending energy with thickness and directional stiffness | Cantilever/loop drape plus timestep and resolution convergence | Must balance crease detail against numerical conditioning |
| Seam graph | Arclength-parametrized edge-to-edge constraints with ease/gather profiles | Residual histogram, orientation and correspondence conservation | Do not bridge invalid edge indices |
| Body arrangement | Avatar torso-section and shoulder/arm-relative local frames | Same resting design across three poses and sizes | Use actual skin collider rather than cylinder approximation |
| Preassembly optimizer | Staged constrained minimization with body clearance, seam penalties, strain budget | Worst stitch pair <=3cm for existing PPF profile, 0 intersections | Historical best 18.742cm is still failing |
| CCD and contact | Vertex-face and edge-edge swept queries; thickness-aware barrier | Frame-by-frame 0 unsafe intersections at exact swept paths | No endpoint-only or vertex-only acceptance |
| Friction and layer depth | Tangential Coulomb model, two-sided cloth, layer exclusions | Incline-slide, sleeve-on-torso and lining-skin fixtures | Incorrect sign/contact normals can invert the garment |
| GPU execution | Batched constitutive/contact kernels; deterministic state snapshots | CPU/GPU parity and accuracy-v-runtime frontier | Never reduce collision checks for speed silently |
| Solver convergence | Implicit line search with residual and energy logging; failure rollback | Stable 10k steps and bounded error across step sizes | Finite values are necessary but insufficient |
| Foam and hardware | Independent volumetric pad law, mesh attachments and rigid trim collisions | Compression-recovery loops and zipper/button anchor retention | Visual 3D overlay is not coupled physical solver |
| Scene renderer | Canonical avatar+garment snapshots, layer graph, PBR and normal/tangent fidelity | Screenshot and geometry consistency at every stage | Preview bend cannot be marked physical fit |
| 3D editing | Explicit pointer ownership, constrained transforms, semantic selection | Click/drag/cancel for every tool, near-surface occlusion QA | Interaction cannot silently mutate source material geometry |
| Anatomical guides | Surface geodesics and torso sections anchored to semantically tagged landmarks | Center front/back, chest, waist, navel and shoulder survive pose | Body guide is not garment sewing line |
| Fit analytics | Signed pressure, directional stress/strain and contact-location maps | Calibration versus known mechanical response and instrumented sample | Stress, strain, tightness and pressure have different units |
| Validation suite | Physical garment and ASTM/ISO-aligned sample-specific tests | Independent holdout specimens, per-size confidence intervals | A garment screenshot does not establish manufacturability |
| Interoperability | Grading, notches, seam allowance and BOM propagation into DXF/tech pack | Lossless semantic roundtrip, toleranced dimensions | Rendered mesh is not a production pattern export |
| Performance | Adaptive mesh LOD, warm-start and profiling of contact/solve/render | Bounded FPS variance, peak RAM/VRAM and quality stability | Speed benchmark must hold accuracy fixed |
| Competitive evidence | Comparable garments in CLO/MD/VStitcher/Optitex and EXO | Identical material/avatar/pose, quantitative error and usability | Better-than-all claim requires independent measurements |


## Index
- 001. Canonical 2D-to-3D state: Requirements and invariants
- 002. Canonical 2D-to-3D state: Data layout and type safety
- 003. Canonical 2D-to-3D state: Input preprocessing and validation
- 004. Canonical 2D-to-3D state: Mathematical formulation
- 005. Canonical 2D-to-3D state: Discretization and numerical conditioning
- 006. Canonical 2D-to-3D state: Algorithm choices and tradeoffs
- 007. Canonical 2D-to-3D state: Iterative solution pseudocode
- 008. Canonical 2D-to-3D state: GPU execution and parallelism
- 009. Canonical 2D-to-3D state: Failure modes and recovery
- 010. Canonical 2D-to-3D state: Acceptance tests and measured deliverables
- 011. Pattern meshing and metric: Requirements and invariants
- 012. Pattern meshing and metric: Data layout and type safety
- 013. Pattern meshing and metric: Input preprocessing and validation
- 014. Pattern meshing and metric: Mathematical formulation
- 015. Pattern meshing and metric: Discretization and numerical conditioning
- 016. Pattern meshing and metric: Algorithm choices and tradeoffs
- 017. Pattern meshing and metric: Iterative solution pseudocode
- 018. Pattern meshing and metric: GPU execution and parallelism
- 019. Pattern meshing and metric: Failure modes and recovery
- 020. Pattern meshing and metric: Acceptance tests and measured deliverables
- 021. Anisotropic material mechanics: Requirements and invariants
- 022. Anisotropic material mechanics: Data layout and type safety
- 023. Anisotropic material mechanics: Input preprocessing and validation
- 024. Anisotropic material mechanics: Mathematical formulation
- 025. Anisotropic material mechanics: Discretization and numerical conditioning
- 026. Anisotropic material mechanics: Algorithm choices and tradeoffs
- 027. Anisotropic material mechanics: Iterative solution pseudocode
- 028. Anisotropic material mechanics: GPU execution and parallelism
- 029. Anisotropic material mechanics: Failure modes and recovery
- 030. Anisotropic material mechanics: Acceptance tests and measured deliverables
- 031. Bending and shell dynamics: Requirements and invariants
- 032. Bending and shell dynamics: Data layout and type safety
- 033. Bending and shell dynamics: Input preprocessing and validation
- 034. Bending and shell dynamics: Mathematical formulation
- 035. Bending and shell dynamics: Discretization and numerical conditioning
- 036. Bending and shell dynamics: Algorithm choices and tradeoffs
- 037. Bending and shell dynamics: Iterative solution pseudocode
- 038. Bending and shell dynamics: GPU execution and parallelism
- 039. Bending and shell dynamics: Failure modes and recovery
- 040. Bending and shell dynamics: Acceptance tests and measured deliverables
- 041. Seams and stitching constraints: Requirements and invariants
- 042. Seams and stitching constraints: Data layout and type safety
- 043. Seams and stitching constraints: Input preprocessing and validation
- 044. Seams and stitching constraints: Mathematical formulation
- 045. Seams and stitching constraints: Discretization and numerical conditioning
- 046. Seams and stitching constraints: Algorithm choices and tradeoffs
- 047. Seams and stitching constraints: Iterative solution pseudocode
- 048. Seams and stitching constraints: GPU execution and parallelism
- 049. Seams and stitching constraints: Failure modes and recovery
- 050. Seams and stitching constraints: Acceptance tests and measured deliverables
- 051. Avatar registration and arrangement: Requirements and invariants
- 052. Avatar registration and arrangement: Data layout and type safety
- 053. Avatar registration and arrangement: Input preprocessing and validation
- 054. Avatar registration and arrangement: Mathematical formulation
- 055. Avatar registration and arrangement: Discretization and numerical conditioning
- 056. Avatar registration and arrangement: Algorithm choices and tradeoffs
- 057. Avatar registration and arrangement: Iterative solution pseudocode
- 058. Avatar registration and arrangement: GPU execution and parallelism
- 059. Avatar registration and arrangement: Failure modes and recovery
- 060. Avatar registration and arrangement: Acceptance tests and measured deliverables
- 061. Pre-simulation geometric optimization: Requirements and invariants
- 062. Pre-simulation geometric optimization: Data layout and type safety
- 063. Pre-simulation geometric optimization: Input preprocessing and validation
- 064. Pre-simulation geometric optimization: Mathematical formulation
- 065. Pre-simulation geometric optimization: Discretization and numerical conditioning
- 066. Pre-simulation geometric optimization: Algorithm choices and tradeoffs
- 067. Pre-simulation geometric optimization: Iterative solution pseudocode
- 068. Pre-simulation geometric optimization: GPU execution and parallelism
- 069. Pre-simulation geometric optimization: Failure modes and recovery
- 070. Pre-simulation geometric optimization: Acceptance tests and measured deliverables
- 071. Collision detection and barrier contact: Requirements and invariants
- 072. Collision detection and barrier contact: Data layout and type safety
- 073. Collision detection and barrier contact: Input preprocessing and validation
- 074. Collision detection and barrier contact: Mathematical formulation
- 075. Collision detection and barrier contact: Discretization and numerical conditioning
- 076. Collision detection and barrier contact: Algorithm choices and tradeoffs
- 077. Collision detection and barrier contact: Iterative solution pseudocode
- 078. Collision detection and barrier contact: GPU execution and parallelism
- 079. Collision detection and barrier contact: Failure modes and recovery
- 080. Collision detection and barrier contact: Acceptance tests and measured deliverables
- 081. Friction and thickness: Requirements and invariants
- 082. Friction and thickness: Data layout and type safety
- 083. Friction and thickness: Input preprocessing and validation
- 084. Friction and thickness: Mathematical formulation
- 085. Friction and thickness: Discretization and numerical conditioning
- 086. Friction and thickness: Algorithm choices and tradeoffs
- 087. Friction and thickness: Iterative solution pseudocode
- 088. Friction and thickness: GPU execution and parallelism
- 089. Friction and thickness: Failure modes and recovery
- 090. Friction and thickness: Acceptance tests and measured deliverables
- 091. GPU and CPU solver architecture: Requirements and invariants
- 092. GPU and CPU solver architecture: Data layout and type safety
- 093. GPU and CPU solver architecture: Input preprocessing and validation
- 094. GPU and CPU solver architecture: Mathematical formulation
- 095. GPU and CPU solver architecture: Discretization and numerical conditioning
- 096. GPU and CPU solver architecture: Algorithm choices and tradeoffs
- 097. GPU and CPU solver architecture: Iterative solution pseudocode
- 098. GPU and CPU solver architecture: GPU execution and parallelism
- 099. GPU and CPU solver architecture: Failure modes and recovery
- 100. GPU and CPU solver architecture: Acceptance tests and measured deliverables
- 101. Simulation stability and quality: Requirements and invariants
- 102. Simulation stability and quality: Data layout and type safety
- 103. Simulation stability and quality: Input preprocessing and validation
- 104. Simulation stability and quality: Mathematical formulation
- 105. Simulation stability and quality: Discretization and numerical conditioning
- 106. Simulation stability and quality: Algorithm choices and tradeoffs
- 107. Simulation stability and quality: Iterative solution pseudocode
- 108. Simulation stability and quality: GPU execution and parallelism
- 109. Simulation stability and quality: Failure modes and recovery
- 110. Simulation stability and quality: Acceptance tests and measured deliverables
- 111. Multi-layer hardware and foam: Requirements and invariants
- 112. Multi-layer hardware and foam: Data layout and type safety
- 113. Multi-layer hardware and foam: Input preprocessing and validation
- 114. Multi-layer hardware and foam: Mathematical formulation
- 115. Multi-layer hardware and foam: Discretization and numerical conditioning
- 116. Multi-layer hardware and foam: Algorithm choices and tradeoffs
- 117. Multi-layer hardware and foam: Iterative solution pseudocode
- 118. Multi-layer hardware and foam: GPU execution and parallelism
- 119. Multi-layer hardware and foam: Failure modes and recovery
- 120. Multi-layer hardware and foam: Acceptance tests and measured deliverables
- 121. Viewport renderer and overlays: Requirements and invariants
- 122. Viewport renderer and overlays: Data layout and type safety
- 123. Viewport renderer and overlays: Input preprocessing and validation
- 124. Viewport renderer and overlays: Mathematical formulation
- 125. Viewport renderer and overlays: Discretization and numerical conditioning
- 126. Viewport renderer and overlays: Algorithm choices and tradeoffs
- 127. Viewport renderer and overlays: Iterative solution pseudocode
- 128. Viewport renderer and overlays: GPU execution and parallelism
- 129. Viewport renderer and overlays: Failure modes and recovery
- 130. Viewport renderer and overlays: Acceptance tests and measured deliverables
- 131. Editing tools and interaction: Requirements and invariants
- 132. Editing tools and interaction: Data layout and type safety
- 133. Editing tools and interaction: Input preprocessing and validation
- 134. Editing tools and interaction: Mathematical formulation
- 135. Editing tools and interaction: Discretization and numerical conditioning
- 136. Editing tools and interaction: Algorithm choices and tradeoffs
- 137. Editing tools and interaction: Iterative solution pseudocode
- 138. Editing tools and interaction: GPU execution and parallelism
- 139. Editing tools and interaction: Failure modes and recovery
- 140. Editing tools and interaction: Acceptance tests and measured deliverables
- 141. Avatar anatomy measurements: Requirements and invariants
- 142. Avatar anatomy measurements: Data layout and type safety
- 143. Avatar anatomy measurements: Input preprocessing and validation
- 144. Avatar anatomy measurements: Mathematical formulation
- 145. Avatar anatomy measurements: Discretization and numerical conditioning
- 146. Avatar anatomy measurements: Algorithm choices and tradeoffs
- 147. Avatar anatomy measurements: Iterative solution pseudocode
- 148. Avatar anatomy measurements: GPU execution and parallelism
- 149. Avatar anatomy measurements: Failure modes and recovery
- 150. Avatar anatomy measurements: Acceptance tests and measured deliverables
- 151. Fit pressure strain and diagnostics: Requirements and invariants
- 152. Fit pressure strain and diagnostics: Data layout and type safety
- 153. Fit pressure strain and diagnostics: Input preprocessing and validation
- 154. Fit pressure strain and diagnostics: Mathematical formulation
- 155. Fit pressure strain and diagnostics: Discretization and numerical conditioning
- 156. Fit pressure strain and diagnostics: Algorithm choices and tradeoffs
- 157. Fit pressure strain and diagnostics: Iterative solution pseudocode
- 158. Fit pressure strain and diagnostics: GPU execution and parallelism
- 159. Fit pressure strain and diagnostics: Failure modes and recovery
- 160. Fit pressure strain and diagnostics: Acceptance tests and measured deliverables
- 161. Validation testing and industrial calibration: Requirements and invariants
- 162. Validation testing and industrial calibration: Data layout and type safety
- 163. Validation testing and industrial calibration: Input preprocessing and validation
- 164. Validation testing and industrial calibration: Mathematical formulation
- 165. Validation testing and industrial calibration: Discretization and numerical conditioning
- 166. Validation testing and industrial calibration: Algorithm choices and tradeoffs
- 167. Validation testing and industrial calibration: Iterative solution pseudocode
- 168. Validation testing and industrial calibration: GPU execution and parallelism
- 169. Validation testing and industrial calibration: Failure modes and recovery
- 170. Validation testing and industrial calibration: Acceptance tests and measured deliverables
- 171. Data portability and manufacturing: Requirements and invariants
- 172. Data portability and manufacturing: Data layout and type safety
- 173. Data portability and manufacturing: Input preprocessing and validation
- 174. Data portability and manufacturing: Mathematical formulation
- 175. Data portability and manufacturing: Discretization and numerical conditioning
- 176. Data portability and manufacturing: Algorithm choices and tradeoffs
- 177. Data portability and manufacturing: Iterative solution pseudocode
- 178. Data portability and manufacturing: GPU execution and parallelism
- 179. Data portability and manufacturing: Failure modes and recovery
- 180. Data portability and manufacturing: Acceptance tests and measured deliverables
- 181. Performance and scalability: Requirements and invariants
- 182. Performance and scalability: Data layout and type safety
- 183. Performance and scalability: Input preprocessing and validation
- 184. Performance and scalability: Mathematical formulation
- 185. Performance and scalability: Discretization and numerical conditioning
- 186. Performance and scalability: Algorithm choices and tradeoffs
- 187. Performance and scalability: Iterative solution pseudocode
- 188. Performance and scalability: GPU execution and parallelism
- 189. Performance and scalability: Failure modes and recovery
- 190. Performance and scalability: Acceptance tests and measured deliverables
- 191. Competitive design and roadmap: Requirements and invariants
- 192. Competitive design and roadmap: Data layout and type safety
- 193. Competitive design and roadmap: Input preprocessing and validation
- 194. Competitive design and roadmap: Mathematical formulation
- 195. Competitive design and roadmap: Discretization and numerical conditioning
- 196. Competitive design and roadmap: Algorithm choices and tradeoffs
- 197. Competitive design and roadmap: Iterative solution pseudocode
- 198. Competitive design and roadmap: GPU execution and parallelism
- 199. Competitive design and roadmap: Failure modes and recovery
- 200. Competitive design and roadmap: Acceptance tests and measured deliverables


---

## Page 001 — Canonical 2D-to-3D state: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 002 — Canonical 2D-to-3D state: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 003 — Canonical 2D-to-3D state: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 004 — Canonical 2D-to-3D state: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 005 — Canonical 2D-to-3D state: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 006 — Canonical 2D-to-3D state: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 007 — Canonical 2D-to-3D state: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 008 — Canonical 2D-to-3D state: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 009 — Canonical 2D-to-3D state: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 010 — Canonical 2D-to-3D state: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to canonical 2d-to-3d state.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 011 — Pattern meshing and metric: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 012 — Pattern meshing and metric: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 013 — Pattern meshing and metric: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 014 — Pattern meshing and metric: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 015 — Pattern meshing and metric: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 016 — Pattern meshing and metric: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 017 — Pattern meshing and metric: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 018 — Pattern meshing and metric: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 019 — Pattern meshing and metric: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 020 — Pattern meshing and metric: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/ARCHITECTURE_AUDIT_CLOTH_SIMULATION_2026-10-13.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to pattern meshing and metric.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 021 — Anisotropic material mechanics: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 022 — Anisotropic material mechanics: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 023 — Anisotropic material mechanics: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 024 — Anisotropic material mechanics: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 025 — Anisotropic material mechanics: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 026 — Anisotropic material mechanics: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 027 — Anisotropic material mechanics: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 028 — Anisotropic material mechanics: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 029 — Anisotropic material mechanics: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 030 — Anisotropic material mechanics: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://publications.ri.cmu.edu/large-steps-in-cloth-simulation

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to anisotropic material mechanics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 031 — Bending and shell dynamics: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 032 — Bending and shell dynamics: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 033 — Bending and shell dynamics: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 034 — Bending and shell dynamics: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 035 — Bending and shell dynamics: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 036 — Bending and shell dynamics: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 037 — Bending and shell dynamics: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 038 — Bending and shell dynamics: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 039 — Bending and shell dynamics: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 040 — Bending and shell dynamics: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://doi.org/10.1145/280814.280821

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to bending and shell dynamics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 041 — Seams and stitching constraints: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 042 — Seams and stitching constraints: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 043 — Seams and stitching constraints: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 044 — Seams and stitching constraints: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 045 — Seams and stitching constraints: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 046 — Seams and stitching constraints: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 047 — Seams and stitching constraints: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 048 — Seams and stitching constraints: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 049 — Seams and stitching constraints: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 050 — Seams and stitching constraints: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_ACTIVE_TSHIRT_ASSEMBLY_REFERENCE_2026-10-14.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to seams and stitching constraints.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 051 — Avatar registration and arrangement: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 052 — Avatar registration and arrangement: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 053 — Avatar registration and arrangement: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 054 — Avatar registration and arrangement: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 055 — Avatar registration and arrangement: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 056 — Avatar registration and arrangement: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 057 — Avatar registration and arrangement: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 058 — Avatar registration and arrangement: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 059 — Avatar registration and arrangement: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 060 — Avatar registration and arrangement: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to avatar registration and arrangement.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 061 — Pre-simulation geometric optimization: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 062 — Pre-simulation geometric optimization: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 063 — Pre-simulation geometric optimization: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 064 — Pre-simulation geometric optimization: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 065 — Pre-simulation geometric optimization: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 066 — Pre-simulation geometric optimization: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 067 — Pre-simulation geometric optimization: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 068 — Pre-simulation geometric optimization: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 069 — Pre-simulation geometric optimization: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 070 — Pre-simulation geometric optimization: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to pre-simulation geometric optimization.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 071 — Collision detection and barrier contact: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 072 — Collision detection and barrier contact: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 073 — Collision detection and barrier contact: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 074 — Collision detection and barrier contact: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 075 — Collision detection and barrier contact: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 076 — Collision detection and barrier contact: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 077 — Collision detection and barrier contact: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 078 — Collision detection and barrier contact: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 079 — Collision detection and barrier contact: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 080 — Collision detection and barrier contact: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to collision detection and barrier contact.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 081 — Friction and thickness: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 082 — Friction and thickness: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 083 — Friction and thickness: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 084 — Friction and thickness: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 085 — Friction and thickness: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 086 — Friction and thickness: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 087 — Friction and thickness: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 088 — Friction and thickness: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 089 — Friction and thickness: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 090 — Friction and thickness: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://ipc-sim.github.io/

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to friction and thickness.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 091 — GPU and CPU solver architecture: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 092 — GPU and CPU solver architecture: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 093 — GPU and CPU solver architecture: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 094 — GPU and CPU solver architecture: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 095 — GPU and CPU solver architecture: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 096 — GPU and CPU solver architecture: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 097 — GPU and CPU solver architecture: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 098 — GPU and CPU solver architecture: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 099 — GPU and CPU solver architecture: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 100 — GPU and CPU solver architecture: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to gpu and cpu solver architecture.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 101 — Simulation stability and quality: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 102 — Simulation stability and quality: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 103 — Simulation stability and quality: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 104 — Simulation stability and quality: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 105 — Simulation stability and quality: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 106 — Simulation stability and quality: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 107 — Simulation stability and quality: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 108 — Simulation stability and quality: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 109 — Simulation stability and quality: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 110 — Simulation stability and quality: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to simulation stability and quality.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 111 — Multi-layer hardware and foam: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 112 — Multi-layer hardware and foam: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 113 — Multi-layer hardware and foam: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 114 — Multi-layer hardware and foam: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 115 — Multi-layer hardware and foam: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 116 — Multi-layer hardware and foam: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 117 — Multi-layer hardware and foam: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 118 — Multi-layer hardware and foam: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 119 — Multi-layer hardware and foam: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 120 — Multi-layer hardware and foam: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/OPEN_SOURCE_CLOTH_GAP_CLOSURE_RESEARCH_2026-10-13.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to multi-layer hardware and foam.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 121 — Viewport renderer and overlays: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 122 — Viewport renderer and overlays: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 123 — Viewport renderer and overlays: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 124 — Viewport renderer and overlays: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 125 — Viewport renderer and overlays: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 126 — Viewport renderer and overlays: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 127 — Viewport renderer and overlays: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 128 — Viewport renderer and overlays: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 129 — Viewport renderer and overlays: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 130 — Viewport renderer and overlays: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** src/components/ClothCraftSceneV2.jsx

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to viewport renderer and overlays.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 131 — Editing tools and interaction: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 132 — Editing tools and interaction: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 133 — Editing tools and interaction: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 134 — Editing tools and interaction: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 135 — Editing tools and interaction: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 136 — Editing tools and interaction: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 137 — Editing tools and interaction: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 138 — Editing tools and interaction: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 139 — Editing tools and interaction: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 140 — Editing tools and interaction: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/research/EXO_CLO_LEFT_3D_LIVE_EVIDENCE_20261017.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to editing tools and interaction.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 141 — Avatar anatomy measurements: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 142 — Avatar anatomy measurements: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 143 — Avatar anatomy measurements: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 144 — Avatar anatomy measurements: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 145 — Avatar anatomy measurements: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 146 — Avatar anatomy measurements: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 147 — Avatar anatomy measurements: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 148 — Avatar anatomy measurements: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 149 — Avatar anatomy measurements: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 150 — Avatar anatomy measurements: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_BODY_RELATIVE_PPF_ASSEMBLY_EXPERIMENT_2026-10-14.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to avatar anatomy measurements.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 151 — Fit pressure strain and diagnostics: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 152 — Fit pressure strain and diagnostics: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 153 — Fit pressure strain and diagnostics: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 154 — Fit pressure strain and diagnostics: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 155 — Fit pressure strain and diagnostics: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 156 — Fit pressure strain and diagnostics: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 157 — Fit pressure strain and diagnostics: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 158 — Fit pressure strain and diagnostics: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 159 — Fit pressure strain and diagnostics: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 160 — Fit pressure strain and diagnostics: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to fit pressure strain and diagnostics.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 161 — Validation testing and industrial calibration: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 162 — Validation testing and industrial calibration: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 163 — Validation testing and industrial calibration: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 164 — Validation testing and industrial calibration: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 165 — Validation testing and industrial calibration: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 166 — Validation testing and industrial calibration: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 167 — Validation testing and industrial calibration: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 168 — Validation testing and industrial calibration: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 169 — Validation testing and industrial calibration: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 170 — Validation testing and industrial calibration: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO3D_CLOTHING_SIMULATION_GAP_AUDIT_2026-10-13.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to validation testing and industrial calibration.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 171 — Data portability and manufacturing: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 172 — Data portability and manufacturing: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 173 — Data portability and manufacturing: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 174 — Data portability and manufacturing: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 175 — Data portability and manufacturing: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 176 — Data portability and manufacturing: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 177 — Data portability and manufacturing: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 178 — Data portability and manufacturing: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 179 — Data portability and manufacturing: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 180 — Data portability and manufacturing: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** docs/CLO_EXPORT_PRODUCTION_PARITY_2026-10-15.md

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to data portability and manufacturing.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 181 — Performance and scalability: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 182 — Performance and scalability: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 183 — Performance and scalability: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 184 — Performance and scalability: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 185 — Performance and scalability: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 186 — Performance and scalability: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 187 — Performance and scalability: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 188 — Performance and scalability: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 189 — Performance and scalability: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 190 — Performance and scalability: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://support.marvelousdesigner.com/hc/en-us/articles/47358232630937-Simulation

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to performance and scalability.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 191 — Competitive design and roadmap: Requirements and invariants

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Requirement: preserve centimeter-authored geometric truth while processing solver geometry in SI metres and material constitutive quantities with explicit dimensions. Track material and seam provenance by immutable IDs; reject inconsistent meshes before GPU upload.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 192 — Competitive design and roadmap: Data layout and type safety

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Schema: Panel {id, patternRevision, restUV, vertexIDs, triangles, localToWorld, seamRelations, fabricId}; Avatar {skinTriangles, pose, landmarks}; SolverState {positions, velocities, contacts, residuals, timestamp}. Derive rendered positions from a verified frame rather than allowing display curvature to mutate physical rest coordinates.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 193 — Competitive design and roadmap: Input preprocessing and validation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Preflight: validate nonzero signed triangle area, edge manifoldness where required, matching stitch arclength pairing, finite units, avatar pose registration and exclusion sets. Quarantine invalid geometry with a structured diagnostic instead of silently bridging or accepting degenerate constraints.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 194 — Competitive design and roadmap: Mathematical formulation

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Solve a coupled incremental state: minimize inertia + Δt²(E_stretch + E_shear + E_bend + E_sewing + E_contact + E_friction), subject to admissible geometry, stable face orientation and collision-free trajectory. For shell strain use F = Ds·Dm⁻¹ and warp/weft directions measured in the rest pattern basis; calibrate energy from tests rather than an arbitrary stiffness slider.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 195 — Competitive design and roadmap: Discretization and numerical conditioning

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Triangulate in metric rest space with bounded aspect ratios, stable boundary and sewing IDs and adaptive refinement where curvature/strain warrants. Record mesh quality histograms and element-condition diagnostics; refuse pathological slivers instead of just limiting solver iterations.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 196 — Competitive design and roadmap: Algorithm choices and tradeoffs

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Compare explicit PBD/XPBD for interactive draft, implicit FEM or projective methods for medium/high-quality cloth, and IPC-style barrier contact for safety-critical final validation. Each candidate must be evaluated with the same garment, fabric, avatar, pose, frame budget and accuracy criteria; no unmeasured speed superiority claims.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 197 — Competitive design and roadmap: Iterative solution pseudocode

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Algorithm sketch: validate source; generate stable rest mesh and stitch arclength constraints; align pattern panels to avatar anatomy; run constrained body-clearance preassembly; solve predictor; update broadphase and continuous contact candidates; run coupled material/seam/contact iterations; line-search to an admissible collision-free configuration; log residuals; publish only finite accepted frames. Roll back and halve step on quality failure.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 198 — Competitive design and roadmap: GPU execution and parallelism

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Partition rest-mesh work, constitutive evaluation and collision broadphase into deterministic batched kernels; benchmark CPU/GPU agreement and watch data transfer bottlenecks. Use independent queues for rendering and simulation and maintain synchronized immutable snapshots. GPU wins are valid only when collision tests and residual tolerances match.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 199 — Competitive design and roadmap: Failure modes and recovery

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Failure inventory: sliver triangles, flipped panel normals, sewn-edge index migration, false body clearance, tunneling, deep interpenetration, elastic locking, nonfinite stretch energy, unconverged seam closure, unstable material response, bad frame interpolation, stale rendering buffers and improper confidence claims. Emit first-failure time, entity IDs, per-constraint residual and reproducible fixture.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

## Page 200 — Competitive design and roadmap: Acceptance tests and measured deliverables

**Classification:** E — engineering proposal; baseline V/D where explicitly identified. **Primary reference:** https://www.marvelousdesigner.com/products/release

**Engineering focus:** Acceptance: publish fixture input hashes, material lab measurements, max/p95/mean stitch distances, warp/weft strain, triangle quality, body/self intersection counts per frame, penetration depths, energy settling, wall time and peak memory. Require reference physical sample measurements and multi-size repeatability for any manufacturing-grade claim.

**Application to competitive design and roadmap.** Keep one authoritative pattern/document geometry representation; make the viewport a projection of it, and connect to the simulation backend through versioned typed payloads. For this capability, implement a measured fixture and failure trace specific to the feature. At minimum record input IDs, physical dimensions, expected outputs, numerical tolerance, status and whether the render represents physical geometry or only a preview.

**Concrete contract:** Input `(patternRevision, panelIds, fabricTensor, avatarPose, stitchedEdgePairs, solverProfile)`; output `(resultFrame, residualSummary, contactAudit, provenance, qualityStatus)`. Reject stale revisions and units outside declared ranges. Where this feature is display-only, output a `renderLayer` with barycentric body/pattern anchors, a visibility flag and no permission to rewrite solver coordinates.

**QA protocol:** (1) run a clean symmetric shirt; (2) repeat on asymmetric and mirrored patterns; (3) vary material axis and mesh resolution; (4) use an avatar with different pose and dimensions; (5) deliberately introduce a degenerate triangle or reversed seam; (6) compare CPU/GPU or successive resolutions when meaningful; (7) save and reopen and check deterministic IDs and provenance. A passed image comparison is insufficient if body contact, seam residual or strain gates fail.

**R&D decision gate:** Promote from concept only after a separate benchmark establishes accuracy against a documented textile test or known reference case, stable finite output, collision safety and acceptable runtime. Superior-to-CLO claims require controlled comparable measurements and cannot be deduced from public feature lists or EXO tests alone.

---

# Appendix I — Dedicated mechanics, contact and numerical solver research

> Standalone specialist original research included in full; its subsection numbering is independent of the 200 core pages.

# EXO ClothCraft V2: Mechanics, Contact, and Numerical Architecture

**Research date:** 2026-10-18. **Scope:** 3D garment mechanics and collision systems for an engineering implementation. **Status:** research specifications and reproducible validation plans, not a certified manufacturing solver. **Evidence vocabulary:** **V** directly verified in repository or recorded project measurements; **D** documented external publication; **E** engineering proposal; **U** unmeasured, undocumented or unknown. These markings qualify assertions, not endorsement.

## 01. Engineering objective, uncertainty and validation boundary

**E:** The architecture should transform centimeter-scale pattern coordinates into physically dimensioned rest configurations, simulate drape at varied thickness and material properties, and return geometry, reaction forces and a quantitative uncertainty report. A solver that merely looks like an example render cannot establish physical accuracy. Fabric anisotropy, fit, buckling, contact, seam behavior and wearer motion require independent calibration. A garment is *manufacturer ready* only after cutting-pattern, seam allowances, material testing, tolerances, measurements and physical sample agreement pass downstream checks. Neither CLO's nor Marvelous Designer's proprietary internal integrator, collision schemes or convergence criteria can be inferred from a viewport or public feature descriptions (**U**).

**V:** Existing project research `research/clo-3d-analysis/CLO_3D_WINDOW_125_PAGE_ENGINEERING_RESEARCH_20261018.md` reports a seven-panel-group sample with 23 sewing groups and 182 sampled correspondences, and records initial stitching gaps of 36.804 cm in one source pose versus 18.742 cm in a separately checked EXO pose. Those values establish a specific pre-arrangement validation problem, not representative solver quality. The engineering contract therefore separates *geometry input validity*, *pre-sew gap*, *time integration stability*, *self/other contact*, *mechanical fit*, and *production output validation*.

## 02. Units, coordinate frames and dimensional analysis

**E:** Use SI internally: meter, kilogram, second, Newton, Pascal, joule, radians. CAD shapes in centimeters map with `x_m = 0.01 x_cm`; seam lengths, notches and grading rules remain exact in the 2D parametric source. For a triangle of reference area `A0` and fabric areal density `rhoA [kg/m²]`, its gravity mass is `m_e = rhoA A0`; distribute `m_e/3` to incident vertices for a lumped matrix. If the fabric has volume density `rhoV` and effective thickness `t`, `rhoA = rhoV t` is a possible relationship but measured GSM is preferred for coated/laminated composites. Membrane stiffness has units N/m; bending rigidity units N·m; contact force N. Never feed a volumetric Young's modulus in Pa directly to a spring intended for N/m.

**E:** Store coordinates with provenance: pattern frame `(u,v)`, 3D rest embedding `X`, dynamic vertices `x(t)`, body local frame `B`, rigid world transforms `T`. Every fabrication annotation attaches to pattern identifiers and barycentric positions so remeshing does not silently move notches and seams. The state header requires unit schema version, mesh topology hash, material calibration ID and solver step metadata. Test invariant: scaling every length by 100 must alter forces only according to physics, never because a frontend interpreted millimeters as meters.

## 03. Discrete state, topology and degrees of freedom

Let `x∈R^(3n)`, `v∈R^(3n)`, diagonal or sparse mass `M`, triangles `T`, edge adjacency `A`, immutable pattern-face provenance `P`, and sew constraints `S`. **E:** Do not make rendered vertices the canonical simulation state; subdivision and shader displacement must not feed collision. Record edge, face and corner IDs separately because geometric coincidence does not imply sewable adjacency, and the same 2D point may be duplicated at a cut.

Boundary loops must be manifold within each physical layer; explicit seam connections join separate boundary spans. A topology validator reports nonmanifold edges, repeated face indices, inverted rest triangles, zero-area triangles, duplicate IDs, unmatched seam marks, negative masses and adjacency inconsistencies. Errors are fatal before solving instead of creating fictitious surface bridges. Use a corner-attribute mesh for UVs and material axes; converting a visually welded mesh to simulation topology without preserving cut interfaces is incorrect.

## 04. Rest metric and triangle deformation

For each reference triangle choose 2D coordinates `U0,U1,U2`. Let `Dm=[U1-U0,U2-U0]` (2×2), `Ds=[x1-x0,x2-x0]` (3×2), `F=Ds Dm^(-1)` (3×2), `C=FᵀF` (2×2) and `E=(C-I)/2`. This is a surface Green strain tensor. **E:** Compute inverse rest matrices once; reject triangles with `abs(det Dm)<epsilon_area` using a tolerance scaled to garment bounding box and edge lengths. Triangle orientation and signed rest area must be preserved throughout remesh.

The `u/v` directions must follow actual fabric grain; a triangle's arbitrary indexing is not a material principal frame. Transform `E` to the local warp/weft frame by `E_g = Rᵀ E R`, where `R` maps fabric axes to rest triangle basis. Verify rigid motions: `x_i=Q X_i+c` must give `E=0` for any 3D orthogonal `Q`. Test shear under `F=[[1,gamma],[0,1],[0,0]]` and distinguish engineering shear `gamma_eng=2 E_uv` in small strain.

## 05. Orthotropic woven membrane elasticity

**E:** A first calibrated model is a 2D orthotropic Saint-Venant–Kirchhoff or measured nonlinear membrane law. In plane-stress approximation with engineering shear, define `eps=[E_ww,E_ff,2E_wf]`, and `Psi_mem = (A0/2) epsᵀ C_2D eps`, where `C_2D` contains effective extensional warp/weft stiffness `A11,A22`, coupling `A12`, shear `A66`, in N/m. Symmetry/positive definiteness requires `A11>0,A22>0,A66>0,A11 A22-A12²>0`. This identifies warp/shear/weft resistance without assuming cotton behaves isotropically.

For a physically linear sheet derived from thickness `t`, the plane-stress stiffness `C_2D=t Q`; `Q11=E_w/(1-nu_wf nu_fw)`, `Q22=E_f/(1-nu_wf nu_fw)`, `Q12=nu_fw E_w/(1-nu_wf nu_fw)`, `Q66=G_wf`; reciprocity requires `nu_wf/E_w=nu_fw/E_f`. Woven cloth commonly shows nonlinear tension, shear locking, hysteresis and wrinkle slack; linear constitutive assumptions must be bounded to calibrated strain ranges. Do not equate an artistic bend slider with measured ASTM bending rigidity. Background: Baraff and Witkin [D1].

## 06. Knit, bias extension, nonlinear shear and hysteresis

**E:** Fit separate load-unload curves `T_w(eps_w)`, `T_f(eps_f)`, and `tau(gamma)` from physical strips and bias-extension tests. A differentiable stored-energy model `Psi= A0[phi_w(eps_w)+phi_f(eps_f)+phi_s(gamma)+phi_c]` must have derivatives consistent with measured line forces, `dphi/deps=T`. Piecewise cubic monotonic splines with measured knots avoid unrealistic negative tangent stiffness, but hysteresis needs internal variables `q`: `Psi(F,q)`, `q_{n+1}=Update(q_n,F_{n+1},dt)`. If a viscoelastic Kelvin-Voigt model uses stress `sigma=C eps + D dot(eps)`, fit `D` from rates rather than selecting arbitrary damping.

Knits require course/wale axes, stress softening and recovery tests; coated films and padding need layer-specific models. The material library should attach test method, specimen orientation, humidity, temperature, preconditioning cycles, uncertainty and valid strain rate. Extrapolation outside a measured domain is flagged **U** instead of silently promising physical accuracy.

## 07. Continuum forces and tangents

Given total potential `W(x)=Σ_e A_e psi(F_e)+W_b+W_seam+W_contact`, `f_int=-∂W/∂x` and tangent `K=∂²W/∂x²`. Each triangle uses `∂F/∂x_i` from the constant `Dm^(-1)`; analytically differentiate stable materials or use automatic differentiation with derivative checks. Compare gradient to `(W(x+h d)-W(x-h d))/(2h)`; compare Hessian action to finite differences of gradient across normalized random directions and multiple scales.

**E:** Enforce local inversion avoidance with a continuous orientation criterion and robust regularization, not silent clipping of energy to zero. The 3×2 deformation gradient does not have a conventional 3D determinant; detect collapsed surface metric through singular values `sigma1,sigma2`, face normal continuity and `det C`. Distinguish physical folding (normal changes at edges) from degeneracy (zero local area).

## 08. Shell bending formulations

For adjacent triangles sharing edge `e`, a simple hinge model is `W_b,e=(k_e/2)(theta-theta0)²` where `theta` is signed dihedral angle and `theta0` is rest angle. To approximate continuum bending, scale coefficient by edge length divided by an appropriate dual length, with material bending rigidity `B_w,B_f,B_wf`. Isotropic hinge springs are inexpensive but mesh-orientation dependent; refine consistency with discrete shell methods and angle-dependent orthotropic bending. For discrete shells see Grinspun et al. [D2].

**E:** Test a strip under pure bending with measured curvature `kappa` against `E_b=(B/2)∫kappa² dA`; hold the physical strip dimensions fixed while halving mesh edge size. If fold sharpness changes drastically under remeshing, the solver lacks mesh consistency. For garments with seams, rest dihedral, forced crease, pressing and permanent fold memory are distinct control variables.

## 09. Wrinkling, compression and strain limits

A membrane under in-plane compression can buckle in bending modes; linear triangular membrane energies alone may lock into artificial compressive stress or create visually noisy wrinkles. **E:** Evaluate tension-field relaxation where compression is relieved by out-of-plane buckling and compare against a geometrically nonlinear shell solve. A simple bounded penalty on principal Green strains can prevent impossible extension, but tuning strain limits per arbitrary timestep may manufacture false garment ease.

The codimensional IPC study [D3] includes a differentiable strain-limiting barrier formulation that can be considered for strict feasible strain intervals. If `sigma_max(F)` crosses a threshold, use a barrier that diverges approaching the admissible boundary rather than capping singular values after the solve. Validate biaxial stretches, shear, bias, slack zones and coarse-to-fine convergence separately.

## 10. Time integration and energy balance

Continuous equations: `M x¨ + D x˙ + ∇W(x)=f_ext`. Backward Euler with `v_(n+1)=(x_(n+1)-x_n)/h` leads to minimizing `E(x)= 1/(2h²)||x-(x_n+h v_n)||_M² + W(x)-f_ext·x` for conservative forces and fixed external force during the step. Newton gives `(M/h²+∇²W) Δx = -∇E`. Internal damping requires consistent velocity-dependent residuals rather than an unaccounted scalar multiplier. Baraff–Witkin [D1] established large-step implicit cloth simulation.

**E:** Track normalized residual `||r|| / max(1,||f_ext||)`, energy drift under frictionless gravity-free motion, total momentum with no constraints, and dissipated work for damping/friction. Large steps improve stability, not temporal accuracy; compare 1/30, 1/60, 1/120, 1/240 second against a higher-resolution reference.

## 11. Newton/Krylov FEM architecture

**E:** Use block-sparse assembly of stiffness `H=M/h²+K`, matrix-free Hessian-vector products where beneficial, and preconditioned conjugate gradients only when `H` is positive definite. Indefinite tangents from nonconvex energy require regularization, projected Newton, MINRES or trust-region strategies. A sparse LDLᵀ factorization may be practical for fixed topology small garments; on moving adaptive meshes assembly and preconditioner rebuild cost matter.

Algorithm:

```text
for substep:
    predicted = x + h*v
    xtrial = predicted
    for Newton iteration:
        assemble energies, gradients and active contact candidates
        form residual r = M*(xtrial-predicted)/h² + grad(W)
        if residual and feasibility tolerances met: break
        solve regularized H*dx = -r
        step = min(1, conservative_CCD_step(xtrial,dx))
        backtrack step for energy decrease and barrier feasibility
        xtrial += step*dx
    reject_or_reduce_h_if_unconverged()
    v = (xtrial-x)/h
    x = xtrial
```

Never report convergence solely because max iterations are exhausted. Distinguish nonconvergence, a bad preconditioner and genuine geometry infeasibility.

## 12. Extended Position Based Dynamics (XPBD)

For scalar constraint `C(x)=0` with compliance `alpha`, let `alpha_tilde=alpha/h²`. An XPBD update is `Δlambda=(-C(x)-alpha_tilde lambda)/(Σ_i w_i ||∇_i C||²+alpha_tilde)`; `Δx_i=w_i ∇_i C Δlambda`; `lambda+=Δlambda`. Store lambda per physical constraint for the current simulation step; semantics of warm-start across steps must be explicitly defined. This is based on Macklin, Müller and Chentanez [D4].

**E:** XPBD is excellent for interactive previews, dressing, simple strain caps and constraints with predictable computation budget, but finite iterations create solver-iteration bias, and low-order geometric constraints do not automatically reproduce calibrated anisotropic continuous energies. Validate effective force by `lambda/h²` only for the exact multiplier convention implemented. Stabilizing compliance does not by itself enforce nonintersection of fast thin sheets.

## 13. Projective dynamics (PD)

PD reformulates selected energies `W_i=(w_i/2)||A_i x-p_i||²` with local feasible projections `p_i=proj_M(A_i x)`. At each iteration, local projections update `p_i`; global solve `(M/h²+Σ_i w_i A_iᵀ A_i)x = M y/h²+Σ_i w_i A_iᵀ p_i`. See Bouaziz et al. [D5]. A fixed global matrix can be prefactored and reused when weights/topology and timestep stay unchanged.

**E:** PD offers high throughput for a constrained family of material energies, while accurate nonlinear orthotropy and friction-contact barriers weaken the reusable-matrix advantage. Compare a measured strip's force-extension curves to the exact chosen PD projection energy, not the name of the solver. For interactive previews, PD may be paired with accurate later relaxation using FEM.

## 14. Solver trade study and staged fidelity

| Solver | Strength | Accuracy / failure risk | Recommended role |
|---|---|---|---|
| Explicit symplectic Euler | Small simple kernels | Severe stiffness-dependent CFL limits | Debug and low-stiffness teaching fixtures |
| XPBD | Fixed iteration budget, compliant constraints | Iteration dependence, constraint modeling bias | Responsive interactive dressing |
| PD | Efficient reusable global system | Projection-limited constitutive flexibility | Fast preview and preconditioned initial pose |
| Implicit nonlinear FEM | Arbitrary calibrated shell/membrane law | Sparse numerical cost; difficult contacts | Validation-quality fit and drape |
| IPC-coupled implicit FEM | Conservative noninterpenetration treatment | CCD/barriers expensive, geometry robustness essential | Challenging multilayer and tight-fit verification |

**E:** One canonical material definition should map into each backend with a declared approximation error. Avoid marketing claims that engines are numerically interchangeable. A low-fidelity preview mesh and high-fidelity verification mesh must retain stable 2D pattern provenance and identical seam meaning.

## 15. Collision primitive taxonomy and exclusions

Continuous cloth thickness collision must consider vertex–triangle and edge–edge distances across deformable cloth, cloth–avatar and potentially garment–garment layers. **E:** Exclude nearby same-panel topological neighborhoods to prevent adjacent surface sharing from self-colliding, but never blanket-disable contacts across a sewn fold or disjoint panels. Rules depend on vertex/face adjacency, seam rest topology, layer identity and allowed physical interface. Face–face overlaps are caught via primitive features and CCD; avoid relying only on signed-distance penetration tests.

Maintain contact pairs with unique sorted primitive IDs, previous-frame witness feature parameters, gap `d`, normal `n`, thickness offset `d0`, and source mesh IDs. Adjacent triangles can fold until normals reverse; adjacency suppression must be narrow and validated with a folded seam regression.

## 16. Broad phase and bounding-volume hierarchy (BVH)

**E:** Build AABB or swept AABB hierarchies over triangles and edges. For a time interval `[0,h]`, each primitive node encloses both old and predicted positions plus thickness and conservative movement margin. Broad-phase pairs are candidates, never collision guarantees. Refit versus rebuild decisions depend on quality metric such as sum of child surface areas and number of overlapping candidates.

```text
for each simulated substep:
    update swept bounds from x_old, x_predicted, collision_offsets
    refit or rebuild BVH if topology changed or quality degraded
    emit primitive candidate pairs (self, body, other garment)
    remove only analytically justified topological exclusions
    narrow phase distances and CCD for remaining candidates
```

Instrument candidates per frame, false-positive ratio, BVH nodes visited, rebuild/refit times, peak VRAM, and worst-case interpenetration. Geometric degeneracy and very thin triangles need targeted narrow-phase tests.

## 17. Continuous collision detection (CCD)

**E:** A discrete test at timestep endpoints misses a vertex tunneling through a triangle mid-step. Conservative CCD estimates earliest time-of-impact `tau∈[0,1]` for linearly swept primitive trajectories. Candidate functions for a vertex and triangle may involve signed coplanarity root finding followed by barycentric and distance verification; edge-edge similarly needs segment-clamped closest points. Near-parallel, coplanar and zero-length features require degeneracy fallbacks and tolerance policies.

Advance `x_new=x_old+eta tau (x_target-x_old)` with safety factor `eta<1`, or use additive conservative CCD and line searches as in codimensional IPC [D3]. Verify no crossing under folded layers with travel exceeding 10 times thickness per step. Report both exact continuous predicates' tolerance and reconstructed post-step minimum distance. A boolean “collisions on” is not an accuracy certificate.

## 18. Barrier contact and thickness offset

For separation gap `d>d0`, a representative contact barrier `b(d)` vanishes outside activation radius `dhat`, and rises unbounded as `d→d0⁺`. A commonly used IPC form for a nonnegative clearance `g=d-d0` is `b(g)=-(g-dhat)² log(g/dhat)` when `0<g<dhat`, otherwise zero; normalize stiffness consistently with units. Contact potential `W_c=κ Σ_p b(g_p)`, with a contact collection assembled from broad-phase candidates and verified feasible line searches. Source [D3].

**E:** Mid-surface offset for two sheets with physical effective thicknesses `t1,t2` is `d0=(t1+t2)/2` under a symmetric shell-contact convention; a one-sided contact for rigid avatar surfaces requires explicit body skin offset and the sheet half-thickness. Padding lofts and 3D volumes require different contact surfaces. Validate that visual cloth thickness never silently changes body clearance while the solver continues using obsolete nominal thickness.

## 19. Frictional contact and static/kinetic transitions

Coulomb friction imposes `||f_t|| ≤ μ_s f_n` at sticking contacts; sliding magnitude approximates `μ_k f_n` opposite tangential relative motion. Anisotropic surface friction may require warp/weft-dependent metric, with positive definite tangent-plane friction tensor calibrated experimentally. Static friction cannot be implemented faithfully by scaling velocity after resolving overlap.

**E:** Retain relative tangential displacement over a contact's active lifetime, bounded by contact identity/witness continuity; account for moving avatars and other garments. For optimization-based friction, smooth potential near zero slip with a chosen regularization speed and convergence check, then test static threshold and sustained sliding. Bridson–Fedkiw–Anderson [D6] and IPC friction formulations [D3] provide documented frameworks; implementation tradeoffs include high-frequency sticking jitter, contact cycling, and artificial damping.

## 20. Seams as mechanical constraints

Segment sewing produces a correspondence function between two oriented parametric edge arclengths, `s_A(q)`, `s_B(q)`, `q∈[0,1]`. Stitch constraints bind material-space points `a(q)=Σ w_A(q)x_A`, `b(q)=Σ w_B(q)x_B`. The simplest seam energy `W_s=(k_s/2) Σ_q ||a(q)-b(q)||²` approaches a weld, but actual sewn seams have finite offset, seam allowance, thread compliance and allowances for easing. Directionality, duplicate seams, endpoint ordering and unmatched notch indices must be validated before solving.

**E:** Generate stitch quadrature based on physical seam arclength, interpolate points via boundary edges rather than assuming equal tessellation on both sides, and expose difference between matched sewn lengths and pre-sew gaps. Gradual activation is useful for dressing but must be tagged as a solver staging heuristic; after convergence compare the same final seam constitutive state. Validate stitches at sleeve cap, curved armscye and intentionally unequal ease distribution, reporting maximum and percentile residual in mm.

## 21. Seam allowances, edge reinforcement and stitch rows

**E:** The physical seam line and cut edge are distinct curves separated by specified seam allowance. Reinforcement may be modeled as an orthotropic band, a local bending increase, layered tapes, a folded hem with contact, or narrow volumetric elements. Topstitch rows enforce path-specific geometry and can induce local gathers; a texture line cannot substitute for a mechanical row.

For production, persist seam category, intended seam allowance by section, overlock/fold/binding construction, notches, stitch density, feed ratio, layer order and material attachments. A free boundary spring connecting two cut-edge positions at the seam line is geometrically wrong when the seam allowance has finite width. Verify seam allowance length and fold cross-section against physical sewing samples.

## 22. Multiple cloth layers and ordering

A garment stack may contain outer shell, lining, padding, interlining, pocket bags and underlying garments. **E:** Model each dynamic physical layer with mass/material/contact and a declared interface: independent sliding, bonded lamination, sparse stitching or partial adhesive constraints. Layer order belongs to pattern assembly metadata as a preferred initial arrangement and is not a universal hard constraint, because legitimate garment motion can alter local ordering.

Define thickness offsets pairwise, and resist numerical collapse between highly thin layers through unbiased contact distances. For bonded composites, classical laminated plate theory gives `[N;M]=[A B;B D][eps0;kappa]` where A is extensional, B extension–bending coupling, and D bending stiffness matrices; this captures asymmetric stacks better than simply summing layer stretch springs. Validate against bent laminated coupons, foam panels and a pocket bag moving independently.

## 23. Body collision: rigged and scanned avatars

**E:** Store collision geometry in body pose space with a verified transformation pipeline from bind pose to animated pose. Skinning changes the body collision surface each frame; signed-distance grids can accelerate broad phase but high curvature and narrow gaps require precise mesh distance or adaptive SDF resolution. Normal directions and watertightness matter. For scanned open meshes, signed inside/outside may be undefined; use unsigned distance with robust reference orientation only where justified.

Body contacts are relative velocity constraints; if the avatar moves, the garment should inherit no artificial static momentum. Verify limbs crossing close to torso, deep armpits, neck rolls, bent elbows and knee-to-fabric. Record avatar circumference measurement error, landmark movement and pose confidence; contact robustness alone cannot establish fit without anthropometric validation.

## 24. Remeshing and transfer of state

**D:** Narain, Samii and O'Brien [D7] describe adaptive anisotropic cloth remeshing driven by curvature and velocity gradients. **E:** The mesh metric should combine membrane stretch gradients, bending curvature, contact proximity, seam stress, notches and expected buckling. Refine preferentially perpendicular to wrinkle ridges while controlling triangle aspect and minimum angle. Coarsen only where physical fields and manufacturing boundary features admit a bounded projection error.

After split/collapse/flip, transfer current position, momentum-consistent velocity, mass, rest material coordinates, fabric axes, layer ID, friction history and seam barycentric attachments. Conserved total mass and momentum are regression checks; interpolation alone can inject or remove kinetic energy. Rebuild BVH and invalidate stale contact primitive IDs after topology edits. Never coarsen a cut edge or notch without remapping its exact 2D parametric identity.

## 25. CPU, GPU and deterministic scheduling

**E:** On CPU use structure-of-arrays vertex state, compressed sparse row/block sparse matrices, SIMD triangle evaluation, threaded disjoint assembly and deterministic reduction options. GPU paths may benefit XPBD/PD local projections and collision broad-phase sorting, but atomics, sparse Krylov preconditioning, highly divergent CCD and contact-heavy Newton line searches can dominate costs. Benchmarks must compare **end-to-end solve time**, including transfer, rebuild, contact detection, remeshing and synchronization, rather than counting just material kernels.

Precision policy: float32 render state is fine; critical near-contact narrow phase and accumulations should be measured against float64 reference and robust predicate implementations. Support optional deterministic replay with fixed topology, stable primitive ID ordering, deterministic pair sorting and reproducible reductions. Compile backend feature matrix by hardware, OS, driver and toolchain; do not assert CUDA/ROCm/Metal parity without measured results.

## 26. Coupled solver blueprint, data contract and acceptance suite

**E:** Proposed sequence: validate input topology/units → calibrate reference geometry and anisotropic properties → pre-arrange → establish sewing maps → cloth mass and membrane/bend assembly → swept broad-phase → CCD-safe optimization or XPBD projection → contact/friction update → residual/contact checks → optional remesh → transfer state → output fabric, stress and fit measurement metadata. The preview solver must never overwrite manufacturing pattern control points merely because a simulated surface stretched.

Minimum per-step structured diagnostics:

```json
{
  "step": 42, "time_s": 0.7, "dt_s": 0.0166667,
  "mesh_vertices": 12864, "triangle_count": 25102,
  "solver": "implicit-fem", "converged": true,
  "newton_iterations": 9, "linear_iterations": 123,
  "relative_force_residual": 0.000007,
  "minimum_clearance_m": 0.00043,
  "active_contacts": 1103, "ccd_limited_steps": 2,
  "max_seam_residual_m": 0.00083,
  "membrane_energy_J": 0.41, "bending_energy_J": 0.073,
  "contact_energy_J": 0.02, "elapsed_wall_ms": 48.6
}
```

All numbers in this schema are **illustrative placeholders**, not measured EXO performance. On failure, output failure type and last feasible state. Suggested preliminary targets to **test**, not certified tolerances: zero topological intersections after CCD verification, <1 mm chosen stitch residual at settled tension in calibrated fixtures, <1% mass conservation error under remeshing (ideally machine-level without coarsening loss), reproducible physical coupon curves within independently agreed test uncertainty, and monotonic mesh-convergence trends.

### Benchmark matrix: exact fixtures and observations

| Fixture | Geometry and loading | Quantities to compare | Pass/fail definition |
|---|---|---|---|
| Gravity catenary | Known mass line/strip, clamped ends | Sag and tension profile | Refined numerical analytic comparison |
| Bias extension | Woven rectangular coupon ±45° | Shear/force curve and hysteresis | Measured strip confidence intervals |
| Cantilever bending | Fabric strip, measured overhang | Curvature and tip deflection | Repeatable physical specimen tests |
| Biaxial strain | Clamped square with two load paths | Force vs strains, principal axes | Material lab curves |
| Seam pull | Two unequal-edge panels sewn | Stitch residual, gather pattern, seam force | Physical seam coupon |
| Dynamic sphere drop | Draped sheet over moving sphere | CCD tunneling count, penetration, energy | No interpenetration under aggressive h |
| Folded self-contact | Two contacting folded strips | Minimum gap, friction hysteresis | Material thickness-aware distance |
| Layered jacket | Shell + lining + pad | Layer separation, mass, silhouette | Sample fit and CT/section images where available |
| Animated avatar | T-shirt, sleeves, elbow flexion | Garment-body gap, strain, sliding | 3D scan/video motion reference |
| Mesh convergence | Same sample h, h/2, h/4 | Force, folds, seams, wall time | Error decreases with refinement |
| Determinism | Same seed/input repeated | Position hashes, iteration counts | Backend-specific documented envelope |
| Hardware scaling | 1k, 10k, 100k vertices | CPU/GPU time, peak memory, CCD share | Performance frontier per platform |

Define benchmark output as CSV/JSON plus source hashes; report median, p95 and worst-case milliseconds over repeated warm runs; include numerical residuals and physical errors. Compare CLO/Marvelous Designer via identical exported garments, calibrated fabric settings and independently photographed/scanned sewn prototypes. Since their exact internal models are **U**, report observable fit and performance only. Claimed superiority needs statistically supported evaluation over representative garment categories with preset acceptance thresholds and reproducible hardware/software versions.

## 27. Recommended implementation milestones and stop conditions

**E:** First, isolate a golden triangle kernel implementing grain-aware membrane energy and finite-difference-verified derivatives. Second, add mesh-consistent bending and measured coupon fixtures. Third, add valid seam interpolation and metrics. Fourth, implement swept BVH + conservative CCD and test adversarial folding. Fifth, add Coulomb friction and dynamic avatar support. Sixth, implement multi-layer contact and composite constitutive laws. Seventh, add remesh and full state transfer. Eighth, benchmark XPBD/PD preview against implicit FEM/contact verification on the same fixtures. Each stage must produce deterministic reproducible recorded evidence before its outputs feed a manufacturing claim.

Stop a simulation and preserve last feasible state when degenerate elements cannot be recovered, CCD reports a zero safe step, barrier constraints are infeasible, seam correspondence is ambiguous, or Newton fails its residual target after timestep reductions. Return a structured report rather than silently accepting folded geometry that has penetrated itself.

## 28. Research source registry and provenance

These references substantiate the published methods (**D**), not any untested EXO implementation. Accessed/verified by title and bibliographic metadata 2026-10-18.

- **[D1]** Baraff, D., Witkin, A. (1998). *Large Steps in Cloth Simulation*. SIGGRAPH. https://doi.org/10.1145/280814.280821 ; author PDF https://www.cs.cmu.edu/~baraff/papers/sig98.pdf
- **[D2]** Grinspun, E., Hirani, A. N., Desbrun, M., Schröder, P. (2003). *Discrete Shells*. Symposium on Computer Animation. https://doi.org/10.1145/846276.846284
- **[D3]** Li, M., Kaufman, D. M., Jiang, C. (2021). *Codimensional Incremental Potential Contact*. SIGGRAPH/TOG. https://arxiv.org/abs/2012.04457
- **[D4]** Macklin, M., Müller, M., Chentanez, N. (2016). *XPBD: Position-Based Simulation of Compliant Constrained Dynamics*. https://doi.org/10.1145/2994258.2994272
- **[D5]** Bouaziz, S., Martin, S., Liu, T., Kavan, L., Pauly, M. (2014). *Projective Dynamics: Fusing Constraint Projections for Fast Simulation*. https://doi.org/10.1145/2601097.2601116
- **[D6]** Bridson, R., Fedkiw, R., Anderson, J. (2002). *Robust Treatment of Collisions, Contact and Friction for Cloth Animation*. https://doi.org/10.1145/566654.566623 ; author page https://visionsystems.stanford.edu/papers/cloth-sig02/
- **[D7]** Narain, R., Samii, A., O'Brien, J. F. (2012). *Adaptive Anisotropic Remeshing for Cloth Simulation*. https://doi.org/10.1145/2366145.2366171 ; UC Berkeley record https://escholarship.org/uc/item/5s1775xd
- **[D8]** Sifakis, E., Barbic, J. (2012). *FEM Simulation of 3D Deformable Solids: A Practitioner's Guide to Theory, Discretization and Model Reduction*. https://doi.org/10.1145/2504435.2504438 (general FEM mathematical reference, not a thin-shell validation source).

**Limitations:** This is a documented engineering design and experimental plan. No new physical coupon specimens, certified lab curves, inter-software trials or GPU performance measurements were performed for this file. Implementation contracts and numerical acceptance targets marked **E** remain to be benchmarked; precise CLO/Marvelous internal solver algorithms remain **U**. The companion project viewport research [V] provides limited baseline measurements, not a substitute for mechanical calibration.


---

# Appendix II — CLO / Marvelous Designer / VStitcher / Optitex workflow, CAD and manufacturing engineering

> Standalone specialist original research included in full; it distinguishes documented product functionality from unverified proprietary internals and EXO engineering proposals.

# EXO 3D CAD, arrangement and manufacturing engineering research

**Date:** 2026-10-18. **Scope:** EXO ClothCraft V2 3D window, comparison with documented CLO / Marvelous Designer user workflows, industrial pattern handoff, fit analysis and a testable implementation architecture. **Method:** static inspection of named EXO files and official vendor documentation; no proprietary solver reverse engineering, certified manufacturing validation, or live interaction with installed CLO is asserted.

**Evidence key:** **V** directly located in current EXO source (presence of code, not successful end-to-end use); **D** described in public official CLO/Marvelous documentation; **E** original EXO engineering design and proposed acceptance thresholds; **U** unverified or missing evidence. Sources are URLs with explicit feature scope. Vendor manuals can change and may describe different product versions.

## 01. Outcome and release definition

**E.** The target is a 3D CAD workspace in which a manufacturer can trace a simulated garment to a uniquely identified 2D cutting pattern, graded size, sewing operation, fabric measurement, avatar, solver run and exported exchange file. Appearance, real-world fit prediction and factory artifact correctness are independent pass/fail dimensions. A fast preview may be attractive while its contact and material physics remain unvalidated; a physically excellent simulation can still export unusable DXF. EXO should publish separate release confidence scores for *interactivity*, *numerical stability*, *measured predictive agreement*, *pattern interoperability* and *manufacturing completeness*. Every reported result includes tool version, asset hashes, solver backend, fabric card, mesh resolution, units and date.

**E.** Acceptance gate: for an agreed reference garment and factory-approved pattern, pass round-trip dimensional tolerance, preserve every seam/notch/grade relationship, solve representative poses without unacceptable penetrations, reproduce repeat runs within a declared tolerance and meet a published frame budget. Do not call the product more accurate than CLO or Marvelous until blind experiments with the same fabric, avatar, patterns and ground truth establish that result.

## 02. Evidence from current EXO implementation

**V.** `src/core/patternBodyArrangement.js:7-66` infers anatomical roles from panel names and project context, then applies hard-coded approximate positions such as torso front/back and sleeve offsets; uncertain panels remain unassigned. These offsets are a usable heuristic initializer, not anatomy-matched placements. **V.** `src/core/nativePreDrapeCurvature.js:1-78` bends selected reset-stage panel vertices in a separate display buffer, checks coarse avatar ranges and local averages, and explicitly excludes the modified coordinates from the solver, undo state and serialization. This is visual preparation only. **V.** `src/components/ClothCraftSceneV2.jsx:1332-1361,1756` provides a displayed extension-based color ramp and explicitly labels it “Principal extension … not stress/pressure.” **V.** `src/components/ClothCraftWorkspace.jsx:1538` reports worst seam gap, extension p95 and contacts while identifying collision and fit as experimental.

**V.** The workspace supplies typed panel placement controls in meters/degrees, transform tools, play/pause/step/reset, and 2D seam length mismatch in millimeters (`ClothCraftWorkspace.jsx:1473,1522,1543`). **V.** `src/core/nativePatternExportPreparation.js:9-87` builds a disposable export copy, removes microscopic edges, normalizes winding and remaps indexed seam and marking data. This preparatory step is not itself a validated DXF-AAMA/ASTM writer. **U.** Inspection of these files does not prove a production-grade canonical arrangement/solver contract, calibrated avatar fitting, DXF round-trip, full stress tensor, contact-pressure integration or factory-approved tolerance system. A separate existing inventory, `research/clo-3d-analysis/EXO_3D_VIEWPORT_PARITY_INVENTORY_20261018.md`, documents many more UI surfaces.

## 03. CLO arrangement behavior and version-specific reference

**D.** CLO arrangement points are anchored to avatar bounding volumes; selecting a pattern, hovering an arrangement point and clicking previews and places the panel; associated symmetric settings can arrange paired patterns. A flip-wrap command changes wrap direction. Source: [CLO arrangement points](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction). **D.** An arrangement point has bounding-volume association, X/Y, offset and wrap direction; CLO documents left/right naming conventions for symmetric points. Source: [CLO add arrangement point](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point). **D.** Custom bounding volumes carry joint endpoints and cylinder/cuboid geometry and are editable in an avatar editor. Source: [CLO bounding volume](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume). **D.** CLO can automatically generate arrangement points when eligible OBJ avatars arrive in A or T pose; success is not guaranteed on arbitrary rigs. Source: [CLO automatic creation](https://support.clo3d.com/hc/en-us/articles/360001749467-Automated-Arrangement-Point-Creation).

**E.** Reproduce the *observable workflow*, not undocumented internal implementation. Provide an arrangement-point selector, visible avatar regions, hover ghost, wrap sign, scalar clearance, local rotation, mirror handling and contextual failure explanations. Maintain stable identity across avatar shape changes. A role guess alone must never overwrite an explicit user placement.

## 04. Canonical coordinate systems and units

**E.** Introduce precise frame types: `Pattern2D.cm`, `PatternMeshRest.m`, `AvatarLocal.m`, `World.m`, `RenderWorld.m`; store conversion at boundaries rather than sprinkling factors of 0.01. A rigid placement acts on local mesh points by `x_world = T_world_avatar * T_avatar_anchor * R_panel * x_rest`. Distinguish pose-dependent anatomical frame, saved arrangement transform and simulated deformed vertex positions. Normals are inverse-transpose transformed under nonuniform scale. Negative determinant changes face orientation and sewing winding assumptions and demands an explicit remapping, never a silent reflection.

**E.** Invariants: all finite coordinates; fixed handedness; agreed avatar forward/up vectors; stable pattern origin; simulation data in SI; persisted numeric precision declared; one canonical result for front/back normal. Regression: asymmetric front/back pattern, 90° avatar turn, nonuniform imported scale and mirrored left/right garment survive render/save/reopen with signed normals and dimensions intact. Units must accompany every import and export and defaults must be visible.

## 05. Avatar anatomical model and metadata

**D.** CLO's avatar editor includes avatar size, arrangement points, volumes and basic/surface/tape/circumference measurements; its size and mesh assets are distinct file types. See [CLO Avatar Editor guide](https://support.clo3d.com/hc/en-us/articles/360052611653-CLO-Avatar-Editor-Guide) and [file formats](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats). **D.** Marvelous Designer's avatar editor documents distinct basic and surface measurements and editable arrangement metadata. See [MD Avatar Editor](https://support.marvelousdesigner.com/hc/en-us/articles/47358128221337-Avatar-Editor-ver-2025-0).

**E.** Store `AvatarAsset {id, meshHash, skeletonHash?, neutralPose, bodyAxis, units, landmarks[], measurementDefinitions[], signedDistanceVersion?, confidence}`. Landmark positions use an avatar triangle ID with barycentric coordinates for surface adherence, and/or skeleton-local coordinates when robust across animation. Each measure carries route type (`euclidean`, `meshGeodesic`, `planeSection`, `surfaceTape`) and reference pose. Reject “exact waist” if waist plane was guessed without calibration. Avatar scaling invalidates cached skin clearance and pressure calibration. Three manually checked anthropometric landmark sets on different body morphs form the first evidence dataset.

## 06. Shape-dependent arrangement frames

**E.** Replace hard-coded torso Z and sleeve X positions with a target surface frame `A=(p,n,t,b)`, where `p` is an avatar surface sample, `n` its outward unit normal, `t` a tangent aligned with garment grain/body vertical or limb axis, and `b=n×t`. Re-orthogonalize `t` via Gram-Schmidt: `t' = normalize(t-(t·n)n)`. Use skeleton joint axis, region geodesic direction or manually configured landmark orientation to avoid unstable tangent flips. For limbs, define longitudinal coordinate by projected joint distance and circumference coordinate by angle around the local limb axis.

**E.** Surface samples must have persistent region identifiers and confidence. At shoulders/underarms, smooth patch transitions or require user confirmation rather than allowing a point to jump across nearby but anatomically different surfaces. If avatar topology changes, rematch using landmark plus region, then report mismatch if confidence is below a defined threshold. Acceptance: avatar size morph ±20% maintains correct side and mirror symmetry; sleeves do not teleport across arms when elbow flexes.

## 07. Bounding volumes and acceleration

**E.** Joint-bound cylinders/capsules are useful for first-hit placement but not sufficient for body collision. Use an `AvatarRegionVolume` with joint references, transform, primitive type, side, priority, capsule radius profile and optional manually edited footprint. A surface BVH accelerates precise raycast/closest-point; a narrow-band signed distance field can accelerate clearance for repeated solver queries if robust sign can be computed from watertight oriented mesh. Non-watertight avatars need two-sided closest surface with separately inferred normal and an `ambiguous_inside` state.

**E.** Broad phase cost targets are measured as function of panel triangles N, avatar triangles M and contacts K: avoid per-frame all-pairs `O(NM)`; use hierarchical traversal and temporal coherence. Cache by `(avatarMeshHash, poseRevision, scaleRevision)`, rebuild only deforming sections when possible. Test thin concavities, gap between arm and torso, crossed legs, mirrored imported meshes and zero-area triangles. Collision tests are independent of pretty bounding-volume drawing.

## 08. Pre-simulation panel curvature geometry

**E.** A physically consistent initializer maps rest 2D coordinates `u=(s,t)` to an offset anatomical manifold `x(u)=S(φ(u))+d n(S(φ(u)))`, where `S` is the local target surface, `φ` a parameterization, and d configurable clearance. A simple cylinder initial guess on torso/arm may use `x(s,t)=c(t)+r(t)[cos(θ_0+s/r)n_0+sin(θ_0+s/r)b_0]+d n(s,t)`; taper and torso curvature require sampled avatar surface. Preserve UVs and original 2D edge arclength; bending should approximate isometry. Objective: minimize `E = λ_l Σ_ij (||x_i-x_j||-L_ij)^2 + λ_d Σ_i (signedDistance(x_i)-d)^2 + λ_s E_smooth + λ_o E_orientation`, with constrained region and seam margins.

**E.** Do not silently push a broad piece into an intersecting avatar just to make preview look draped. The proposed canonical `ArrangementState` must output initial particle positions `x0`, not merely render replacements. Use a conservative collision-free projection and clearance certificate before handing x0 to the Rust solver. Track failure classes `no_surface`, `self_intersection`, `avatar_penetration`, `unreachable_wrap`, `inverted_triangle`. Current `nativePreDrapeCurvature.js` is intentionally render-only (**V**); adapting its heuristics directly as physical initial conditions without validity checks would be unsafe.

## 09. Arranging before and after simulation

**E.** State machine: `Flat → DraftArrangement → CheckedInitialState → Simulating → PausedSolved → ExportableSnapshot`. A paused rigid transform updates authoring placement; a grabbed cloth vertex injects a temporary physical constraint; a post-simulation redrape changes state through explicit transition, invalidating previous solver cache. Undo stores edits to canonical arrangement, not render mesh pointers. When a selected panel has seams, moving only that panel either restarts solve with consistent sewing or declares the temporary preview detached; never conceal a seam constraint discrepancy.

**E.** Save and reopen test compares serialized target attachment, transform and generated initial geometry hash, then checks seam alignment after a short solve. Undo/redo should remain stable under avatar morph and viewport view changes; camera navigation should never dirty the manufacturing document. Preview ghost may be computed asynchronously, but commits need revision checks to discard stale geometry.

## 10. 3D pen and drafting on surfaces

**D.** CLO display controls expose 3D pen markings on avatars and avatar-tape/measure displays. [CLO 3D display toggles](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons). **E.** Implement surface strokes as `SurfaceCurve {id, surfaceId, anchors:[{faceId,barycentric}], interpolation, units, parentPattern?, semanticRole}`. Convert pointer rays to mesh hits and store the surface point in triangle barycentrics so strokes follow avatar pose. Smooth stroke by optimizing geodesic curvature with constrained endpoints, not by merely interpolating projected screen pixels. Maintain explicit states for missing faces after avatar remesh and show broken references.

**E.** For “draw 3D then develop 2D,” define a flattening operation that is either a geometrically valid near-isometric patch (report distortion) or user-approved shaped pattern with darts/seams. In general a doubly curved avatar surface cannot flatten exactly without distortion, so promise quantified residual rather than zero-error mapping. Tests: draw around shoulder, cross mesh face boundary, undo, animate elbow, export reference line on garment, and compare 3D source line length to developed 2D line length.

## 11. Reference guides and precise anatomical rulers

**E.** Support center-front/back, chest, underbust, waist, high hip, hip, shoulder slope, elbow, wrist, knee, inseam and user-defined guides. A circumference guide is the ordered intersection of avatar mesh with a calibrated anatomical plane; stitch open polyline fragments into closed loops with tolerance and assign side/projection. An outline drawn over the front camera view is not an anatomical circumference. Geodesic guides use mesh shortest paths or heat-method approximation with reported discretization error. Capture guide source, avatar revision and measurement definition.

**E.** Overlay depth is policy driven: silhouette/occluded dotted segments; on-surface marks depth-tested; labels projected with anchor-to-label leader lines. At glancing camera angles labels remain legible; behind-body labels fade instead of claiming to lie on the front. Verify rotated avatar, transparent skin, dense seam overlays and perspective/orthographic projection. Guide styles must remain identical in snapshots and exported measurement reports.

## 12. Symmetry and mirror correspondence

**E.** Mirror pairs should be identified by persistent counterpart IDs rather than names ending left/right; CLO documents a naming convention (**D**) but EXO should store explicit links for reliability. Pattern geometry can be symmetric while body placement differs due to asymmetric postures, so mirror geometry and mirror placement are independently selectable. For reflection `M`, transformed winding changes: face indices, material normals, seam start/end, notch parameter t and twist direction need reconciled mappings. Mirror across a calibrated avatar midsagittal plane rather than world X=0 if the avatar is offset or rotated.

**E.** Test a mirrored sleeve with asymmetric notch, zipper tooth direction and printed grain arrow. After duplication and flip-wrap, seam pair identity and 2D printing must remain consistent; a seemingly correct 3D silhouette does not excuse reversed factory metadata.

## 13. Sewing semantics and colored correspondence

**E.** A sewing relationship is a topological association, not a collection of decorative viewport lines. Canonical `SeamPair{id, a:{panelId, edgeId, t0,t1}, b:{...}, orientation, operation, easeDistribution?, seamAllowanceRefs[], constructionOrder}`. Parameterize each edge by rest arclength `s∈[0,L]`; store sampled sewing correspondences `f(s_a)=s_b`, which may represent gathering or easing, and validate monotonicity except at explicitly declared folds. In 3D draw sampled paths directly on deformed mesh using barycentric edge attachment, plus direction arrows, start and end identifiers and precise gap labels. The 2D board and 3D scene must share one seam ID and one deterministic color palette derived from a stable ID hash.

**E.** For elastic ease, define `r=(L_a-L_b)/max(L_a,L_b)` but report local material and grain direction too. Thresholds must be fabric/process specific; 4% ease may be acceptable in one seam and impossible in another. The overlay must distinguish seam adjacency, planned matching point and current physical separation. UX: clicking a magenta seam in 3D highlights precisely the corresponding 2D curve segment and operations ledger; deleting its source edge invalidates that seam with an actionable error.

## 14. Trims, seam allowance and construction hierarchy

**E.** Represent cut edge, stitchline, foldline, edge allowance and trim anchors as separate typed geometries. Seam allowance changes the cutting contour; topstitch is construction information; binding contributes physical layers; zipper hardware includes tape, teeth/pull, endpoints and a sewing operation. For industrial correctness every attachment references stable edge or surface geometry and process parameters, not just world coordinates. Three-dimensional display must not replace deterministic pattern construction metadata.

**E.** Model garment assembly as a DAG of operations, with physical activation ordering: seam closure, topstitch, overlock, adhesive, pressing, trimming and post-process shrink may change stress and drape. Early preview can approximate these effects but must mark which operations are simulated. Regression includes a curved zipper following nonplanar seam, an anchored button that persists across remeshing, and a turned collar with correct front/back material side.

## 15. Difference between strain, stress, tightness and pressure

**D.** CLO documents four distinct fit maps: stress (kPa), strain (%), categorical fit and avatar contact pressure, with distinct user-facing definitions. [CLO garment fit maps](https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps). **E.** EXO should avoid turning one extension estimate into all four. For each fabric triangle, form rest tangent basis `D_m=[u_1-u_0,u_2-u_0]` in material coordinates and deformed basis `D_s=[x_1-x_0,x_2-x_0]`; `F=D_s D_m^{-1}` (3×2). Compute `C=F^T F`, Green strain `E_G=(C-I)/2`, stretch along unit warp/weft vectors as `λ=√(a^T C a)`, engineering extension `(λ-1)×100%`. Reject singular/near-zero rest triangles; use material coordinates, never guessed screen orientation.

**E.** Stress requires an identified constitutive law and measured parameters. A simple orthotropic membrane approximation uses `σ=C_mat:ε` with material-specific nonlinear tension and shear; accurate values need lab calibration (e.g., low-load extension, bending, shear and hysteresis). Contact pressure `p=N/A` requires physically meaningful normal contact force N and contact area A, including discretization assumptions; a point count or penetration depth alone is not pressure. Fit categories need body-region, ease, stretch and wearer-validated discomfort thresholds; otherwise show `unvalidated fit heuristic`, not clinical certainty.

## 16. Numerical diagnostics and legends

**E.** Each map reports `{kind, units, meshRevision, solverRevision, validity, scaleMin, scaleMax, perFaceValues, sourceParameters}`. Use a fixed quantitative legend for reproducibility and optionally a fabric-relative legend for design iterations. A color gradient without the numeric domain and method is scientifically ambiguous. Retain discontinuities across material boundaries and show precise per-triangle probes on click: warp stretch, weft stretch, shear, principal stretches and confidence. If the solver does not expose stress or forces, offer only strain/extension and an explicit unavailable state.

**E.** Compare triangle-level predictions under tensile uniaxial and pure shear analytical cases; assert zero strain on exact rigid transform, homogeneous stretch `λ=1.10` reads +10% in loading direction, and no NaN from inverted or degenerate elements. Pressure probe must integrate over known area and report force conservation in a simple loaded contact patch. Colors never enter the physics solver as data.

## 17. Manufacturing POM measurements

**E.** Points of measure (POM) belong to a typed `MeasurementDefinition` with target garment size, measuring posture, flat/on-body state, endpoints or landmarks, pathway (`straight`, `surface`, `seamwalk`, `circumference`), allowance treatment and tolerance. The same named chest width can mean flat half-girth or around-avatar circumference, and must not be conflated. Factory POM records include target, measured sample, absolute/percent difference, allowable range, operator, date and revision.

**E.** Build POM evaluation against canonical pattern edges and/or deformed garment mesh; after every topology edit remap anchors or invalidate them. Seam walking integrates cubic edges with adaptive quadrature, not chord sums at arbitrary render sampling. A production review should display pattern size, measurement recipe, nominal value, tolerances, fit sample and unresolved exceptions in one auditable report.

## 18. Material cards and calibration

**E.** `FabricCard` holds areal density (kg/m²), warp/weft extension curves, biaxial response, shear law, bending stiffness in two directions, thickness, compression, friction, damping, shrinkage and environmental condition; each measured property states test method, specimen dimensions, conditioning, supplier lot and confidence interval. Visual PBR, normal maps and woven texture frequency belong to a separate appearance card linked by material ID. Matching screenshots cannot establish physical parity.

**E.** Proposed calibration: collect repeated force-extension data across warp/weft/bias, bending cantilever data, fabric-fabric and fabric-skin sliding, sample panel drapes, and optical marker trajectories. Fit parameters with bounded optimization `min_θ Σ_k w_k ||observable_sim(θ)-observable_lab||² + λ||θ-θ_prior||²`; use held-out specimens for predictive validation to avoid parameter overfit. Material card hashes are mandatory in performance comparison.

## 19. Numerical fabric model and fidelity tiers

**E.** Runtime choices should reflect validated accuracy/runtime tradeoffs: membrane stretch/shear triangles and discrete shell bending, contact and explicit sewing constraints. A thin-shell energy is `Π(x)=Σ_f A_f^0 W_mem(F_f)+Σ_e L_e^0 W_bend(θ_e-θ_e^0)+E_seams+E_contact+E_gravity`; solve with a stable implicit method for high-quality fitting and optionally accelerated projective/XPBD preview with physically interpretable compliance mapping. Explicitly document that PBD compliance changes with time step and iterations unless corrected.

**E.** For quasi-static fit solve `∇Π(x)=0` with robust line search and convergence checks on residual force, maximum displacement and constraint violation. For dynamic motion integrate inertia and damping with substeps; contact robustness requires conservative collision detection, friction stabilization and careful self-collision handling. Implement coarse-to-fine mesh continuation; report any fabric bias caused by triangles aligned with warp differently. A fast mode and a reference mode must share material metadata and disclose numerical differences.

## 20. Collision, clearance and assembly stability

**E.** Pre-simulation validity tests evaluate minimum signed avatar clearance, triangle normals, garment self-intersection and seam partner distance. During solve, use continuous collision detection or conservative substeps for fast motions; combine broad phase spatial BVH with narrow phase vertex-face and edge-edge events. Contact forces integrate thickness offsets; robust iterative solvers must handle near-parallel triangles and meshes initially intersecting. Never silently resolve an impossible initial overlap by massively displacing a garment without recording the correction.

**E.** Define metrics: max penetration (mm), intersection count, contact impulse/area validity, open-seam distance distribution, solver residual, energy change and divergence flag. A no-friction preview may be acceptable in exploration, but needs labeling in fit artifacts. Challenge tests: narrow armhole, waistband wrapping torso, layered pocket, crossed sleeves and compression foam over a curved body.

## 21. DXF-AAMA, DXF-ASTM and dimensional fidelity

**D.** CLO explicitly supports DXF-AAMA, DXF-ASTM and standard DXF for importing/exporting pattern geometry and notes units, annotation, grading and seam allowance handling. [CLO DXF import/export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export). **E.** EXO should distinguish a DXF carrier of drawing primitives from apparel-specific semantic layer/content mappings. Use a documented vendor-neutral internal graph: `PatternPiece → ClosedCutline, SewLine, InternalLines, Notches, DrillHoles, Grainline, Labels, SeamAllowances, SizeVariants, RuleTables`. An entity may be geometrically valid yet semantically incorrect for a factory import profile.

**E.** Build importer stages `parse → explicit unit normalization → typed geometry → topology validation → apparel semantic mapping → report`, and reverse export with destination profiles. Export round-trip invariants: signed area, perimeter, canonical vertex chain within metric tolerance, notch station, drill-point distance, grain arrow orientation, seam allowance profile and graded size association. Supply conversion warnings for unsupported custom curves and use tessellation with Hausdorff error bound, e.g. ≤0.10 mm for an initial engineering target that manufacturers may tighten. Compare files in at least two independent CAD readers before calling interoperability production ready.

## 22. Grading and avatar size sets

**E.** A graded pattern should be derived from stable base topology and per-anchor rules, not independently redrawn arbitrary vertex sets. Store `GradeRule {basePointId, sizeCode, Δx_mm, Δy_mm}` plus curves and linked notches. Evaluate sizes then validate that all grading profiles preserve seam associations; an underarm point shifting differently across adjoining panels can create inconsistent sewing lengths. Scale avatar body dimensions with explicit anthropometric target data and independently assess fit per size.

**E.** Test at least five size codes, petite/tall variants and an asymmetry case; measure step increments, grade rule round-trip and seam mismatch. Product range fit evidence cannot be extrapolated from medium sample without validation. For DXF exchange, record whether grading information is embedded or exported as accompanying rule file, matching chosen destination profile.

## 23. Scene graph and data contract

**E.** Suggested serializable envelope:

```ts
type GarmentDocument = {
  schemaVersion: number; units: 'mm'; revision: string;
  pieces: PatternPiece[]; sewings: SeamPair[];
  avatar: { assetId: string; meshHash: string; poseId: string };
  arrangement: ArrangementState[];
  fabrics: FabricCardRef[]; measurements: MeasurementDefinition[];
  manufacturing: { sizeSetId: string; processes: Operation[] };
};
type ArrangementState = {
  panelId: string; avatarRegionId?: string; surfaceAnchor?: SurfaceAnchor;
  transform: { translationM: [number,number,number]; quaternion: [number,number,number,number] };
  wrap: { direction: 1|-1; method: 'flat'|'cylinder'|'surface'; offsetM: number };
  sourceRevision: string; validatedInitialPositionsHash?: string;
};
type SimulationRecord = {
  runId: string; documentHash: string; solverVersion: string;
  materialHashes: string[]; avatarHash: string; meshHash: string;
  timestepS: number; convergence: Diagnostics; precision: string;
};
```

**E.** Immutable geometry revisions allow stale async simulation results to be rejected. Store only authoritative data and deterministic references; render buffers, GPU resource handles and hover ghosts stay derived. Migrations must map seam edge identities explicitly, and failed migration must retain raw source plus validation errors instead of silently dropping constraints. Persist camera settings separately from manufacturing revision.

## 24. Performance engineering and reproducible benchmarks

**E.** Instrument at least: import time, arrangement hover latency, placement solve latency, warm BVH query time, cloth solver ms/substep, render ms/frame, peak RSS, GPU memory, draw calls, garbage-collector pauses, export time and round-trip error. Suggested initial targets, which are engineering proposals rather than measured EXO results: hover response p95 under 50 ms on a defined reference Mac; editor input-to-render p95 under 100 ms; simple 50k-triangle preview at ≥30 fps on named hardware; a 250k-triangle high-quality solve measured by seconds-to-convergence instead of FPS. Quality must gate every speed comparison.

**E.** Benchmark matrix: triangle counts 5k/25k/50k/100k/250k, avatars 20k/100k/500k triangles, one/four/twelve garments, zero/one/ten trim collections, cold/warm cache, rest/animated pose and mixed fabric stiffness. Run 10 warmed replicates after a separate cold-start measurement; report median, p95 and IQR. Hash inputs and retain traces. Optimize repeated `preDrapeDisplayPositions` avatar traversal with per-pose spatial indices if profiling justifies it; avoid per-snapshot rebuilding of topology and line correspondence.

## 25. Validation suite, manufacturing release and differentiators

**E.** Test pyramid: analytical geometry (circle circumference, rigid transform), property-based topology (orientation, closed cutline, invariant edge IDs), simulation unit cases (uniform strain, gravity sag, bending strip, seam joining), integration (avatar wrap → sew → simulate → measure → export → import) and factory correlation (physical sewn sample). Calibrate scanner and measuring tape errors and calculate 95% confidence intervals for garment POM prediction. Report both signed bias and absolute error; selective use of visually favorable angles does not count as scientific comparison.

**E.** Potential competitive innovation: explainable geometric placement showing surface contact, clearance and seam alignment before simulate; error-aware fit maps with physics provenance; editing 2D and 3D as one dependency graph; automatic cutline/DXF validation against factory rules; and per-size manufacturability reports. These are design hypotheses. A measurable claim of superiority would require preregistered benchmarks and blind users comparing task completion, fabric fidelity and factory import error with target versions of CLO and Marvelous, on the same hardware and fixtures.

## 26. Browzwear VStitcher: multi-size engineering reference

**D.** VStitcher documents a 3D Review workspace with parallel views of garments, sizes and avatars, including pressure-map variation between sizes. This is a strong benchmark for a manufacturer's ability to discover fit differences invisible in a single-size model. [Browzwear 3D Review Workspace](https://help.browzwear.com/en/articles/13065807-3d-review-workspace). **D.** Browzwear documents automatic simulation of multiple sizes in VStitcher 2026.1.2 and improvements to DXF; [VStitcher release notes](https://help.browzwear.com/en/articles/14794274-vstitcher-2026-1-2-release-notes). **D.** VStitcher also documents independent arrangement controls per size or linked arrangement across size sets; [2023.2 release notes](https://help.browzwear.com/en/articles/13065198-release-notes-vstitcher-2023-2-pre-release). **D.** Direct grade-point editing on non-base sizes is documented from VStitcher 2025.2; [grading article](https://help.browzwear.com/en/articles/13065373-edit-non-base-size-while-grading).

**E.** EXO should model fit evaluation as a matrix `(patternSize × avatarBody × pose × materialLot)`, not a single hero render. A simulation run has immutable keys for each matrix coordinate, and a comparison view shares a camera and normalized diagnostic legends across cells. Each map has a display scale locked across sizes; auto-rescaling each panel's red/blue values could hide worsening tightness. Include an automatic matrix summary with POM error, p95 warp/weft stretch, max seam gap, contact-normal pressure percentile and non-wearable classification when those quantities have validated definitions. Build a multi-size scheduler that deduplicates shared pattern and avatar assets, uses bounded concurrency and reports failure per size without discarding successful runs.

**E.** Benchmark test: simulate XS through 2XL against matched avatars; change one shoulder-grade rule, rerun affected sizes, assert untouched sizes reuse valid cached artifacts and every visible fit-map cell identifies its fabric and solver run. Comparative evaluation should measure the number of incorrect sizes detected before a physical sample, rather than simply counting how many models can be rendered side by side. **U.** No multi-size solver matrix or equivalent VStitcher 3D Review implementation was verified in the EXO code paths inspected in this report.

## 27. Browzwear physical fabric measurement and diagnostic units

**D.** Browzwear documents its Fabric Analyzer as collecting the full force-extension curve and translating measurements into parameters for mass, thickness, bending, stretch and shear. The official description does not establish the proprietary conversion equations. [Fabric Analyzer manual](https://help.browzwear.com/en/articles/13065916-fabric-analyzer). **D.** The VStitcher tension map shows a legend in gr/cm², color-coded tension, and hover readouts for maximum stretch in length and width. [Tension map](https://help.browzwear.com/en/articles/13854342-tension-map). **D.** Its pressure map shows body-pressure visualization and can be reviewed per animation frame. [Pressure map](https://help.browzwear.com/en/articles/13854350-pressure-map).

**E.** EXO should build an open calibration protocol that accepts CSV curves from verified lab instruments and exposes how fitted coefficients depend on the measurements. Raw force data should store N, extension ratio or mm, sample width and gauge length, direction, preconditioning cycles and replicate ID; a curve in N must not be interpreted as material stress until the cross-section/width convention is defined. Use units-aware conversion with explicit dimensions: `N/m` is fabric membrane tension, `Pa=N/m²` is 3D Cauchy stress, and `N/m²` from contact normal forces per surface area is contact pressure; these are distinct quantities. If comparing to VStitcher displays using gr/cm², document its stated scale verbatim and avoid assuming whether “gr” denotes gram-force without further vendor clarification.

**E.** Publish a fabric calibration coverage score: count required measurements, directional anisotropy observations, hysteresis replicates and confidence limits. On a blind drape holdout, report displacement RMSE and 95th-percentile silhouette error across several poses. Performance gains count only if the same calibration record is used. **U.** The inspected EXO UI reports extension but is not verified to consume instrument-grade fabric curves or yield a calibrated pressure map.

## 28. Optitex: pattern production and fit visualization

**D.** Optitex's official products page describes 2D/3D garment workflows, multiple layers/gathering simulation and an XY tension map in PDS. It also describes stretch and unique-color maps for side-by-side fit review in OPTINEDCloud. These are product-described capabilities; marketing statements such as “95% Accuracy” have unspecified dataset, error metric and test conditions in the cited page and must not be treated as scientific validation. [Optitex products](https://optitex.com/products/).

**E.** Adopt Optitex as an additional interoperability and 2D production benchmark: execute the same reference pattern through EXO and a licensed Optitex environment with units, seam notches, drill marks, annotations, grading and per-size cutlines checked. A tension visualizer must state whether it combines X/Y strain, material membrane force or another scalar, and must give a mathematically defined reduction from the directional tensor. EXO's potential improvement is simultaneously showing signed warp/weft stretch, shear and pressure without hiding directionality behind a single “XY tension” value. This is a proposed comparison, not a claim that Optitex lacks other analysis tools.

**E.** A vendor-neutral test corpus should contain source DXF-AAMA/ASTM files produced by multiple CAD systems, factory-verified pattern drawings, expected area/perimeter/notch positions and tool-version screenshots. Maintain source ownership and redistribution rights. **U.** No live Optitex import or direct Optitex-to-EXO fit correlation was performed in this audit.

## 29. Four-product competitive evaluation protocol

**E.** Compare CLO, Marvelous Designer, Browzwear VStitcher and Optitex on the same physical T-shirt, fitted trousers, padded jacket and asymmetrical technical garment. Keep identical raw body scan, body landmark definitions, 2D master CAD, fabric test specimens, calibrated camera poses and constructed sewn garments; adapt exchange features only when the application's documented importer requires it, and record all adaptation. Each run should identify exact installed version and hardware.

| Dimension | What to test | Ground truth / scoring |
|---|---|---|
| Arrangement UX | First reliable avatar placement of 12 panels | Blind operator task time, wrong-side events and placement corrections |
| Multi-size fit | Five patterns against matching avatars | Per-size POM bias and pressure/strain differences, where calibrated |
| Fabrics | Warp/weft/bias and multi-ply drape | Lab force curves, hanging silhouette scans, bending strip |
| Manufacturing | Notches, SA, grade, drill points, annotations | Factory approval and CAD round-trip residuals |
| Stability | Fit, move, undo, resimulate, save/reopen | Failure rate, mismatched IDs and unexplained model changes |
| Speed | Full model to validated convergence | Elapsed time and error at fixed workstation/mesh settings |

**E.** Collect at least three operator repetitions per workflow and multiple independent cloth samples where possible; preregister acceptance tolerances with a technical patternmaker. Track uncertainty from sewing variation, material batch and avatar scan. Without this common evidence, benchmark claims remain qualitative and cannot establish that EXO predicts manufacturing fit better than its competitors.

### Prioritized implementation work packages

| Package | Dependencies | Deliverable | Release evidence |
|---|---|---|---|
| P0 canonical coordinates | Geometry + avatar schema | SI transforms and ID-stable frames | Mirror/unit/orientation tests |
| P0 arrangement anchors | BVH + landmarks | Anatomical hover, placement and curved initial geometry | Reload and zero-penetration suite |
| P0 seam visualization | Canonical seam IDs | Both viewports share colored arclength mapping | Reversed/eased seam acceptance |
| P0 actual solver handoff | Arrangement + contact | Initial positions committed into physics, validity report | Before/after energy and gap logs |
| P0 honest fit outputs | Material + solver telemetry | True strain and physically derived stress/pressure where available | Analytical tests, calibration specimens |
| P0 factory exchange | Stable pattern topology | DXF-AAMA/ASTM profiles + round-trip reports | Independent importer and tolerance audit |
| P1 measurement guides | Calibrated avatar/garment references | Body guides, surface tape, POM definitions | Repeated measurement variability |
| P1 grading and production | POM, notch, seams | Multi-size handoff and tech pack provenance | Five-size sample inspection |
| P1 performance | Profilers + deterministic fixtures | Optimization with reproducible speed/fidelity plots | Hardware-named p95 results |

### Official documentation references

1. CLO: [Avatar Editor Guide](https://support.clo3d.com/hc/en-us/articles/360052611653-CLO-Avatar-Editor-Guide).
2. CLO: [Add Arrangement Point](https://support.clo3d.com/hc/en-us/articles/115000430768-Add-Arrangement-Point).
3. CLO: [Add/Edit Bounding Volume](https://support.clo3d.com/hc/en-us/articles/115000431228-Add-Edit-Bounding-Volume).
4. CLO: [Arrange Pattern with Arrangement Points / Flip Wrap](https://support.clo3d.com/hc/en-us/articles/115001999287-Arrange-Pattern-with-Arrangement-Points-Flip-Wrap-Direction).
5. CLO: [Automated Arrangement Point Creation](https://support.clo3d.com/hc/en-us/articles/360001749467-Automated-Arrangement-Point-Creation).
6. CLO: [File Formats](https://support.clo3d.com/hc/en-us/articles/115000470688-CLO-File-Formats).
7. CLO: [3D Vertical Toggle Icons](https://support.clo3d.com/hc/en-us/articles/115001025968-3D-Vertical-Toggle-Icons).
8. CLO: [Garment Fit Maps](https://support.clo3d.com/hc/en-us/articles/360000436368-Garment-Fit-Maps).
9. CLO: [How do you fit 3D Garments](https://support.clo3d.com/hc/en-us/articles/115013660447-How-do-you-fit-3D-Garments-in-CLO).
10. CLO: [2D Pattern DXF Import/Export](https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export).
11. Marvelous Designer: [Avatar Editor](https://support.marvelousdesigner.com/hc/en-us/articles/47358128221337-Avatar-Editor-ver-2025-0).
12. Marvelous Designer: [3D Window Display Icons](https://support.marvelousdesigner.com/hc/en-us/articles/47358200025497-3D-Window-Display-Icons).
13. Marvelous Designer: [Auto Sewing](https://support.marvelousdesigner.com/hc/en-us/articles/47358149073305-Auto-Sewing-Ver-2025-0).
14. Browzwear: [3D Review Workspace](https://help.browzwear.com/en/articles/13065807-3d-review-workspace).
15. Browzwear: [Multiple-size simulation release notes](https://help.browzwear.com/en/articles/14794274-vstitcher-2026-1-2-release-notes).
16. Browzwear: [Fabric Analyzer](https://help.browzwear.com/en/articles/13065916-fabric-analyzer).
17. Browzwear: [Tension Map](https://help.browzwear.com/en/articles/13854342-tension-map) and [Pressure Map](https://help.browzwear.com/en/articles/13854350-pressure-map).
18. Optitex: [Products and features](https://optitex.com/products/).

**Audit limitations:** The cited vendor manuals establish observable workflow capabilities, not proprietary algorithm specifications. All equations and thresholds labeled **E** are engineering proposals requiring prototype implementation, measured calibration and factory acceptance. EXO evidence labeled **V** is static code inspection on a dirty concurrently changing tree, not a certified system-level test.
