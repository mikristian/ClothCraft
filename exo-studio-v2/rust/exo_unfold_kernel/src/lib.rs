// Only arithmetic on already validated inputs; public errors and metadata stay in JS.
#[no_mangle]
pub extern "C" fn exo_unfold_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_unfold_walk(n: u32, fold: u32, i: u32) -> u32 {
    ((fold as u64 + 1 + i as u64) % n as u64) as u32
}
#[no_mangle]
pub extern "C" fn exo_unfold_mirrored_edge(n: u32, k: u32) -> u32 { 2 * n - 3 - k }
fn grade(x: f64, y: f64, ux: f64, uy: f64) -> (f64, f64) {
    let projection = 2.0 * (ux * x + uy * y);
    (projection * ux - x, projection * uy - y)
}
#[no_mangle]
pub extern "C" fn exo_unfold_grade_x(x: f64, y: f64, ux: f64, uy: f64) -> f64 { grade(x,y,ux,uy).0 }
#[no_mangle]
pub extern "C" fn exo_unfold_grade_y(x: f64, y: f64, ux: f64, uy: f64) -> f64 { grade(x,y,ux,uy).1 }
#[no_mangle]
pub extern "C" fn exo_unfold_notch(t: f64) -> f64 { 1.0 - t }
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn traversal() {
        for n in 3..100 {
            for fold in 0..n {
                for k in 0..n {
                    assert_eq!(exo_unfold_walk(n,fold,k),(fold+1+k)%n);
                    if k<n-1 { assert_eq!(exo_unfold_mirrored_edge(n,k),2*n-3-k); }
                }
            }
        }
    }
    #[test]
    fn reflection() {
        assert_eq!(grade(2.,3.,0.,1.),(-2.,3.));
        assert_eq!(grade(2.,3.,1.,0.),(2.,-3.));
        let reflected = grade(2.,3.,0.6,0.8);
        assert!((reflected.0-2.32).abs()<1e-12 && (reflected.1-2.76).abs()<1e-12);
        assert_eq!(exo_unfold_notch(0.25),0.75);
        assert!(exo_unfold_notch(f64::NAN).is_nan());
        assert_eq!(exo_unfold_notch(f64::INFINITY),f64::NEG_INFINITY);
    }
}
