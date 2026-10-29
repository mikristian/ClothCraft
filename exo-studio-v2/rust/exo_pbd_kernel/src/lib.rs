//! Ordered f64 distance projection. No integration, contacts or solver policy.
const N: usize = 65536;
const M: usize = 262144;
static mut PARTICLES: [f64; N * 4] = [0.; N * 4];
static mut CONSTRAINTS: [f64; M * 5] = [0.; M * 5];
#[no_mangle]
pub extern "C" fn exo_pbd_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_pbd_particle_capacity() -> usize { N }
#[no_mangle]
pub extern "C" fn exo_pbd_constraint_capacity() -> usize { M }
#[no_mangle]
pub extern "C" fn exo_pbd_particles_ptr() -> *mut f64 { std::ptr::addr_of_mut!(PARTICLES).cast() }
#[no_mangle]
pub extern "C" fn exo_pbd_constraints_ptr() -> *mut f64 { std::ptr::addr_of_mut!(CONSTRAINTS).cast() }

pub fn sweep(p: &mut [f64], c: &[f64], reverse: bool) -> bool {
    // Validate the entire transaction before the first write.
    if p.len() % 4 != 0 || c.len() % 5 != 0 || !p.iter().all(|v| v.is_finite()) { return false; }
    let n = p.len() / 4;
    if !c.chunks_exact(5).all(|r| r.iter().all(|v| v.is_finite()) &&
        r[0] >= 0. && r[0] < n as f64 && r[0].fract() == 0. &&
        r[1] >= 0. && r[1] < n as f64 && r[1].fract() == 0. && (r[4] == 0. || r[4] == 1.)) { return false; }
    for step in 0..c.len()/5 {
        let i = if reverse { c.len()/5 - 1 - step } else { step } * 5;
        let a = c[i] as usize * 4;
        let b = c[i+1] as usize * 4;
        let wa = p[a+3]; let wb = p[b+3]; let total = wa + wb;
        if total <= 1e-6 { continue; }
        let d = [p[b]-p[a], p[b+1]-p[a+1], p[b+2]-p[a+2]];
        let length = (d[0]*d[0] + d[1]*d[1] + d[2]*d[2]).sqrt();
        if length <= 1e-6 { continue; }
        let scale = ((length-c[i+2])/length)*c[i+3];
        for j in 0..3 {
            let correction = d[j]*scale;
            if c[i+4] == 1. {
                if wa > 0. { p[a+j] += correction; }
            } else {
                if wa > 0. { p[a+j] += correction*(wa/total); }
                if wb > 0. { p[b+j] += correction*(-wb/total); }
            }
        }
    }
    true
}
#[no_mangle]
pub extern "C" fn exo_pbd_sweep(n: usize, m: usize, reverse: u32) -> u32 {
    if n > N || m > M { return 0; }
    // Each WASM instance is owned by one synchronous JS thread.
    let p = unsafe { std::slice::from_raw_parts_mut(exo_pbd_particles_ptr(), n*4) };
    let c = unsafe { std::slice::from_raw_parts(exo_pbd_constraints_ptr(), m*5) };
    sweep(p,c,reverse != 0) as u32
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn pins_fuse_zero_and_invalid() {
        let mut p = [0.,0.,0.,1.,2.,0.,0.,0.];
        assert!(sweep(&mut p,&[0.,1.,1.,1.,0.],false)); assert_eq!(p[0],1.);
        assert!(sweep(&mut p,&[0.,1.,0.,1.,1.],true)); assert_eq!(p[0],2.);
        assert!(sweep(&mut p,&[0.,1.,0.,1.,0.],false));
        let before=p; assert!(!sweep(&mut p,&[0.,2.,0.,1.,0.],false)); assert_eq!(p,before);
        assert_eq!(exo_pbd_sweep(N+1,0,0),0);
    }
    #[test] fn malformed_and_pinned() {
        let mut p = [0.,0.,0.,0.,2.,0.,0.,0.];
        let before=p;
        assert!(sweep(&mut p,&[0.,1.,0.,1.,1.],false)); assert_eq!(p,before);
        for c in [[0.5,1.,0.,1.,0.], [0.,1.,f64::NAN,1.,0.], [0.,1.,0.,1.,2.]] {
            assert!(!sweep(&mut p,&c,false)); assert_eq!(p,before);
        }
        assert!(!sweep(&mut p,&[0.],false));
        assert_eq!(exo_pbd_sweep(0,M+1,0),0);
    }
    #[test] fn order_matters() {
        let p=[0.,0.,0.,1.,2.,0.,0.,1.,4.,0.,0.,1.];
        let c=[0.,1.,1.,1.,0.,1.,2.,1.,1.,0.];
        let mut a=p; let mut b=p; assert!(sweep(&mut a,&c,false)); assert!(sweep(&mut b,&c,true)); assert_ne!(a,b);
    }
}
