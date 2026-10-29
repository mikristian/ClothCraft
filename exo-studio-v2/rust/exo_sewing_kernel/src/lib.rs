//! Seam inspection calculations in physical centimetres.
//! Input validation, user thresholds, null handling and the UI shape remain
//! in the JS adapter so the exact public contract is preserved.
pub const ABI_VERSION: u32 = 1;

pub fn difference(first_cm: f64, second_cm: f64) -> f64 {
    first_cm - second_cm
}

pub fn percent(first_cm: f64, second_cm: f64) -> f64 {
    difference(first_cm, second_cm).abs() / first_cm.max(second_cm) * 100.0
}

pub fn warning(first_cm: f64, second_cm: f64, length_threshold_cm: f64,
    percent_threshold: f64, length_on: bool, ratio_on: bool) -> bool {
    let absolute = difference(first_cm, second_cm).abs();
    (length_on && absolute > length_threshold_cm)
        || (ratio_on && percent(first_cm, second_cm) > percent_threshold)
}

#[no_mangle]
pub extern "C" fn exo_sewing_abi_version() -> u32 { ABI_VERSION }

#[no_mangle]
pub extern "C" fn exo_sewing_signed_difference_cm(first_cm: f64, second_cm: f64) -> f64 {
    difference(first_cm, second_cm)
}

#[no_mangle]
pub extern "C" fn exo_sewing_difference_percent(first_cm: f64, second_cm: f64) -> f64 {
    percent(first_cm, second_cm)
}

#[no_mangle]
pub extern "C" fn exo_sewing_warning(first_cm: f64, second_cm: f64, length_threshold_cm: f64,
    percent_threshold: f64, length_on: u32, ratio_on: u32) -> u32 {
    u32::from(warning(first_cm, second_cm, length_threshold_cm,
        percent_threshold, length_on != 0, ratio_on != 0))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sign_and_reference() {
        assert_eq!(exo_sewing_abi_version(), 1);
        assert!((difference(26.17,26.18) + 0.01).abs() < 1e-11);
        assert!((percent(26.17,26.18) - (0.01/26.18*100.)).abs() < 1e-11);
        assert_eq!(percent(40.,40.), 0.);
    }
    #[test]
    fn threshold_and_switch_semantics() {
        assert!(!warning(25.,24.6,0.5,10.,true,true));
        assert!(warning(25.,24.,0.5,10.,true,true));
        assert!(!warning(25.,24.,0.5,10.,false,true));
        assert!(!warning(25.,24.,0.5,10.,false,false));
        assert!(warning(10.,8.,0.5,10.,false,true));
        assert_eq!(exo_sewing_warning(10.,8.,0.5,10.,0,1),1);
        assert_eq!(exo_sewing_warning(10.,8.,0.5,10.,0,0),0);
    }
    #[test]
    fn boundaries_are_strict() {
        assert!(!warning(10.,9.5,0.5,5.,true,false));
        assert!(!warning(10.,9.5,0.5,5.,false,true));
        assert!(warning(10.,9.499,0.5,5.,true,false));
        assert!(warning(10.,9.499,0.5,5.,false,true));
    }
}
