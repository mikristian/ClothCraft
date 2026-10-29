//! Numeric production document checks only; physical boundary sampling stays in JS.
#[no_mangle]
pub extern "C" fn exo_preflight_abi_version() -> u32 { 1 }

/// Returns a predicate result, or -1 for an unsupported operation.
/// JS performs its original coercions before crossing this numeric ABI.
#[no_mangle]
pub extern "C" fn exo_preflight_check(op: u32, a: f64, b: f64, c: f64) -> i32 {
    let result = match op {
        0 => a.is_finite(),
        1 => a.is_finite() && a.fract() == 0. && (1. ..=99.).contains(&a),
        2 => a.is_finite() && a >= 0.,
        3 => a < 0.05 || !a.is_finite(),
        4 => a < 0.1,
        5 => a.is_finite() && a.fract() == 0. && a >= 0. && a < b,
        6 => a.is_finite() && (0. ..=1.).contains(&a),
        7 => !a.is_finite() || b <= 0. || c <= 0.,
        8 => !a.is_finite() || !b.is_finite(),
        9 => a != 1., // seam status is encoded as good=1, other=0
        _ => return -1,
    };
    i32::from(result)
}

/// 2=blocked, 1=review, 0=structural check pass. Never factory certification.
#[no_mangle]
pub extern "C" fn exo_preflight_status(blockers: f64, warnings: f64) -> u32 {
    if blockers > 0. { 2 } else if warnings > 0. { 1 } else { 0 }
}

#[cfg(test)]
mod tests {
    use super::exo_preflight_check as check;
    #[test]
    fn report_status() {
        assert_eq!(super::exo_preflight_status(1., 1.), 2);
        assert_eq!(super::exo_preflight_status(0., 1.), 1);
        assert_eq!(super::exo_preflight_status(0., 0.), 0);
    }
    #[test]
    fn thresholds_and_nonfinite_values() {
        assert_eq!(check(1, 1., 0., 0.), 1);
        for n in [0., 100., 1.5, f64::NAN, f64::INFINITY] { assert_eq!(check(1,n,0.,0.),0); }
        assert_eq!(check(3,0.05,0.,0.),0);
        assert_eq!(check(3,0.049,0.,0.),1);
        assert_eq!(check(4,0.1,0.,0.),0);
        assert_eq!(check(4,f64::NAN,0.,0.),0);
        assert_eq!(check(5,3.,3.,0.),0);
        assert_eq!(check(5,2.,3.,0.),1);
        assert_eq!(check(6,1.,0.,0.),1);
        assert_eq!(check(6,f64::INFINITY,0.,0.),0);
        assert_eq!(check(7,0.,0.,1.),1);
        assert_eq!(check(7,0.,f64::NAN,1.),0);
        assert_eq!(check(8,1.,f64::INFINITY,0.),1);
        assert_eq!(check(9,1.,0.,0.),0);
        assert_eq!(check(9,0.,0.,0.),1);
        assert_eq!(check(99,0.,0.,0.),-1);
        assert_eq!(check(0,f64::NAN,0.,0.),0);
        assert_eq!(check(2,-1.,0.,0.),0);
    }
}
