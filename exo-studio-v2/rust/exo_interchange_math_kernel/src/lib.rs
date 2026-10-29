//! Numerical data interchange, not XML/JSON parsing or garment serialization.
//! JS owns security, source validation, edge references and undo history.
#[no_mangle]
pub extern "C" fn exo_interchange_math_abi_version() -> u32 { 1 }

// GarmentCode's edge-local quadratic control coordinates.
#[no_mangle]
pub extern "C" fn exo_relative_control_along(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    let length=dx*dx+dy*dy;
    let length=if length==0.0 {1.0} else {length};
    let px=cx-ax;
    let py=cy-ay;
    (px*dx+py*dy)/length
}
#[no_mangle]
pub extern "C" fn exo_relative_control_depth(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    let length=dx*dx+dy*dy;
    let length=if length==0.0 {1.0} else {length};
    let px=cx-ax;
    let py=cy-ay;
    (dx*py-dy*px)/length
}
#[no_mangle]
pub extern "C" fn exo_absolute_control_x(ax:f64,ay:f64,bx:f64,by:f64,along:f64,depth:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    ax+along*dx-depth*dy
}
#[no_mangle]
pub extern "C" fn exo_absolute_control_y(ax:f64,ay:f64,bx:f64,by:f64,along:f64,depth:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    ay+along*dy+depth*dx
}

// SeamlyMe's validated, normalized measurements. Rounding stays with JS's
// `toFixed(6)` and retains the exact serialized shape and error precedence.
#[no_mangle]
pub extern "C" fn exo_seamly_cm(value:f64,unit_scale:f64)->f64 {
    value*unit_scale
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn chord_round_trip() {
        assert_eq!(exo_relative_control_along(0.,0.,10.,0.,7.5,6.),0.75);
        assert_eq!(exo_relative_control_depth(0.,0.,10.,0.,7.5,6.),0.6);
        assert_eq!(exo_absolute_control_x(0.,0.,10.,0.,0.75,0.6),7.5);
        assert_eq!(exo_absolute_control_y(0.,0.,10.,0.,0.75,0.6),6.);
    }
    #[test] fn degenerate_and_reversed() {
        assert_eq!(exo_relative_control_along(3.,5.,3.,5.,9.,10.),0.);
        assert_eq!(exo_relative_control_depth(3.,5.,3.,5.,9.,10.),0.);
        assert_eq!(exo_absolute_control_x(1.,2.,1.,2.,1.,1.),1.);
        assert_eq!(exo_absolute_control_y(1.,2.,1.,2.,1.,1.),2.);
        assert_eq!(exo_relative_control_along(10.,0.,0.,0.,7.5,6.),0.25);
    }
    #[test] fn measurement_units_and_nonfinite() {
        assert_eq!(exo_seamly_cm(25.4,0.1),2.54);
        assert_eq!(exo_seamly_cm(5.,2.54),12.7);
        assert!(exo_seamly_cm(f64::NAN,1.).is_nan());
    }
}
