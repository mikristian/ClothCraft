//! Pure coordinate projections for EXO's 2D precision drafting editor.
//! Validation, point IDs, undo and serialization stay in the document layer.

#[no_mangle]
pub extern "C" fn exo_precision_chord_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_chord_along(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,length:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    let mx=(ax+bx)/2.0;
    let my=(ay+by)/2.0;
    ((cx-mx)*dx+(cy-my)*dy)/length
}

#[no_mangle]
pub extern "C" fn exo_chord_depth(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,length:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    let mx=(ax+bx)/2.0;
    let my=(ay+by)/2.0;
    (-(cx-mx)*dy+(cy-my)*dx)/length
}

#[no_mangle]
pub extern "C" fn exo_chord_control_x(ax:f64,ay:f64,bx:f64,by:f64,along:f64,depth:f64,length:f64)->f64 {
    (ax+bx)/2.0+(along*(bx-ax)-depth*(by-ay))/length
}

#[no_mangle]
pub extern "C" fn exo_chord_control_y(ax:f64,ay:f64,bx:f64,by:f64,along:f64,depth:f64,length:f64)->f64 {
    (ay+by)/2.0+(along*(by-ay)+depth*(bx-ax))/length
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn horizontal_chord_and_roundtrip() {
        let len=10.0;
        assert_eq!(exo_chord_control_x(0.,0.,10.,0.,2.5,6.,len),7.5);
        assert_eq!(exo_chord_control_y(0.,0.,10.,0.,2.5,6.,len),6.);
        assert_eq!(exo_chord_along(0.,0.,10.,0.,7.5,6.,len),2.5);
        assert_eq!(exo_chord_depth(0.,0.,10.,0.,7.5,6.,len),6.);
    }

    #[test]
    fn reversed_and_vertical_chords() {
        let len=10.;
        assert_eq!(exo_chord_control_x(0.,0.,0.,10.,2.,3.,len),-3.);
        assert_eq!(exo_chord_control_y(0.,0.,0.,10.,2.,3.,len),7.);
        assert_eq!(exo_chord_along(0.,0.,0.,10.,-3.,7.,len),2.);
        assert_eq!(exo_chord_depth(0.,0.,0.,10.,-3.,7.,len),3.);
        assert_eq!(exo_chord_depth(0.,10.,0.,0.,-3.,3.,len),-3.);
    }

    #[test]
    fn signed_and_degenerate_numeric_propagation() {
        assert!(exo_chord_depth(0.,0.,0.,0.,1.,2.,0.).is_nan());
        assert!(exo_chord_along(0.,0.,1.,0.,f64::NAN,2.,1.).is_nan());
        assert!(exo_chord_control_x(0.,0.,1.,0.,f64::INFINITY,1.,1.).is_infinite());
    }
}
