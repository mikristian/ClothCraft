RUST-010 local evidence

Scope: Rust/WASM serializes the eight BOM element types and escapes all five XML attribute characters. JS prepares ordered fields and retains Number/toFixed/coercion semantics, area and cost calculations. Public projectToBomXml remains synchronous and falls back to JS until WASM loads or if serialization fails. Unpaired UTF-16 surrogates use fallback to preserve existing JS output.

Golden bom-xml.json outputs were captured from HEAD:src/core/bomXml.js before the migration. Fixtures cover empty sections, all trim kinds, fabrics without patterns, multiple sizes, costs, quantity rounding, decimal rounding, Unicode and all XML metacharacters.

Passed locally:
- cargo test --offline --manifest-path rust/exo_bom_kernel/Cargo.toml (3 tests)
- node scripts/build-rust-bom-kernel.mjs (offline WASM build and public asset)
- node scripts/check-rust-bom-xml.mjs (golden byte parity in JS fallback and initialized WASM, invalid module, repeated allocation, no project mutation, UTF-16 fallback)
- node scripts/check-digital-techpack.mjs
- node scripts/check-techpack-portable-html.mjs
- git diff --check

Browser UI acceptance remains unverified: no installed frontend dependencies in this snapshot; existing qa-rust-techpack-browser.mjs fails at module resolution because it references an unavailable sibling Playwright installation. No dependencies installed. No native solver validation claimed. Review-only pending browser UI/export QA.
