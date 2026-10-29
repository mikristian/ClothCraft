//! Handle offset inverse: p +/- 0.18 * derivative.
#[no_mangle]
pub extern "C" fn exo_tangent_drag_abi_version() -> u32 { 1 }

/// side 0 = in; 1 = out. The caller validates the JS array and side string.
#[no_mangle]
pub extern "C" fn exo_tangent_drag_component(value: f64, side: u32) -> f64 {
    if !value.is_finite() || side > 1 { return f64::NAN; }
    value / if side == 0 { -0.18 } else { 0.18 }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_signed_axes() {
        assert_eq!(exo_tangent_drag_component(0.18, 0), -1.);
        assert_eq!(exo_tangent_drag_component(-0.18, 1), -1.);
        assert!(exo_tangent_drag_component(f64::INFINITY, 1).is_nan());
        assert!(exo_tangent_drag_component(1., 2).is_nan());
        assert!(exo_tangent_drag_component(0., 0).is_sign_negative());
        assert!(exo_tangent_drag_component(-0., 0).is_sign_positive());
    }
}
