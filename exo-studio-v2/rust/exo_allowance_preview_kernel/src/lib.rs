//! Seam allowance offset preview in garment material metres.
//! Positive widths offset to the right of the ordered cutline. This is a
//! visual preview only; physical cutlines are authored by the native backend.

pub const MAX_POINTS: usize = 4096;
static mut INPUT: [f64; MAX_POINTS * 2] = [0.; MAX_POINTS * 2];
static mut OUTPUT: [f64; MAX_POINTS * 4] = [0.; MAX_POINTS * 4];

#[no_mangle]
pub extern "C" fn exo_allowance_preview_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_allowance_preview_capacity() -> u32 { MAX_POINTS as u32 }
#[no_mangle]
pub extern "C" fn exo_allowance_preview_input_ptr() -> *mut f64 {
    std::ptr::addr_of_mut!(INPUT).cast::<f64>()
}
#[no_mangle]
pub extern "C" fn exo_allowance_preview_output_ptr() -> *const f64 {
    std::ptr::addr_of!(OUTPUT).cast::<f64>()
}

pub fn offset_preview(points: &[[f64; 2]], width: f64, miter_limit: f64) -> Vec<[f64; 2]> {
    if points.len() < 2 || !width.is_finite() || width <= 0.
        || !miter_limit.is_finite() || miter_limit < 1.
        || points.iter().flatten().any(|x| !x.is_finite()) {
        return Vec::new();
    }
    let mut clean: Vec<[f64; 2]> = Vec::with_capacity(points.len());
    for &point in points {
        if clean.last().is_none_or(|last| (point[0]-last[0]).hypot(point[1]-last[1]) > 1e-9) {
            clean.push(point);
        }
    }
    if clean.len() < 2 { return Vec::new(); }
    let mut normals = Vec::with_capacity(clean.len() - 1);
    let mut tangents = Vec::with_capacity(clean.len() - 1);
    for pair in clean.windows(2) {
        let dx = pair[1][0]-pair[0][0];
        let dy = pair[1][1]-pair[0][1];
        let length = dx.hypot(dy);
        if !(length > 0.) || !length.is_finite() { return Vec::new(); }
        tangents.push([dx/length, dy/length]);
        normals.push([dy/length, -dx/length]);
    }
    let shifted = |p: [f64; 2], n: [f64; 2]| [p[0]+width*n[0], p[1]+width*n[1]];
    let mut output = Vec::with_capacity(clean.len() * 2);
    output.push(shifted(clean[0], normals[0]));
    for i in 1..clean.len()-1 {
        let before = normals[i-1];
        let after = normals[i];
        let cosine = tangents[i-1][0]*tangents[i][0]+tangents[i-1][1]*tangents[i][1];
        let denominator = 1. + cosine;
        let nx = before[0]+after[0];
        let ny = before[1]+after[1];
        let miter_scale = if denominator > 1e-10 { 1./denominator } else { f64::INFINITY };
        let miter_length = nx.hypot(ny) * miter_scale;
        if miter_length.is_finite() && miter_length <= miter_limit {
            output.push([clean[i][0]+width*nx*miter_scale, clean[i][1]+width*ny*miter_scale]);
        } else {
            output.push(shifted(clean[i], before));
            output.push(shifted(clean[i], after));
        }
    }
    output.push(shifted(*clean.last().unwrap(), *normals.last().unwrap()));
    if output.iter().flatten().all(|v| v.is_finite()) { output } else { Vec::new() }
}

/// One WASM invocation per cutline run. Return the number of output points.
/// Input has count packed XY pairs; output contains at most count * 2 pairs.
#[no_mangle]
pub extern "C" fn exo_allowance_preview_process(count: u32, width: f64, miter_limit: f64) -> u32 {
    let len = count as usize;
    if len > MAX_POINTS || len < 2 { return 0; }
    let packed = unsafe {
        std::slice::from_raw_parts(std::ptr::addr_of!(INPUT).cast::<f64>(), len * 2)
    };
    let points = packed.chunks_exact(2).map(|xy| [xy[0],xy[1]]).collect::<Vec<_>>();
    let output = offset_preview(&points, width, miter_limit);
    let result = unsafe {
        std::slice::from_raw_parts_mut(std::ptr::addr_of_mut!(OUTPUT).cast::<f64>(), MAX_POINTS * 4)
    };
    for (i, xy) in output.iter().enumerate() {
        result[2*i] = xy[0];
        result[2*i+1] = xy[1];
    }
    output.len() as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    fn near(a: f64, b: f64) { assert!((a-b).abs() <= 1e-12, "{a} != {b}"); }
    #[test]
    fn straight_and_right_angle_miter() {
        let path = [[0.,0.], [0.2,0.], [0.2,0.2]];
        let out = offset_preview(&path, 0.01, 4.);
        assert_eq!(out.len(), 3);
        near(out[0][1],-0.01);
        near(out[1][0],0.21);
        near(out[1][1],-0.01);
        near(out[2][0],0.21);
    }
    #[test]
    fn severe_corner_bevels_and_deduplicates() {
        let sharp = [[0.,0.],[0.2,0.],[0.001,0.002]];
        let out = offset_preview(&sharp,0.01,4.);
        assert_eq!(out.len(),4);
        let repeated = [[0.,0.],[0.,0.],[0.2,0.],[0.2,0.],[0.2,0.2]];
        assert_eq!(offset_preview(&repeated,0.01,4.),
                   offset_preview(&[[0.,0.],[0.2,0.],[0.2,0.2]],0.01,4.));
    }
    #[test]
    fn invalid_early_exit() {
        assert!(offset_preview(&[[0.,0.]],0.01,4.).is_empty());
        assert!(offset_preview(&[[0.,0.],[f64::NAN,0.]],0.01,4.).is_empty());
        assert!(offset_preview(&[[0.,0.],[1.,0.]],-0.01,4.).is_empty());
        assert!(offset_preview(&[[0.,0.],[1.,0.]],0.01,0.).is_empty());
    }
}
