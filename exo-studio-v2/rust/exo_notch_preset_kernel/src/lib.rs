//! Exact tee balance notch t values. JS owns original panel/edge validation.
#[no_mangle]
pub extern "C" fn exo_notch_preset_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_notch_preset_count(panel: u32, eligible: u32, has_notches: u32) -> u32 {
    if eligible == 0 || has_notches != 0 { 0 } else { match panel { 1 => 1, 2 => 2, _ => 0 } }
}
#[no_mangle]
pub extern "C" fn exo_notch_preset_t(panel: u32, index: u32) -> f64 {
    match (panel,index) { (1,0) => 0.53, (2,0) => 0.5125, (2,1) => 0.5475, _ => f64::NAN }
}
#[cfg(test)]mod tests { use super::*;
    #[test]fn exact_presets(){
        assert_eq!(exo_notch_preset_count(1,1,0),1);
        assert_eq!(exo_notch_preset_count(2,1,0),2);
        assert_eq!(exo_notch_preset_count(2,1,1),0);
        assert_eq!(exo_notch_preset_count(2,0,0),0);
        assert_eq!(exo_notch_preset_count(0,1,0),0);
        assert_eq!(exo_notch_preset_t(1,0),0.53);
        assert_eq!(exo_notch_preset_t(2,0),0.5125);
        assert_eq!(exo_notch_preset_t(2,1),0.5475);
    }
}
