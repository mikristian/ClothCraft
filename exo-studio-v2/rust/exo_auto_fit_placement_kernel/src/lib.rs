//! Numerical placement only; particle ownership and mutation remain in JavaScript.
use std::sync::Mutex;
fn limit(value: f64, default: f64) -> f64 {
    if value.is_finite() { value.max(0.0) } else { default }
}
#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
extern "C" { fn exo_host_hypot3(x: f64, y: f64, z: f64) -> f64; }
fn norm(v: [f64; 3]) -> f64 {
    #[cfg(target_arch = "wasm32")]
    { unsafe { exo_host_hypot3(v[0], v[1], v[2]) } }
    #[cfg(not(target_arch = "wasm32"))]
    { v[0].hypot(v[1]).hypot(v[2]) }
}
pub fn constrain(values: [f64; 3], limits: [f64; 3], maximum: f64) -> [f64; 9] {
    let requested = values.map(|v| if v.is_finite() { v.clamp(-2.0, 2.0) } else { 0.0 });
    let limits = [limit(limits[0], 0.024), limit(limits[1], 0.016), limit(limits[2], 0.016)];
    let maximum = limit(maximum, 0.027);
    let mut applied = std::array::from_fn(|i| requested[i].clamp(-limits[i], limits[i]));
    let magnitude = norm(applied);
    if magnitude > maximum && magnitude > 1e-12 {
        for v in &mut applied { *v *= maximum / magnitude; }
    }
    [requested[0], requested[1], requested[2], applied[0], applied[1], applied[2],
        norm(requested), norm(applied), norm(std::array::from_fn(|i| requested[i] - applied[i]))]
}
static RESULT: Mutex<[f64; 9]> = Mutex::new([0.0; 9]);
#[no_mangle]
pub extern "C" fn exo_placement_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_placement_constrain(x:f64,y:f64,z:f64,lx:f64,ly:f64,lz:f64,m:f64) {
    *RESULT.lock().unwrap() = constrain([x,y,z], [lx,ly,lz], m);
}
#[no_mangle]
pub extern "C" fn exo_placement_result(index:usize) -> f64 {
    RESULT.lock().unwrap().get(index).copied().unwrap_or(f64::NAN)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn extreme_and_defaults() {
        let r = constrain([f64::MAX,-f64::MAX,f64::NAN], [f64::NAN;3], f64::INFINITY);
        assert_eq!(&r[..3], &[2.0,-2.0,0.0]);
        assert!((r[7]-0.027).abs()<1e-15);
        assert!(r[8]>2.7);
    }
    #[test]
    fn zero_negative_and_tiny_limits() {
        for m in [0.0,-1.0] {
            assert_eq!(constrain([1.0;3],[-1.0,0.0,1.0],m)[7],0.0);
        }
        let r=constrain([1.0;3],[1e-14;3],0.0);
        assert!(r[7]>0.0); // Preserve the original 1e-12 scaling threshold.
        assert_eq!(constrain([f64::INFINITY;3],[f64::MAX;3],f64::MAX),[0.0;9]);
    }
}
