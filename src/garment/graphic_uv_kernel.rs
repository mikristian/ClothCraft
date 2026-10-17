//! Dependency-free EXO UV transform functions shared with the browser WASM.
//! This source is also mirrored under EXO Studio's `integrations/clothcraft/rust/`.
//! Do not add crate imports or allocation: `rustc --target wasm32-unknown-unknown`
//! compiles it without a JS glue layer or a separate WebAssembly build system.

#[unsafe(no_mangle)]
pub extern "C" fn exo_graphic_uv_u(center_x: f64) -> f64 {
    center_x.clamp(0.0, 1.0)
}

#[unsafe(no_mangle)]
pub extern "C" fn exo_graphic_uv_v(center_y: f64) -> f64 {
    1.0 - center_y.clamp(0.0, 1.0)
}

#[unsafe(no_mangle)]
pub extern "C" fn exo_graphic_width_uv(scale: f64) -> f64 {
    scale.clamp(0.03, 1.5)
}

#[unsafe(no_mangle)]
pub extern "C" fn exo_graphic_rotation_radians(degrees: f64) -> f64 {
    -degrees.clamp(-180.0, 180.0).to_radians()
}

/// Convert authored millimetres into a unitless fraction of the actual
/// material-space span (also mm), without clamping an intentional overprint.
#[unsafe(no_mangle)]
pub extern "C" fn exo_graphic_mm_ratio(value_mm: f64, span_mm: f64) -> f64 {
    value_mm / span_mm
}

/// Editor coordinates are measured from the top; UV V points upward.
#[unsafe(no_mangle)]
pub extern "C" fn exo_graphic_mm_to_uv_v(value_mm: f64, span_mm: f64) -> f64 {
    1.0 - value_mm / span_mm
}
