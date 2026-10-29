# W01 function ownership priority — 2026-10-21 13:47 EDT

**Result: PASS** for deterministic, read-only source triage, revised after W20 identified a bridge fallback false negative. **Rust functional ownership: unverified.** This is static prioritization, not an acceptance audit or an assertion that each function has no Rust equivalent.

Run: `cd tools/rust-migration && node function-ownership-priority-20261021.mjs --top=8`.

Oxc parsed **193** core JS files, found **2,326** function expressions/declarations, **0** parse failures, and **495** scored candidate functions (previously 451). Classification counts: 414 JS numerical, 55 mixed JS/Rust bridge, 63 Rust delegations, **44 Rust bridge numerical fallback candidates**, **485 Rust bridge glue or small JS functions**, 1,265 other JS. Bridge functions now score if they have numerical operations and at least three arithmetic expressions or a numerical loop. Small ABI glue, readiness and delegation functions stay unscored. These heuristics do not prove the numerical body is a runtime-authoritative fallback. Mixed classification does not imply the numerical code actually runs alongside the Rust path. Score uses arithmetic, Math/numeric calls, loops, domain identifiers and function length with fixed caps. It is a review order, not a percentage.

## Top five function-level candidates

| Rank | Function | File:line | Score | Evidence | Workstream scope |
| --- | --- | --- | ---: | --- | --- |
| 1 | `createAvatarWornTeeDisplay` | `src/core/avatarWornTeeDisplay.js:9` | 429 | 103 arithmetic expressions; 7 loops; 18 math calls; 25 domain identifiers; 0 bridge calls | Unmapped; needs scope assignment |
| 2 | `assembleNativeSeams` | `src/core/backends/seamAssembly.js:47` | 421 | 20 arithmetic expressions; 10 loops; 11 math calls; 38 domain identifiers; 0 bridge calls | Unmapped; needs scope assignment |
| 3 | `initialPosition` | `src/core/physics.js:231` | 387 | 185 arithmetic expressions; 1 loop; 49 math calls; 32 domain identifiers; 0 bridge calls | W09 |
| 4 | `addInternalGeometryConstraints` | `src/core/physics.js:655` | 382 | 39 arithmetic expressions; 3 loops; 29 math calls; 13 domain identifiers; 0 bridge calls | W09 |
| 5 | `buildSimulation` | `src/core/physics.js:991` | 376 | 74 arithmetic expressions; 34 loops; 63 math calls; 430 domain identifiers; 1 bridge call; **mixed** | W09 |

Next scoped candidates: `projectToDxf` (`src/core/dxf.js:76`, W07, score 365) and `makeProceduralTextileMaps` (`src/core/textileProcedurals.js:170`, W14, score 353). Unmapped functions should receive explicit workstream ownership before implementation.

## Rust bridge numerical candidates recovered by W20 revision

| Function | File:line | Score | Workstream | Numerical evidence |
| --- | --- | ---: | --- | --- |
| `jsMaterialGuideSpans` | `src/core/rustMaterialGuideKernel.js:38` | 254 | W04 | 22 arithmetic, 3 loops, 7 numerical calls |
| `projectRun` | `src/core/rustPbdKernel.js:65` | 207 | W04 | 28 arithmetic, 4 loops |
| `accumulateRustStructuralStrain` | `src/core/rustStructuralStrainKernel.js:42` | 206 | W04 | 8 arithmetic, 5 loops |
| `rustMaterialGuideSpans` | `src/core/rustMaterialGuideKernel.js:73` | 195 | W04 | 11 arithmetic, 2 loops |
| `rustVertexExtensions` | `src/core/rustStrainKernel.js:64` | 193 | W04 | 10 arithmetic, 4 loops |

These are **inspection priorities**, not verified incomplete migrations. A function named `rust*` can contain WASM marshaling or validation calculations rather than a substantive fallback; reviewers must inspect branch reachability and parity before promoting it to an implementation task. Global top five remain unchanged.

## Validation

- `node --test function-ownership-priority-20261021.test.mjs`: **PASS**, 5 tests, 0 failures, including deterministic classification and priority scoring for bridge numerical fallback versus glue.
- `node --check function-ownership-priority-20261021.mjs`: **PASS**.
- Live source scan above: **PASS**, 0 parse failures.
- File edits limited to two new `tools/rust-migration/function-ownership-priority-20261021*` files and this report. No generated sources, Rust compilation or packaging changes.

Limitations: static Oxc heuristics cannot show executed paths, distinguish active from fallback numerical bodies, prove exhaustive call ownership or establish replacement parity. Bridge files are now evaluated per function with a conservative significance threshold, but the classification may still include marshaling numerics or miss small consequential fallbacks. Source scanning is read-only. W09 functions may already have partial migrated paths; validate call sites and Rust acceptance before assigning migration work.
