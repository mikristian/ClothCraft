#[no_mangle]
pub extern "C" fn exo_selection_metrics_abi_version() -> i32 { 1 }

#[no_mangle]
pub extern "C" fn exo_selection_metrics_alloc(words: usize) -> *mut f64 {
    let mut data = vec![0.0; words];
    let ptr = data.as_mut_ptr();
    std::mem::forget(data);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn exo_selection_metrics_free(ptr: *mut f64, words: usize) {
    if !ptr.is_null() { drop(Vec::from_raw_parts(ptr, words, words)); }
}

/// Input is a packed boundary of (uv_x, uv_y, live_x, live_y, live_z) f64 tuples.
/// Output is (2D length cm, 3D length cm); returns 1 on valid nonzero rest length.
#[no_mangle]
pub unsafe extern "C" fn exo_selection_metrics_interval(
    ptr: *const f64, count: usize, from: f64, to: f64, output: *mut f64,
) -> i32 {
    if ptr.is_null() || output.is_null() || count < 2 || !from.is_finite() || !to.is_finite()
        || from < 0.0 || to > 1.0 || from >= to || count > isize::MAX as usize / 5 { return 0; }
    let p = std::slice::from_raw_parts(ptr, count * 5);
    if !p.iter().all(|v|v.is_finite()) {return 0;}
    let spans: Vec<f64> = p.chunks_exact(5).collect::<Vec<_>>().windows(2)
        .map(|pair| (pair[1][0] - pair[0][0]).hypot(pair[1][1] - pair[0][1])).collect();
    let total: f64 = spans.iter().sum();
    if !(total > 0.0) {return 0;}
    let start = total * from;
    let end = total * to;
    let mut cumulative = 0.0;
    let mut distance = 0.0;
    for (i, &span) in spans.iter().enumerate() {
        let lo = start.max(cumulative);
        let hi = end.min(cumulative + span);
        if hi > lo && span > 0.0 {
            let a = (lo - cumulative) / span;
            let b = (hi - cumulative) / span;
            let p0 = &p[i * 5..i * 5 + 5];
            let p1 = &p[(i + 1) * 5..(i + 1) * 5 + 5];
            let mut delta = [0.0; 3];
            for k in 0..3 {
                let d = p1[k + 2] - p0[k + 2];
                let va = p0[k + 2] + d * a;
                let vb = p0[k + 2] + d * b;
                delta[k] = va - vb;
            }
            distance += delta[0].hypot(delta[1]).hypot(delta[2]);
        }
        cumulative += span;
    }
    *output = (end - start) * 100.0;
    *output.add(1) = distance * 100.0;
    1
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn partial_interval() {
        let p=[0.,0.,0.,0.,0.,1.,0.,1.,0.,0.,2.,0.,2.,0.,0.];
        let mut result=[0.;2];
        assert_eq!(unsafe {exo_selection_metrics_interval(p.as_ptr(),3,0.25,0.75,result.as_mut_ptr())},1);
        assert!((result[0]-100.).abs()<1e-10);
        assert!((result[1]-100.).abs()<1e-10);
    }
}
