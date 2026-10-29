//! Export contour numerics only. The JS source owns edge-index metadata remaps.
#[no_mangle]pub extern "C" fn exo_export_contour_abi_version()->u32{1}
#[no_mangle]pub extern "C" fn exo_export_edge_keep(ax:f64,ay:f64,bx:f64,by:f64,minimum:f64)->u32{
 u32::from((ax-bx).hypot(ay-by)>=minimum)
}
#[no_mangle]pub extern "C" fn exo_export_area_term(ax:f64,ay:f64,bx:f64,by:f64)->f64{
 ax*by-bx*ay
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn edge_and_winding(){assert_eq!(exo_export_edge_keep(0.,0.,0.005,0.,0.01),0);assert_eq!(exo_export_edge_keep(0.,0.,0.01,0.,0.01),1);assert_eq!(exo_export_area_term(1.,2.,3.,4.),-2.);}
}
