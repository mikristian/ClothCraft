pub fn signed_area(points: &[[f64; 2]]) -> f64 {
    let mut area = 0.0;
    for i in 0..points.len() {
        let a = points[i];
        let b = points[(i + 1) % points.len()];
        area += a[0] * b[1] - b[0] * a[1];
    }
    area * 0.5
}

#[no_mangle]
pub extern "C" fn exo_project_area_abi() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_project_area_alloc(bytes: usize) -> *mut u8 {
    match std::alloc::Layout::from_size_align(bytes, 8) {
        Ok(layout) if bytes > 0 => unsafe {std::alloc::alloc(layout)},
        _ => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn exo_project_area_free(ptr: *mut u8, bytes: usize) {
    if !ptr.is_null() && bytes > 0 {
        if let Ok(layout) = std::alloc::Layout::from_size_align(bytes, 8) {
            std::alloc::dealloc(ptr, layout);
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn exo_project_area_signed(ptr: *const f64, n: usize) -> f64 {
    if ptr.is_null() || n < 3 || n > 100_000 {return f64::NAN;}
    let data = std::slice::from_raw_parts(ptr, 2 * n);
    let mut area = 0.0;
    for i in 0..n {
        let j = (i + 1) % n;
        area += data[2 * i] * data[2 * j + 1] - data[2 * j] * data[2 * i + 1];
    }
    area * 0.5
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn square_winding() {
        let points = [[0.,0.],[8.,0.],[8.,8.],[0.,8.]];
        assert_eq!(signed_area(&points),64.);
        assert_eq!(signed_area(&points.into_iter().rev().collect::<Vec<_>>()),-64.);
    }
    #[test]
    fn concave() {assert_eq!(signed_area(&[[0.,0.],[7.,0.],[7.,2.],[3.,2.],[3.,7.],[0.,7.]]),29.);}
}
