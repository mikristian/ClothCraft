//! Numeric triangle metrics only; validation and report policy belong to JS.
#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
extern "C" { fn hypot(x: f64, y: f64) -> f64; }
fn length(x: f64, y: f64) -> f64 {
    // Use the host Math.hypot to preserve engine-specific rounding at thresholds.
    #[cfg(target_arch = "wasm32")]
    { unsafe { hypot(x, y) } }
    #[cfg(not(target_arch = "wasm32"))]
    { x.hypot(y) }
}
pub fn metrics(ax:f64, ay:f64, bx:f64, by:f64, cx:f64, cy:f64) -> [f64;4] {
    let twice_area = ((bx-ax)*(cy-ay)-(by-ay)*(cx-ax)).abs();
    let edges = [length(bx-ax,by-ay),length(cx-bx,cy-by),length(ax-cx,ay-cy)];
    let longest = if edges.iter().any(|x| x.is_nan()) { f64::NAN }
        else { edges[0].max(edges[1]).max(edges[2]) };
    let altitude = if longest != 0.0 && !longest.is_nan() { twice_area/longest } else { 0.0 };
    let aspect = if altitude != 0.0 && !altitude.is_nan() { longest/altitude } else { f64::INFINITY };
    [twice_area,longest,altitude,aspect]
}
static mut OUTPUT: [f64;4] = [0.0;4];
#[no_mangle]
pub extern "C" fn exo_mesh_quality_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_triangle_quality(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64) -> *const f64 {
    unsafe { OUTPUT = metrics(ax,ay,bx,by,cx,cy); }
    std::ptr::addr_of!(OUTPUT).cast::<f64>()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn regular_and_thin() {
        let m=metrics(0.,0.,3.,0.,0.,4.);
        assert_eq!(m,[12.,5.,2.4,5./2.4]);
        let m=metrics(0.,0.,1.,0.,0.,1e-12);
        assert_eq!(m[0],1e-12); assert!(m[3]>=1e12);
    }
    #[test] fn degenerate_collinear_and_extreme() {
        assert_eq!(metrics(0.,0.,0.,0.,0.,0.),[0.,0.,0.,f64::INFINITY]);
        assert_eq!(metrics(0.,0.,1.,0.,2.,0.),[0.,2.,0.,f64::INFINITY]);
        let m=metrics(0.,0.,1e200,0.,0.,1e200);
        assert!(m[0].is_infinite()); assert!(m[1].is_finite());
        assert_eq!(m[3],0.);
        assert!(metrics(f64::NAN,0.,1.,0.,0.,1.)[0].is_nan());
        assert!(metrics(0.,0.,f64::INFINITY,0.,0.,1.)[2].is_nan());
    }
}
