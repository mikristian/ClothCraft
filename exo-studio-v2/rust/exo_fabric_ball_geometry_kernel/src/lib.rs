//! Deterministic visual drape vertex coordinates. JS owns grid topology and normals.
#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "host_math")]
extern "C" {
    #[link_name = "sin"] fn host_sin(x: f64) -> f64;
    #[link_name = "cos"] fn host_cos(x: f64) -> f64;
    #[link_name = "sqrt"] fn host_sqrt(x: f64) -> f64;
    #[link_name = "hypot"] fn host_hypot(x: f64, y: f64) -> f64;
    #[link_name = "atan2"] fn host_atan2(y: f64, x: f64) -> f64;
}
#[inline] fn sin(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{host_sin(x)}} #[cfg(not(target_arch="wasm32"))] {x.sin()} }
#[inline] fn cos(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{host_cos(x)}} #[cfg(not(target_arch="wasm32"))] {x.cos()} }
#[inline] fn sqrt(x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{host_sqrt(x)}} #[cfg(not(target_arch="wasm32"))] {x.sqrt()} }
#[inline] fn hypot(x:f64,y:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{host_hypot(x,y)}} #[cfg(not(target_arch="wasm32"))] {x.hypot(y)} }
#[inline] fn atan2(y:f64,x:f64)->f64 { #[cfg(target_arch="wasm32")] {unsafe{host_atan2(y,x)}} #[cfg(not(target_arch="wasm32"))] {y.atan2(x)} }
#[no_mangle] pub extern "C" fn exo_fabric_ball_geometry_abi_version()->u32 {1}
#[inline] pub fn vertex(flat_x:f64,flat_z:f64,bend:f64,mass:f64,softness:f64,contact_y:f64)->[f64;3] {
    let radius=0.81_f64;
    let center_y=0.23_f64;
    let contact_radius=0.785_f64;
    let r=hypot(flat_x,flat_z);
    let angle=atan2(flat_z,flat_x);
    let mut x=flat_x;
    let mut z=flat_z;
    let y;
    if r<=contact_radius {
        y=center_y+sqrt((radius*radius-r*r).max(0.0))+0.013;
    } else {
        let run=r-contact_radius;
        let t=(run/0.36).clamp(0.0,1.0);
        let ease=t*t*(3.0-2.0*t);
        let drop=run*(0.92+0.21*mass)+run*run*(0.05+0.03*mass);
        let pleat=softness*run*(0.018*sin(9.0*angle+0.37)+0.009*sin(15.0*angle-1.1));
        let sweep=contact_radius+run*(0.19+0.025*bend)+pleat;
        let smooth=0.018*sin(angle*3.0+0.2)*(run*2.0).min(1.0);
        x=(sweep/r)*flat_x+smooth*cos(angle+0.6);
        z=(sweep/r)*flat_z+smooth*sin(angle+0.6);
        let hem_wave=ease*softness*(0.044*cos(9.0*angle-0.2)+0.015*sin(17.0*angle+0.4));
        let vertical_folds=ease*softness*0.025*sin(8.0*angle+2.2*run)*run.min(1.0);
        y=contact_y-drop+hem_wave+vertical_folds;
    }
    [x,y,z]
}
#[no_mangle] pub extern "C" fn exo_fabric_ball_geometry_axis(flat_x:f64,flat_z:f64,bend:f64,mass:f64,softness:f64,contact_y:f64,axis:u32)->f64 {
    vertex(flat_x,flat_z,bend,mass,softness,contact_y).get(axis as usize).copied().unwrap_or(f64::NAN)
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn dome_and_corner() {
        let c=vertex(0.0,0.0,0.62,0.875,0.4964,0.45);
        assert!((c[1]-1.053).abs()<1e-12);
        assert_eq!(c[0],0.0);
        let a=vertex(1.35,1.35,0.62,0.875,0.4964,0.45);
        assert!(a.iter().all(|n|n.is_finite()));
        assert!(a[1]<0.0);
    }
}
