const EPSILON: f64 = 1e-6;

// JS Math.max propagates NaN; f64::max does not.
pub fn pair(minimum: f64, squared: f64, mut wa: f64, mut wb: f64, a: f64, b: f64) -> [f64; 7] {
    let distance = (if squared.is_nan() { f64::NAN } else if squared > EPSILON { squared } else { EPSILON }).sqrt();
    let penetration = minimum - distance;
    let active = !(wa + wb <= EPSILON);
    if active && a != b && wa > 0.0 && wb > 0.0 {
        if a > b { wa = 0.9; wb = 0.1; } else { wa = 0.1; wb = 0.9; }
    }
    let total = wa + wb;
    [distance, penetration, wa, wb, -penetration * (wa / total), penetration * (wb / total), if active { 1.0 } else { 0.0 }]
}
static mut OUTPUT: [f64; 7] = [0.0; 7];
#[no_mangle]
pub extern "C" fn exo_self_collision_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_self_collision_pair(minimum: f64, squared: f64, wa: f64, wb: f64, a: f64, b: f64) -> *const f64 {
    unsafe { OUTPUT = pair(minimum, squared, wa, wb, a, b); &raw const OUTPUT as *const f64 }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn weights_and_depth() {
        let p = pair(0.02, 0.0, 2.0, 6.0, 0.0, 0.0);
        assert_eq!(p[0], 0.001); assert_eq!(p[4], -0.019 * 0.25);
        assert_eq!(&pair(0.02, 0.0, 2.0, 6.0, 1.0, 0.0)[2..4], &[0.9, 0.1]);
        assert_eq!(&pair(0.02, 0.0, 2.0, 6.0, 0.0, 1.0)[2..4], &[0.1, 0.9]);
        assert_eq!(pair(0.02, 0.0, 0.0, 0.0, 0.0, 1.0)[6], 0.0);
        assert_eq!(pair(0.02, 0.0, 1.0, 0.0, 0.0, 1.0)[4], -0.019);
        assert!(pair(0.02, f64::NAN, 1.0, 1.0, 0.0, 0.0)[4].is_nan());
        assert!(pair(0.02, 0.0, f64::INFINITY, 1.0, 0.0, 0.0)[4].is_nan());
    }
}
