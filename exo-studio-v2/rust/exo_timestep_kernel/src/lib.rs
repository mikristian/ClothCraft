#[cfg(target_arch="wasm32")]
#[link(wasm_import_module="env")]
extern "C" {fn round(x:f64)->f64;fn ceil(x:f64)->f64;}
fn js_round(x:f64)->f64{#[cfg(target_arch="wasm32")]{unsafe{round(x)}}#[cfg(not(target_arch="wasm32"))]{(x+0.5).floor()}}
fn js_ceil(x:f64)->f64{#[cfg(target_arch="wasm32")]{unsafe{ceil(x)}}#[cfg(not(target_arch="wasm32"))]{x.ceil()}}
fn js_max(a:f64,b:f64)->f64{if a.is_nan()||b.is_nan(){f64::NAN}else if a==0.&&b==0.{0.}else{a.max(b)}}
fn js_min(a:f64,b:f64)->f64{if a.is_nan()||b.is_nan(){f64::NAN}else if a==0.&&b==0.{if a.is_sign_negative()||b.is_sign_negative(){-0.}else{0.}}else{a.min(b)}}
#[no_mangle]pub extern "C" fn exo_timestep_abi_version()->u32{1}
#[no_mangle]pub extern "C" fn exo_timestep_substeps(x:f64)->f64{js_max(1.,js_min(4.,js_round(x)))}
#[no_mangle]pub extern "C" fn exo_timestep_requested(x:f64)->f64{js_max(2.,js_min(14.,x))}
#[no_mangle]pub extern "C" fn exo_timestep_iterations(requested:f64,substeps:f64)->f64{js_max(2.,js_ceil(requested/substeps))}
#[no_mangle]pub extern "C" fn exo_timestep_subdt(dt:f64,substeps:f64)->f64{dt/substeps}
#[no_mangle]pub extern "C" fn exo_timestep_gravity_step(gravity:f64,subdt:f64)->f64{gravity*subdt*subdt}
#[no_mangle]pub extern "C" fn exo_timestep_collision_distance(thickness:f64,margin:f64)->f64{js_max(0.004,thickness*2.+margin)}
#[cfg(test)]mod tests{use super::*;#[test]fn schedule(){assert_eq!(exo_timestep_substeps(2.5),3.);assert_eq!(exo_timestep_substeps(-1.5),1.);assert_eq!(exo_timestep_requested(50.),14.);assert_eq!(exo_timestep_iterations(9.,3.),3.);assert_eq!(exo_timestep_collision_distance(0.002,0.002),0.006);}#[test]fn nonfinite(){assert!(exo_timestep_substeps(f64::NAN).is_nan());assert!(exo_timestep_requested(f64::NAN).is_nan());}}
