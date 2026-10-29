//! Batched polygon horizontal-span operations for manufacturing POM.
//! Packed input: [query_count, point_count, y0, ..., x0,y0, x1,y1, ...] per polygon.
//! Output one maximum-intersection span per query. JS supplies sampled curves.

pub fn spans(points: &[(f64, f64)], levels: &[f64]) -> Vec<f64> {
    levels.iter().map(|&y| {
        let mut min_x = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut count = 0;
        for index in 0..points.len() {
            let (ax, ay) = points[index];
            let (bx, by) = points[(index + 1) % points.len()];
            if (ay - by).abs() < 1e-6 {
                if (y - ay).abs() < 0.2 {
                    min_x = min_x.min(ax.min(bx));
                    max_x = max_x.max(ax.max(bx));
                    count += 2;
                }
                continue;
            }
            if y < ay.min(by) || y > ay.max(by) { continue; }
            let t = (y - ay) / (by - ay);
            let x = ax + (bx - ax) * t;
            min_x = min_x.min(x);
            max_x = max_x.max(x);
            count += 1;
        }
        if count < 2 { 0. } else { max_x - min_x }
    }).collect()
}

#[no_mangle]
pub extern "C" fn exo_measurement_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_measurement_alloc(len: usize) -> *mut f64 {
    if len == 0 || len > 1_000_000 { return std::ptr::null_mut(); }
    let mut values = vec![0.; len].into_boxed_slice();
    let pointer = values.as_mut_ptr();
    std::mem::forget(values);
    pointer
}

/// # Safety
/// Must be a live pointer from exo_measurement_alloc with matching length.
#[no_mangle]
pub unsafe extern "C" fn exo_measurement_free(ptr: *mut f64, len: usize) {
    if ptr.is_null() || len == 0 || len > 1_000_000 { return; }
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}

/// # Safety
/// Disjoint buffers from the module allocator with exactly matching lengths.
#[no_mangle]
pub unsafe extern "C" fn exo_measurement_spans(input: *const f64, input_len: usize,
    output: *mut f64, output_len: usize) -> i32 {
    if input.is_null() || output.is_null() || input_len == 0 || output_len == 0 ||
        input_len > 1_000_000 || output_len > 1_000_000 { return 0; }
    let raw = std::slice::from_raw_parts(input, input_len);
    let target = std::slice::from_raw_parts_mut(output, output_len);
    let mut in_at = 0;
    let mut out_at = 0;
    let mut calculated = Vec::with_capacity(output_len);
    while in_at < raw.len() {
        if in_at + 2 > raw.len() { return 0; }
        let queries = raw[in_at]; let count = raw[in_at + 1];
        if !queries.is_finite() || !count.is_finite() || queries < 1. || count < 2. ||
            queries.fract() != 0. || count.fract() != 0. { return 0; }
        let (queries, count) = (queries as usize, count as usize);
        in_at += 2;
        if queries > output_len - out_at || queries > raw.len().saturating_sub(in_at) ||
            count > (raw.len().saturating_sub(in_at + queries)) / 2 { return 0; }
        let levels = &raw[in_at..in_at + queries]; in_at += queries;
        let coords = &raw[in_at..in_at + count * 2]; in_at += count * 2;
        if !levels.iter().all(|v| v.is_finite()) || !coords.iter().all(|v| v.is_finite()) { return 0; }
        let points: Vec<_> = coords.chunks_exact(2).map(|p| (p[0], p[1])).collect();
        calculated.extend(spans(&points, levels));
        out_at += queries;
    }
    if out_at != target.len() { return 0; }
    target.copy_from_slice(&calculated);
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn measures_horizontal_sections() {
        assert_eq!(spans(&[(0., 0.), (10., 0.), (10., 20.), (0., 20.)],
            &[0., 5., 20., 25.]), vec![10., 10., 10., 0.]);
    }
}
