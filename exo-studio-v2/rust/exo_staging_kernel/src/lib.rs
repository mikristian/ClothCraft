use std::sync::Mutex;
#[cfg(target_arch="wasm32")]
#[link(wasm_import_module="env")]
extern "C" { fn exo_host_sin(x:f64)->f64; fn exo_host_cos(x:f64)->f64; }
fn sin(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{exo_host_sin(x)}} #[cfg(not(target_arch="wasm32"))] {x.sin()} }
fn cos(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{exo_host_cos(x)}} #[cfg(not(target_arch="wasm32"))] {x.cos()} }
pub fn cylinder(local_x:f64, half_width:f64, scale:f64, x_offset:f64,z_offset:f64,direction:f64)->[f64;2]{
    let half_angle=1.10;
    let radius=f64::max(0.02,half_width/half_angle);
    let angle=(local_x/radius).clamp(-half_angle,half_angle);
    [x_offset+sin(angle)*radius,
     direction*((0.18*scale)+radius*(cos(angle)-cos(half_angle)))+(z_offset-direction*0.245)]
}
pub fn blend(a:f64,b:f64,t:f64)->f64 { (1.0-t)*a+t*b }
static RESULT:Mutex<[f64;2]>=Mutex::new([0.0;2]);
#[no_mangle] pub extern "C" fn exo_staging_abi_version()->u32 {1}
#[no_mangle] pub extern "C" fn exo_staging_cylinder(x:f64,w:f64,s:f64,xo:f64,zo:f64,d:f64){*RESULT.lock().unwrap()=cylinder(x,w,s,xo,zo,d);}
#[no_mangle] pub extern "C" fn exo_staging_result(i:usize)->f64 {RESULT.lock().unwrap().get(i).copied().unwrap_or(f64::NAN)}
#[no_mangle] pub extern "C" fn exo_staging_blend(a:f64,b:f64,t:f64)->f64 {blend(a,b,t)}
#[cfg(test)] mod tests {use super::*;#[test] fn cylinder_and_blend(){let front=cylinder(0.0,0.35,1.0,0.0,0.0,1.0);let back=cylinder(0.0,0.35,1.0,0.0,0.0,-1.0);assert_eq!(front[0],0.0);assert_eq!(back[1],-front[1]);assert_eq!(blend(1.0,3.0,0.25),1.5);}}
