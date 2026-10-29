const EPS: f64 = 1e-8;

fn cross(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

pub fn triangulate(points: &[[f64; 2]]) -> Option<Vec<u32>> {
    let n = points.len();
    if !(3..=5000).contains(&n) || points.iter().flatten().any(|v| !v.is_finite()) { return None; }
    let mut remain: Vec<usize> = (0..n).collect();
    let mut indices = Vec::with_capacity((n - 2) * 3);
    let mut guard = 0usize;
    while remain.len() > 3 && guard < n * n {
        guard += 1;
        let mut found = false;
        for j in 0..remain.len() {
            let a = remain[(j + remain.len() - 1) % remain.len()];
            let b = remain[j];
            let c = remain[(j + 1) % remain.len()];
            if cross(points[a], points[b], points[c]) <= EPS { continue; }
            let inside = |q: [f64; 2]| cross(points[a], points[b], q) >= -EPS
                && cross(points[b], points[c], q) >= -EPS
                && cross(points[c], points[a], q) >= -EPS;
            if remain.iter().any(|&k| k != a && k != b && k != c && inside(points[k])) { continue; }
            indices.extend_from_slice(&[a as u32, b as u32, c as u32]);
            remain.remove(j);
            found = true;
            break;
        }
        if !found { return None; }
    }
    if remain.len() != 3 { return None; }
    indices.extend(remain.into_iter().map(|k| k as u32));
    Some(indices)
}

#[no_mangle]
pub extern "C" fn exo_foam_tri_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_foam_tri_alloc(bytes: usize) -> *mut u8 {
    match std::alloc::Layout::from_size_align(bytes, 8) {
        Ok(layout) if bytes > 0 => unsafe { std::alloc::alloc(layout) },
        _ => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn exo_foam_tri_free(ptr: *mut u8, bytes: usize) {
    if !ptr.is_null() && bytes > 0 {
        if let Ok(layout) = std::alloc::Layout::from_size_align(bytes, 8) {
            std::alloc::dealloc(ptr, layout);
        }
    }
}

/// Input: n pairs of f64. Output: preallocated 3*(n-2) u32 indices.
/// Returns index count or -1 for untriangulable polygon.
#[no_mangle]
pub unsafe extern "C" fn exo_foam_tri_run(input: *const f64, n: usize, output: *mut u32) -> i32 {
    if input.is_null() || output.is_null() || !(3..=5000).contains(&n) { return -1; }
    let flat = std::slice::from_raw_parts(input, 2 * n);
    let points: Vec<[f64; 2]> = flat.chunks_exact(2).map(|v| [v[0], v[1]]).collect();
    match triangulate(&points) {
        Some(indices) => {
            std::ptr::copy_nonoverlapping(indices.as_ptr(), output, indices.len());
            indices.len() as i32
        }
        None => -1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn square_exact_order() {
        assert_eq!(triangulate(&[[0.,0.],[8.,0.],[8.,8.],[0.,8.]]), Some(vec![3,0,1,1,2,3]));
    }
    #[test]
    fn concave_and_reversal() {
        assert_eq!(triangulate(&[[0.,0.],[7.,0.],[7.,2.],[3.,2.],[3.,7.],[0.,7.]]).unwrap().len(),12);
        assert!(triangulate(&[[0.,0.],[0.,8.],[8.,8.],[8.,0.]]).is_none());
    }
}
