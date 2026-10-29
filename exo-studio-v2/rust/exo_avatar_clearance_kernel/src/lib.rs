//! Numerical collider diagnostics only; no solver or fit certification.
#[no_mangle]
pub extern "C" fn exo_avatar_clearance_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_ellipsoid_clearance(x:f64,y:f64,z:f64,cx:f64,cy:f64,cz:f64,rx:f64,ry:f64,rz:f64) -> f64 {
    let dx=x-cx; let dy=y-cy; let dz=z-cz;
    let q=(dx*dx/(rx*rx)+dy*dy/(ry*ry)+dz*dz/(rz*rz)).sqrt();
    (q-1.0)*rx.min(ry).min(rz)
}

#[no_mangle]
pub extern "C" fn exo_capsule_clearance(x:f64,y:f64,z:f64,cx:f64,cy:f64,cz:f64,ax:f64,ay:f64,az:f64,h:f64,r:f64) -> f64 {
    let sx=cx+ax*(-h); let sy=cy+ay*(-h); let sz=cz+az*(-h);
    let dx=(cx+ax*h)-sx; let dy=(cy+ay*h)-sy; let dz=(cz+az*h)-sz;
    let length_sq=(dx*dx+dy*dy+dz*dz).max(1e-6);
    let t=(((x-sx)*dx+(y-sy)*dy+(z-sz)*dz)/length_sq).clamp(0.0,1.0);
    let px=x-(sx+dx*t); let py=y-(sy+dy*t); let pz=z-(sz+dz*t);
    (px*px+py*py+pz*pz).sqrt()-r
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn ellipsoid() {
        assert_eq!(exo_ellipsoid_clearance(0.,0.,0.,0.,0.,0.,1.,2.,3.),-1.);
        assert_eq!(exo_ellipsoid_clearance(1.,0.,0.,0.,0.,0.,1.,2.,3.),0.);
        assert!(exo_ellipsoid_clearance(0.,0.,0.,0.,0.,0.,0.,0.,0.).is_nan());
    }
    #[test] fn capsule() {
        assert_eq!(exo_capsule_clearance(0.,0.,0.,0.,0.,0.,0.,1.,0.,1.,0.5),-0.5);
        assert_eq!(exo_capsule_clearance(0.,2.,0.,0.,0.,0.,0.,1.,0.,1.,0.5),0.5);
        assert_eq!(exo_capsule_clearance(1.,0.,0.,0.,0.,0.,0.,0.,0.,0.,0.5),0.5);
        assert!(exo_capsule_clearance(f64::NAN,0.,0.,0.,0.,0.,0.,1.,0.,1.,0.5).is_nan());
    }
}
