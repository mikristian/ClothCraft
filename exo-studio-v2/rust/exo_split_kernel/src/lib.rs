//! Deterministic 2D Add Point / Split Line calculations.
//! Caller validates edge, units, split method and manufacturing thresholds.
//! The same Rust functions compile for macOS and wasm32 without browser code.

use exo_geometry_kernel::quadratic_arc_length;

pub const ABI_VERSION: u32 = 1;

pub fn uniform_fraction(index: u32, count: u32) -> f64 {
    if count < 2 || index == 0 || index >= count {
        return f64::NAN;
    }
    index as f64 / count as f64
}

pub fn length_fraction(distance_cm: f64, edge_cm: f64) -> f64 {
    if !distance_cm.is_finite() || !edge_cm.is_finite() || edge_cm <= 0.0 {
        return f64::NAN;
    }
    distance_cm / edge_cm
}

pub fn ratio_fraction(percent: f64) -> f64 {
    if !percent.is_finite() {
        return f64::NAN;
    }
    percent / 100.0
}

/// Invert the true quadratic Bézier arc length using the existing Rust
/// geometry kernel's adaptive Simpson integration and 30 bisection steps.
/// The control and endpoints use the same pattern centimetres as the caller.
pub fn quadratic_arc_parameter(coords: [f64; 6], fraction: f64) -> f64 {
    if !coords.iter().all(|n| n.is_finite()) || !fraction.is_finite() {
        return f64::NAN;
    }
    let f = fraction.clamp(0.0, 1.0);
    let total = quadratic_arc_length(coords, 0.0, 1.0, 1e-7);
    if !total.is_finite() || total < 1e-9 {
        return f64::NAN; // Existing JS fallback handles degenerate curves.
    }
    let target = f * total;
    let (mut low, mut high) = (0.0_f64, 1.0_f64);
    for _ in 0..30 {
        let mid = (low + high) / 2.0;
        let walked = quadratic_arc_length(coords, 0.0, mid, 1e-7);
        if walked < target { low = mid; } else { high = mid; }
    }
    if f == 0.0 { 0.0 } else if f == 1.0 { 1.0 } else { (low + high) / 2.0 }
}

#[no_mangle]
pub extern "C" fn exo_split_abi_version() -> u32 { ABI_VERSION }

#[no_mangle]
pub extern "C" fn exo_split_uniform_fraction(index: u32, count: u32) -> f64 {
    uniform_fraction(index, count)
}

#[no_mangle]
pub extern "C" fn exo_split_length_fraction(distance_cm: f64, edge_cm: f64) -> f64 {
    length_fraction(distance_cm, edge_cm)
}

#[no_mangle]
pub extern "C" fn exo_split_ratio_fraction(percent: f64) -> f64 {
    ratio_fraction(percent)
}

#[no_mangle]
pub extern "C" fn exo_split_quadratic_parameter(
    ax: f64, ay: f64, cx: f64, cy: f64, bx: f64, by: f64, fraction: f64,
) -> f64 {
    quadratic_arc_parameter([ax, ay, cx, cy, bx, by], fraction)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scalar_split_fractions() {
        assert_eq!((1..4).map(|i|uniform_fraction(i,4)).collect::<Vec<_>>(), vec![0.25,0.5,0.75]);
        assert_eq!(length_fraction(5.0,20.0),0.25);
        assert_eq!(ratio_fraction(30.0),0.3);
        assert!(uniform_fraction(0,4).is_nan());
        assert!(length_fraction(2.0,0.0).is_nan());
    }

    #[test]
    fn curved_edge_arc_fraction_is_physical_length() {
        let coords=[0.0,0.0,18.0,20.0,20.0,0.0];
        let total=quadratic_arc_length(coords,0.0,1.0,1e-7);
        for fraction in [0.05,0.25,0.5,0.75,0.95] {
            let t=quadratic_arc_parameter(coords,fraction);
            assert!(t>=0.0 && t<=1.0);
            let walked=quadratic_arc_length(coords,0.0,t,1e-7);
            assert!((walked-total*fraction).abs() < 0.00001);
        }
    }

    #[test]
    fn straight_and_degenerate_cases() {
        let coords=[0.0,0.0,5.0,0.0,10.0,0.0];
        assert!((quadratic_arc_parameter(coords,0.3)-0.3).abs()<1e-8);
        assert_eq!(quadratic_arc_parameter(coords,0.0),0.0);
        assert_eq!(quadratic_arc_parameter(coords,1.0),1.0);
        assert!(quadratic_arc_parameter([0.0;6],0.5).is_nan());
    }
}
