// 0 = unknown, 1 = measured within threshold, 2 = measured above threshold.
#[no_mangle]pub extern "C" fn exo_fit_telemetry_abi_version()->u32{1}
#[no_mangle]pub extern "C" fn exo_fit_threshold(value:f64,limit:f64)->u32{if !value.is_finite(){0}else if value>limit{2}else{1}}
#[cfg(test)]mod tests{use super::*;#[test]fn predicates(){assert_eq!(exo_fit_threshold(f64::NAN,5.),0);assert_eq!(exo_fit_threshold(f64::INFINITY,5.),0);assert_eq!(exo_fit_threshold(5.,5.),1);assert_eq!(exo_fit_threshold(6.,5.),2);assert_eq!(exo_fit_threshold(5.,f64::NAN),1);}}
