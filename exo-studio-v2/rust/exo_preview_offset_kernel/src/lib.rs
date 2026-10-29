//! Preview only. JS retains authoritative physical contour sampling.
#[no_mangle] pub extern "C" fn exo_preview_offset_abi_version()->u32{1}
#[no_mangle] pub extern "C" fn exo_preview_offset_x(px:f64,ax:f64,ay:f64,bx:f64,by:f64,sign:f64,offset:f64)->f64{
 let length=(bx-ax).hypot(by-ay);let length=if length==0. {1.} else {length};
 px-sign*(by-ay)/length*offset
}
#[no_mangle] pub extern "C" fn exo_preview_offset_y(py:f64,ax:f64,ay:f64,bx:f64,by:f64,sign:f64,offset:f64)->f64{
 let length=(bx-ax).hypot(by-ay);let length=if length==0. {1.} else {length};
 py+sign*(bx-ax)/length*offset
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn normals_and_degenerate(){assert_eq!(exo_preview_offset_x(2.,0.,0.,0.,0.,1.,0.75),2.);assert_eq!(exo_preview_offset_y(3.,0.,0.,0.,0.,1.,0.75),3.);assert_eq!(exo_preview_offset_x(2.,0.,0.,0.,2.,1.,0.75),1.25);assert_eq!(exo_preview_offset_y(3.,0.,0.,2.,0.,-1.,0.75),2.25);}
}
