//! Polyline measurements and candidate Y brackets for physically sampled curves.
#[no_mangle]
pub extern "C" fn exo_curve_draft_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_curve_draft_alloc(len: usize) -> *mut f64 {
    let mut values = vec![0.0_f64; len];
    let ptr = values.as_mut_ptr();
    std::mem::forget(values);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn exo_curve_draft_free(ptr: *mut f64, len: usize) {
    if !ptr.is_null() && len > 0 { drop(Vec::from_raw_parts(ptr, len, len)); }
}

pub fn brackets(points: &[[f64; 2]], y: f64) -> Vec<usize> {
    if !y.is_finite() { return vec![]; }
    points.windows(2).enumerate().filter_map(|(i, pair)| {
        let a = pair[0]; let b = pair[1];
        if a.iter().chain(b.iter()).any(|v| !v.is_finite()) { return None; }
        let dy = b[1] - a[1];
        if dy.abs() < 1e-10 || a[1].min(b[1]) - 1e-7 > y || a[1].max(b[1]) + 1e-7 < y { None } else { Some(i) }
    }).collect()
}

/// [length, middle x/y, min x, max x, min y, max y].
pub fn measurements(points: &[[f64; 2]]) -> Option<[f64; 7]> {
    if points.len() < 2 || points.iter().flatten().any(|v| !v.is_finite()) { return None; }
    let mut len = 0.0;
    let mut arcs = Vec::with_capacity(points.len() - 1);
    let (mut minx, mut maxx, mut miny, mut maxy) = (f64::INFINITY, f64::NEG_INFINITY, f64::INFINITY, f64::NEG_INFINITY);
    for [x, y] in points { minx = minx.min(*x); maxx = maxx.max(*x); miny = miny.min(*y); maxy = maxy.max(*y); }
    for pair in points.windows(2) {
        let arc = (pair[1][0] - pair[0][0]).hypot(pair[1][1] - pair[0][1]);
        arcs.push(arc); len += arc;
    }
    let mut remaining = len / 2.0;
    let mut index = 0;
    while index < arcs.len() - 1 && remaining > arcs[index] { remaining -= arcs[index]; index += 1; }
    let a = points[index]; let b = points[index + 1];
    let mid = if arcs[index] > 1e-10 {
        [a[0] + (b[0] - a[0]) * remaining / arcs[index], a[1] + (b[1] - a[1]) * remaining / arcs[index]]
    } else { [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0] };
    Some([len, mid[0], mid[1], minx, maxx, miny, maxy])
}

unsafe fn decode(ptr: *const f64, n: usize) -> Option<Vec<[f64; 2]>> {
    if ptr.is_null() || n < 2 || n > 1_000_000 { return None; }
    Some(std::slice::from_raw_parts(ptr, n * 2).chunks_exact(2).map(|p| [p[0], p[1]]).collect())
}

/// Write bracket starting indices, returns number of brackets.
#[no_mangle]
pub unsafe extern "C" fn exo_curve_draft_brackets(ptr: *const f64, n: usize, y: f64, out: *mut f64) -> usize {
    if out.is_null() { return 0; }
    let Some(points) = decode(ptr, n) else { return 0; };
    let indices = brackets(&points, y);
    for (i, index) in indices.iter().enumerate() { *out.add(i) = *index as f64; }
    indices.len()
}

#[no_mangle]
pub unsafe extern "C" fn exo_curve_draft_measure(ptr: *const f64, n: usize, out: *mut f64) -> u32 {
    if out.is_null() { return 0; }
    let Some(points) = decode(ptr, n) else { return 0; };
    let Some(values) = measurements(&points) else { return 0; };
    for (i, value) in values.iter().enumerate() { *out.add(i) = *value; }
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn reversed_and_multiple_brackets() {
        let p = [[0., 0.], [1., 2.], [2., -1.], [3., 2.]];
        assert_eq!(brackets(&p, 1.), vec![0, 1, 2]);
        let reversed: Vec<_> = p.iter().rev().copied().collect();
        assert_eq!(brackets(&reversed, 1.), vec![0, 1, 2]);
        assert!(brackets(&p, 3.).is_empty());
    }
    #[test] fn degenerates_and_arc_middle() {
        let p = [[0., 0.], [0., 0.], [3., 4.]];
        let v = measurements(&p).unwrap();
        assert_eq!(v[0], 5.);
        assert_eq!(&v[1..3], &[1.5, 2.]);
        assert_eq!(&v[3..], &[0., 3., 0., 4.]);
        assert!(measurements(&[[0., 0.], [f64::NAN, 1.]]).is_none());
        assert!(brackets(&[[0., 0.], [0., 0.]], 0.).is_empty());
    }
}
