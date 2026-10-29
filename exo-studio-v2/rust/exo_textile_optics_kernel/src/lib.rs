//! Numeric yarn-mask and bounded optical controls. This is VISUAL ONLY;
//! source fabric, textile mechanics and collision meshes are not altered.
#[cfg(target_arch="wasm32")]
#[link(wasm_import_module="env")]
unsafe extern "C" {
    #[link_name="sin"] fn host_sin(x:f64)->f64;
    #[link_name="cos"] fn host_cos(x:f64)->f64;
    #[link_name="sqrt"] fn host_sqrt(x:f64)->f64;
}
#[inline]
fn sin(x:f64)->f64{
    #[cfg(target_arch="wasm32")] { unsafe {host_sin(x)} }
    #[cfg(not(target_arch="wasm32"))] { x.sin() }
}
#[inline]
fn cos(x:f64)->f64{
    #[cfg(target_arch="wasm32")] { unsafe {host_cos(x)} }
    #[cfg(not(target_arch="wasm32"))] { x.cos() }
}
#[inline]
fn sqrt(x:f64)->f64{
    #[cfg(target_arch="wasm32")] { unsafe {host_sqrt(x)} }
    #[cfg(not(target_arch="wasm32"))] { x.sqrt() }
}
#[inline]
fn smooth(left:f64,right:f64,value:f64)->f64{
    let x=((value-left)/(right-left)).max(0.).min(1.);
    x*x*(3.-2.*x)
}
#[no_mangle]
pub extern "C" fn exo_textile_optics_abi_version()->u32{1}

// Topologies: 0 basic, 1 tulle-net, 2 power-mesh, 3 athletic-mesh.
// Pass Math.PI*2 from JS to preserve the source's argument order/rounding.
#[no_mangle]
pub extern "C" fn exo_mesh_yarn_coverage(topology:u32,u:f64,v:f64,tau:f64)->f64{
    if topology==1 {
        let a=sin(tau*12.*(u+v)).abs();
        let b=sin(tau*12.*(u-v)).abs();
        return 1.-smooth(0.105,0.185,a.min(b));
    }
    if topology==2 {
        let a=sin(tau*14.*(u+v)).abs();
        let b=sin(tau*14.*(u-v)).abs();
        return 1.-smooth(0.28,0.48,a.min(b));
    }
    if topology==3 {
        let s=cos(tau*12.*u);
        let t=cos(tau*12.*v);
        let radius=sqrt((1.-s)*0.5+(1.-t)*0.5);
        return smooth(0.36,0.50,radius);
    }
    let a=cos(tau*12.*u).abs();
    let b=cos(tau*12.*v).abs();
    smooth(0.70,0.88,a.max(b))
}
#[no_mangle]
pub extern "C" fn exo_optics_clamp(value:f64,minimum:f64,maximum:f64)->f64{
    value.max(minimum).min(maximum)
}

#[cfg(test)]mod tests{use super::*;
    #[test]fn coverage_is_bounded(){
      for mode in 0..4 {for i in 0..101{let v=exo_mesh_yarn_coverage(mode,i as f64/100.,0.315,std::f64::consts::PI*2.);
        assert!(v>=0.&&v<=1.,"mode {mode}: {v}");}}
    }
    #[test]fn optics_clamp_and_periodicity(){
      assert_eq!(exo_optics_clamp(-2.,0.,1.),0.);
      assert_eq!(exo_optics_clamp(2.,0.,1.),1.);
      let tau=std::f64::consts::PI*2.;
      for mode in 0..4{let a=exo_mesh_yarn_coverage(mode,0.35,0.75,tau);
        let b=exo_mesh_yarn_coverage(mode,1.35,0.75,tau);
        assert!((a-b).abs()<1e-11);}
    }
}
