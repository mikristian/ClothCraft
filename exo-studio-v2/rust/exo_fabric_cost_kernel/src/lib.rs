//! Batched fabric cost evaluation, preserving browser report data outside this kernel.
//! Input rows: [marker_length_cm, supplier_price_or_NaN, requested, placed, unused].
//! Output rows: [extended_cost_or_NaN, status_code] (0 incomplete, 1 unpriced, 2 estimated).
//! Size groups: [first_row, row_count]; output totals: [ready_flag, material_cost_or_NaN].

const MAX_ELEMENTS: usize = 1_000_000;

fn round4(value: f64) -> f64 {
    // Positive finite decimal values follow Number(value.toFixed(4)); the JS caller
    // handles negative inputs and exceptional values through its fallback.
    let scaled = value * 10_000.;
    if !scaled.is_finite() { return value; }
    // Decimal formatting can distinguish binary representations on ties; the adapter
    // conservatively bypasses WASM for ambiguous half-way values.
    scaled.round() / 10_000.
}

pub fn calculate(input: &[f64], groups: &[f64], output: &mut [f64], totals: &mut [f64]) -> bool {
    if input.len() % 5 != 0 || groups.len() % 2 != 0 ||
        output.len() != input.len() / 5 * 2 || totals.len() != groups.len() ||
        !groups.chunks_exact(2).all(|g| g[0].is_finite() && g[1].is_finite() &&
            g[0] >= 0. && g[1] >= 0. && g[0].fract() == 0. && g[1].fract() == 0. &&
            g[0] + g[1] <= (input.len() / 5) as f64) { return false; }
    for (index, chunk) in input.chunks_exact(5).enumerate() {
        let [length, price, requested, placed, unused] = <[f64; 5]>::try_from(chunk).unwrap();
        if !length.is_finite() || length < 0. ||
            !(price.is_nan() || (price.is_finite() && price >= 0.)) ||
            !requested.is_finite() || !placed.is_finite() || !unused.is_finite() {
            return false;
        }
        let complete = unused == 0. && placed == requested;
        let status = if !complete { 0. } else if price.is_nan() { 1. } else { 2. };
        output[index * 2] = if status == 2. { round4((length / 100.) * price) } else { f64::NAN };
        output[index * 2 + 1] = status;
    }
    for (index, group) in groups.chunks_exact(2).enumerate() {
        let start = group[0] as usize;
        let end = start + group[1] as usize;
        let ready = start < end && (start..end).all(|i| output[i * 2 + 1] == 2.);
        totals[index * 2] = if ready { 1. } else { 0. };
        if ready {
            let total = (start..end).fold(0., |sum, i| sum + output[i * 2]);
            totals[index * 2 + 1] = round4(total);
        } else { totals[index * 2 + 1] = f64::NAN; }
    }
    true
}

#[no_mangle]
pub extern "C" fn exo_fabric_cost_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_fabric_cost_alloc(len: usize) -> *mut f64 {
    if len == 0 || len > MAX_ELEMENTS { return std::ptr::null_mut(); }
    let mut values = vec![0.; len].into_boxed_slice();
    let pointer = values.as_mut_ptr();
    std::mem::forget(values);
    pointer
}

/// # Safety
/// Pointer and length must match a live allocation returned by this crate.
#[no_mangle]
pub unsafe extern "C" fn exo_fabric_cost_free(pointer: *mut f64, len: usize) {
    if pointer.is_null() || len == 0 || len > MAX_ELEMENTS { return; }
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(pointer, len)));
}

/// # Safety
/// All four disjoint pointers must come from this module's allocator and remain
/// live through this call; element lengths must match their allocations.
#[no_mangle]
pub unsafe extern "C" fn exo_fabric_cost_calculate(
    input_ptr: *const f64, input_len: usize, group_ptr: *const f64, group_len: usize,
    output_ptr: *mut f64, output_len: usize, total_ptr: *mut f64, total_len: usize,
) -> i32 {
    if [input_len, group_len, output_len, total_len].iter().any(|&n| n == 0 || n > MAX_ELEMENTS)
        || input_ptr.is_null() || group_ptr.is_null() || output_ptr.is_null() || total_ptr.is_null() { return 0; }
    let input = std::slice::from_raw_parts(input_ptr, input_len);
    let groups = std::slice::from_raw_parts(group_ptr, group_len);
    let output = std::slice::from_raw_parts_mut(output_ptr, output_len);
    let totals = std::slice::from_raw_parts_mut(total_ptr, total_len);
    i32::from(calculate(input, groups, output, totals))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn priced_unpriced_and_incomplete() {
        let input = [200., 19.75, 2., 2., 0., 100., f64::NAN, 1., 1., 0., 95., 12., 2., 1., 1.];
        let mut output = [0.; 6]; let mut totals = [0.; 4];
        assert!(calculate(&input, &[0., 1., 1., 2.], &mut output, &mut totals));
        assert_eq!(output[0..2], [39.5, 2.]);
        assert_eq!(output[3], 1.);
        assert_eq!(output[5], 0.);
        assert_eq!(totals[0..2], [1., 39.5]);
        assert_eq!(totals[2], 0.);
        assert!(totals[3].is_nan());
    }
    #[test]
    fn empty_groups_are_unready() {
        let mut output = [0.; 2]; let mut totals = [0.; 2];
        assert!(calculate(&[100., 0., 1., 1., 0.], &[0., 0.], &mut output, &mut totals));
        assert_eq!(output[0], 0.); assert_eq!(totals[0], 0.);
    }
}
