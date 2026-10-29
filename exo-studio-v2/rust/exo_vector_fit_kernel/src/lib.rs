//! Deterministic squared distance to a finite drafting segment.
//! Kept independent of the editor's input and error validation.

pub fn segment_error_squared(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    let dx = bx - ax;
    let dy = by - ay;
    let length2 = dx * dx + dy * dy;
    if length2 == 0.0 {
        return (px - ax).powi(2) + (py - ay).powi(2);
    }
    let t = (((px - ax) * dx + (py - ay) * dy) / length2).max(0.0).min(1.0);
    (px - ax - dx * t).powi(2) + (py - ay - dy * t).powi(2)
}

#[no_mangle]
pub extern "C" fn exo_vector_fit_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_segment_error_squared(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    segment_error_squared(px, py, ax, ay, bx, by)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn on_line() { assert_eq!(segment_error_squared(0.5,0.0,0.0,0.0,1.0,0.0),0.0); }
    #[test] fn inside_line() { assert!((segment_error_squared(0.5,0.2,0.0,0.0,1.0,0.0)-0.04).abs()<1e-15); }
    #[test] fn clamp_endpoint() { assert_eq!(segment_error_squared(2.0,1.0,0.0,0.0,1.0,0.0),2.0); }
    #[test] fn degenerate_segment() { assert_eq!(segment_error_squared(2.0,3.0,1.0,1.0,1.0,1.0),5.0); }
}
