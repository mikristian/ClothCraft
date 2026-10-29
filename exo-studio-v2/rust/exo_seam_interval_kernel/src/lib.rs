//! Independent native/WASM seam interval validation used by EXO sewing edits.
//! All intervals are fractions of the *same* authored cutline edge, not lengths.

pub fn interval_valid(start: f64, end: f64) -> bool {
    start.is_finite() && end.is_finite() && start >= 0.0 && end <= 1.0 && start < end
}

pub fn intervals_overlap(a_start: f64, a_end: f64, b_start: f64, b_end: f64, epsilon: f64) -> bool {
    interval_valid(a_start, a_end)
        && interval_valid(b_start, b_end)
        && a_end.min(b_end) - a_start.max(b_start) > epsilon
}

#[no_mangle]
pub extern "C" fn exo_seam_interval_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_seam_interval_valid(start: f64, end: f64) -> u32 {
    u32::from(interval_valid(start, end))
}

#[no_mangle]
pub extern "C" fn exo_seam_intervals_overlap(
    a_start: f64, a_end: f64, b_start: f64, b_end: f64, epsilon: f64,
) -> u32 {
    u32::from(intervals_overlap(a_start, a_end, b_start, b_end, epsilon))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_half_open_unit_ranges() {
        assert!(interval_valid(0.0, 1.0));
        assert!(interval_valid(0.3, 0.5));
        for (start, end) in [(-0.01, 0.5), (0.3, 1.01), (0.5, 0.5),
            (0.6, 0.4), (f64::NAN, 0.9), (0.1, f64::INFINITY)] {
            assert!(!interval_valid(start, end), "unexpected valid {start:?} {end:?}");
        }
    }

    #[test]
    fn overlap_requires_shared_interior_beyond_tolerance() {
        assert!(intervals_overlap(0.1, 0.3, 0.2, 0.4, 1e-5));
        assert!(!intervals_overlap(0.1, 0.3, 0.3, 0.5, 1e-5));
        assert!(!intervals_overlap(0.1, 0.3, 0.299_995, 0.5, 1e-5));
        assert!(intervals_overlap(0.1, 0.3, 0.299_98, 0.5, 1e-5));
        assert!(!intervals_overlap(0.1, 0.3, 0.2, 0.4, f64::NAN));
        assert!(!intervals_overlap(-1.0, 0.3, 0.2, 0.4, 1e-5));
    }

    #[test]
    fn wasm_abi_matches_native() {
        assert_eq!(exo_seam_interval_abi_version(), 1);
        assert_eq!(exo_seam_interval_valid(0.0, 1.0), 1);
        assert_eq!(exo_seam_interval_valid(1.0, 1.0), 0);
        assert_eq!(exo_seam_intervals_overlap(0.1, 0.3, 0.2, 0.4, 1e-5), 1);
        assert_eq!(exo_seam_intervals_overlap(0.1, 0.3, 0.3, 0.4, 1e-5), 0);
    }
}
