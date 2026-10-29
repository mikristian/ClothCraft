//! Pure f64 SVG math. Parsing, validation and sampling remain in JavaScript.
pub fn compose(x: [f64; 6], y: [f64; 6]) -> [f64; 6] {
    [x[0]*y[0]+x[2]*y[1], x[1]*y[0]+x[3]*y[1],
     x[0]*y[2]+x[2]*y[3], x[1]*y[2]+x[3]*y[3],
     x[0]*y[4]+x[2]*y[5]+x[4], x[1]*y[4]+x[3]*y[5]+x[5]]
}
#[no_mangle]
pub extern "C" fn exo_svg_affine_abi_version() -> u32 { 1 }
// Scalar ABI needs no shared scratch memory or allocation ownership.
#[no_mangle]
pub extern "C" fn exo_svg_affine_compose(i: u32, a:f64,b:f64,c:f64,d:f64,e:f64,f:f64,
    g:f64,h:f64,j:f64,k:f64,l:f64,m:f64) -> f64 {
    compose([a,b,c,d,e,f],[g,h,j,k,l,m]).get(i as usize).copied().unwrap_or(f64::NAN)
}
#[no_mangle]
pub extern "C" fn exo_svg_affine_coordinate(a:f64,c:f64,e:f64,x:f64,y:f64,scale:f64) -> f64 {
    (a*x+c*y+e)*scale
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn nested_and_degenerate() {
        let t = [1.,0.,0.,1.,10.,-20.];
        let s = [-2.,0.,0.,0.,0.,0.];
        assert_eq!(compose(t,s),[-2.,0.,0.,0.,10.,-20.]);
        assert_eq!(exo_svg_affine_coordinate(-2.,0.,10.,3.,4.,0.5),2.);
        let r = [0.,1.,-1.,0.,0.,0.];
        assert_eq!(compose(t,r),[0.,1.,-1.,0.,10.,-20.]);
        assert_eq!(compose(r,[2.,3.,4.,5.,6.,7.]),[-3.,2.,-5.,4.,-7.,6.]);
    }
    #[test]
    fn nonfinite_is_preserved_for_js_validation() {
        assert!(exo_svg_affine_coordinate(1.,0.,0.,f64::INFINITY,0.,1.).is_infinite());
        assert!(exo_svg_affine_coordinate(0.,0.,0.,f64::INFINITY,0.,1.).is_nan());
        assert!(compose([f64::NAN;6],[1.;6]).iter().all(|x|x.is_nan()));
        assert_eq!(exo_svg_affine_abi_version(),1);
    }
}
