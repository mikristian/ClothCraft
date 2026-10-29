//! Numerical 3D distance constraint projection. The JS solver retains seam
//! dispatch, constraint iteration, Three.js object ownership and persistence.
const EPSILON:f64=1e-6;

#[no_mangle]
pub extern "C" fn exo_distance_constraint_abi_version()->u32{1}

pub fn project(ax:f64,ay:f64,az:f64,bx:f64,by:f64,bz:f64,
  rest:f64,stiffness:f64,wa:f64,wb:f64,fuse:bool)->[f64;7]{
    let unchanged=[ax,ay,az,bx,by,bz,0.];
    let total=wa+wb;
    if total<=EPSILON{return unchanged}
    let dx=bx-ax;let dy=by-ay;let dz=bz-az;
    let length=(dx*dx+dy*dy+dz*dz).sqrt();
    if length<=EPSILON{return unchanged}
    let error=(length-rest)/length;
    let factor=error*stiffness;
    let cx=dx*factor;let cy=dy*factor;let cz=dz*factor;
    if fuse {
        if wa>0. {return [ax+cx,ay+cy,az+cz,bx,by,bz,1.]}
        return unchanged;
    }
    let left=wa/total;
    let right=-wb/total;
    [if wa>0.{ax+cx*left}else{ax},
     if wa>0.{ay+cy*left}else{ay},
     if wa>0.{az+cz*left}else{az},
     if wb>0.{bx+cx*right}else{bx},
     if wb>0.{by+cy*right}else{by},
     if wb>0.{bz+cz*right}else{bz},1.]
}

// This WASM instance is used synchronously on the browser's owning thread.
// Return a fixed scratch buffer to avoid per-constraint WASM allocations.
static mut RESULT:[f64;7]=[0.;7];
#[no_mangle]
pub extern "C" fn exo_distance_constraint_project(ax:f64,ay:f64,az:f64,bx:f64,by:f64,bz:f64,
    rest:f64,stiffness:f64,wa:f64,wb:f64,fuse:u32)->*const f64 {
    unsafe{RESULT=project(ax,ay,az,bx,by,bz,rest,stiffness,wa,wb,fuse!=0);(&raw const RESULT).cast::<f64>()}
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn balanced_structural_projection(){
    let p=project(0.,0.,0.,2.,0.,0.,1.,1.,1.,1.,false);
    assert_eq!(p,[0.5,0.,0.,1.5,0.,0.,1.]);
 }
 #[test]fn anchored_and_fused_followers(){
    assert_eq!(project(0.,0.,0.,2.,0.,0.,1.,1.,0.,1.,false),[0.,0.,0.,1.,0.,0.,1.]);
    assert_eq!(project(0.,0.,0.,2.,0.,0.,1.,1.,1.,1.,true),[1.,0.,0.,2.,0.,0.,1.]);
    assert_eq!(project(0.,0.,0.,2.,0.,0.,1.,1.,0.,1.,true),[0.,0.,0.,2.,0.,0.,0.]);
 }
 #[test]fn epsilon_and_zero_mass(){
    assert_eq!(project(0.,0.,0.,0.,0.,0.,1.,1.,1.,1.,false)[6],0.);
    assert_eq!(project(0.,0.,0.,2.,0.,0.,1.,1.,0.,0.,false)[6],0.);
 }
}
