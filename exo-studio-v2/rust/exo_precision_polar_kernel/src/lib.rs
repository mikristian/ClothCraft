#[cfg(target_arch="wasm32")]
#[link(wasm_import_module="env")]
extern "C" { fn cos(x:f64)->f64; fn sin(x:f64)->f64; fn atan2(y:f64,x:f64)->f64; fn hypot(x:f64,y:f64)->f64; }
#[inline] fn cosine(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{cos(x)}} #[cfg(not(target_arch="wasm32"))] {x.cos()} }
#[inline] fn sine(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{sin(x)}} #[cfg(not(target_arch="wasm32"))] {x.sin()} }
#[inline] fn angle(y:f64,x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{atan2(y,x)}} #[cfg(not(target_arch="wasm32"))] {y.atan2(x)} }
#[inline] fn distance(x:f64,y:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{hypot(x,y)}} #[cfg(not(target_arch="wasm32"))] {x.hypot(y)} }
#[no_mangle] pub extern "C" fn exo_precision_polar_abi_version()->u32 {1}
#[no_mangle] pub extern "C" fn exo_polar_x(anchor:f64,length:f64,degrees:f64)->f64 { let radians=degrees*std::f64::consts::PI/180.0; anchor+length*cosine(radians) }
#[no_mangle] pub extern "C" fn exo_polar_y(anchor:f64,length:f64,degrees:f64)->f64 { let radians=degrees*std::f64::consts::PI/180.0; anchor+length*sine(radians) }
#[no_mangle] pub extern "C" fn exo_polar_length(dx:f64,dy:f64)->f64 {distance(dx,dy)}
#[no_mangle] pub extern "C" fn exo_polar_angle(dx:f64,dy:f64)->f64 {angle(dy,dx)*180.0/std::f64::consts::PI}
#[cfg(test)] mod tests {use super::*; #[test] fn basic(){assert_eq!(exo_polar_x(1.,2.,0.),3.);assert_eq!(exo_polar_y(2.,2.,0.),2.);assert_eq!(exo_polar_length(3.,4.),5.);assert_eq!(exo_polar_angle(1.,0.),0.);} #[test] fn degenerate(){assert_eq!(exo_polar_length(0.,0.),0.);assert!(exo_polar_angle(f64::NAN,1.).is_nan());}}
