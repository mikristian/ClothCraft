fn js_max(a:f64,b:f64)->f64 {if a.is_nan()||b.is_nan(){f64::NAN}else if a==0.0&&b==0.0{0.0}else{a.max(b)}}
#[no_mangle]pub extern "C" fn exo_avatar_contact_parameters_abi_version()->u32{1}
#[no_mangle]pub extern "C" fn exo_avatar_layer_offset(layer:f64,thickness:f64)->f64{layer*js_max(0.0025,thickness*1.15)}
#[no_mangle]pub extern "C" fn exo_avatar_margin(base:f64,thickness:f64,offset:f64)->f64{(base+thickness)+offset}
#[cfg(test)]mod tests{use super::*;#[test]fn finite(){assert!((exo_avatar_layer_offset(2.,0.003)-0.0069).abs()<1e-15);assert!((exo_avatar_margin(0.012,0.003,0.0069)-0.0219).abs()<1e-15);}#[test]fn nonfinite(){assert!(exo_avatar_layer_offset(1.,f64::NAN).is_nan());}}
