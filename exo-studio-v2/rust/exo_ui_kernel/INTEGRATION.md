# POM label anchor Rust/WASM interface

The native Rust entry is `pom_label_anchor(Point, Point, normal_offset, dx, dy) -> Option<Point>`.
The browser adapter is `src/core/rustPomKernel.js`: initialize with
`await initializeRustPomKernel()` and call `rustPomLabelAnchor(left,right,{normalOffset:0,dx:3.9,dy:-1.8})`.
Inputs and outputs are **SVG viewBox coordinates**, never centimeters. Both platforms use
the same Rust function; WASM exports split x/y for an allocation-free C ABI.

The precise insertion point is `src/components/PatternEditor.jsx` inside the
`clo-pom-station` mapping around the `clo-pom-measurement-label` element currently at
line ~1208, after `left`, `right`, and `mid` are derived with `svgPoint`.
Replace its existing `x={mid.x+3.9}` and `y={mid.y-1.8}` with the adapter's
anchor coordinates, guarded by readiness. The geometry preserves that same
location for `normalOffset:0,dx:3.9,dy:-1.8`. For offset POM callouts, select
`normalOffset` in viewBox units. Import/initialize the adapter at the containing
component lifecycle boundary and trigger a React update after readiness; the
current adapter does not automatically rerender React. **The editor is not yet wired.**

Build from repository root with `cargo test --manifest-path rust/exo_ui_kernel/Cargo.toml`
and `cargo build --manifest-path rust/exo_ui_kernel/Cargo.toml --release --target wasm32-unknown-unknown`.
Copy `rust/exo_ui_kernel/target/wasm32-unknown-unknown/release/exo_ui_kernel.wasm`
to `public/wasm/exo_ui_kernel.wasm` to serve it at the adapter's default URL.

## Rust-native appearance resolver (ABI v1)

The same kernel exports `exo_theme_abi_version`, `exo_theme_resolve_rgb`,
`exo_theme_glow_enabled`, and `exo_theme_full_2d_nest_visible`. Its color
resolver accepts seven ASCII codes spelling `#RRGGBB`, or seven zeroes for
Automatic, and a packed 24-bit fallback. All parsing and fallback decisions
occur in Rust; invalid inputs never become CSS. `src/core/rustThemeKernel.js`
initializes the already-shipped WASM kernel and turns its numeric result into
CSS tokens. The React settings window remains responsible for the pickers and
CSS/SVG rendering; the palette values and full-view nest visibility come from
Rust when the shared kernel is loaded. `data-studio-theme-engine="rust-wasm"`
on the app shell confirms the active native resolver. A missing/old WASM
disables custom coloring and glow until a matching build is installed.

After editing the Rust source, recompile for wasm32-unknown-unknown and copy
the output to `public/wasm/exo_ui_kernel.wasm`. Run
`node --test src/core/rustThemeKernel.test.mjs src/core/rustPomKernel.test.mjs`
to verify shipped WASM exports as well as POM compatibility. Native Rust tests
run with `cargo test --manifest-path rust/exo_ui_kernel/Cargo.toml`.
