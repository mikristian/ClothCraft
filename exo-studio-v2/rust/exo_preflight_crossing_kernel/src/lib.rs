#[no_mangle]
pub extern "C" fn exo_preflight_crossing_abi_version() -> i32 { 1 }

#[no_mangle]
pub extern "C" fn exo_preflight_crossing_alloc(words: usize) -> *mut f64 {
    let mut values = vec![0.0; words];
    let ptr = values.as_mut_ptr();
    std::mem::forget(values);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn exo_preflight_crossing_free(ptr: *mut f64, words: usize) {
    if !ptr.is_null() { drop(Vec::from_raw_parts(ptr, words, words)); }
}

fn orientation(a: &[f64], b: &[f64], c: &[f64]) -> f64 {
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

fn crossing(points: &[f64]) -> bool {
    let n = points.len() / 2;
    for i in 0..n {
        let a = &points[2*i..2*i+2];
        let b = &points[2*((i+1)%n)..2*((i+1)%n)+2];
        for j in i+2..n {
            if i==0 && j==n-1 { continue; }
            let c = &points[2*j..2*j+2];
            let d = &points[2*((j+1)%n)..2*((j+1)%n)+2];
            if orientation(a,b,c)*orientation(a,b,d) < -1e-9 &&
               orientation(c,d,a)*orientation(c,d,b) < -1e-9 { return true; }
        }
    }
    false
}

/// Returns 1 crossing, 0 no crossing, -1 invalid input.
#[no_mangle]
pub unsafe extern "C" fn exo_preflight_crossing_check(ptr: *const f64, count: usize) -> i32 {
    if ptr.is_null() || count > 1_000_000 { return -1; }
    let points = std::slice::from_raw_parts(ptr, count*2);
    if !points.iter().all(|v|v.is_finite()) { return -1; }
    if crossing(points) { 1 } else { 0 }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn bowtie() { assert!(crossing(&[0.,0.,4.,4.,0.,4.,4.,0.])); }
    #[test] fn square() { assert!(!crossing(&[0.,0.,4.,0.,4.,4.,0.,4.])); }
    #[test] fn touching_and_collinear() {
        assert!(!crossing(&[0.,0.,3.,0.,2.,0.,0.,3.]));
        assert!(!crossing(&[0.,0.,0.,0.,0.,0.]));
    }
    #[test] fn invalid() {
        assert_eq!(unsafe {exo_preflight_crossing_check([f64::NAN,0.].as_ptr(),1)},-1);
    }
}
