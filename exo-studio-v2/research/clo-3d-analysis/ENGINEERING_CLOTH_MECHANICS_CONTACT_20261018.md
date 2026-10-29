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
