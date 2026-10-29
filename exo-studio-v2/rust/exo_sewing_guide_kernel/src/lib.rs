//! Sample indices for the 2D sewing correspondence overlay.
//! Sampling changes guide visibility only, never the actual sewn links.

/// Matches Math.round(i * (count - 1) / (size - 1)) for valid inputs.
/// f64 arithmetic preserves the existing JS behavior through MAX_SAFE_INTEGER.
pub fn sample_index(count: u64, size: u32, index: u32) -> f64 {
    if count == 0 || size == 0 || index >= size {
        return f64::NAN;
    }
    if size == 1 {
        return 0.0;
    }
    ((index as f64 * (count - 1) as f64) / (size - 1) as f64).round()
}

#[no_mangle]
pub extern "C" fn exo_sewing_guide_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_sewing_guide_index(count: f64, size: u32, index: u32) -> f64 {
    if !count.is_finite() || count <= 0.0 || count.fract() != 0.0 ||
        count > 9_007_199_254_740_991.0 {
        return f64::NAN;
    }
    sample_index(count as u64, size, index)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_short_counts_and_endpoints() {
        for count in 1..=12_u64 {
            for i in 0..count as u32 {
                assert_eq!(sample_index(count, count as u32, i), i as f64);
            }
        }
        for (count, size) in [(13,12), (49,48), (250,12), (1000,48)] {
            assert_eq!(sample_index(count,size,0), 0.0);
            assert_eq!(sample_index(count,size,size-1), (count-1) as f64);
        }
    }

    #[test]
    fn distributes_guides_across_dense_seams() {
        for (count,size) in [(13,12), (120,12), (49,48), (1000,48)] {
            let indices: Vec<_> = (0..size).map(|i| sample_index(count,size,i) as u64).collect();
            assert!(indices.windows(2).all(|pair| pair[0] < pair[1]));
            let gaps: Vec<_> = indices.windows(2).map(|pair| pair[1]-pair[0]).collect();
            assert!(gaps.iter().max().unwrap()-gaps.iter().min().unwrap() <= 1);
        }
    }

    #[test]
    fn abi_handles_invalid_and_large_counts() {
        assert_eq!(exo_sewing_guide_abi_version(),1);
        assert!(exo_sewing_guide_index(f64::NAN,12,0).is_nan());
        assert!(exo_sewing_guide_index(0.0,12,0).is_nan());
        assert_eq!(exo_sewing_guide_index(9_007_199_254_740_991.0,12,11),
            9_007_199_254_740_991.0);
    }
}
