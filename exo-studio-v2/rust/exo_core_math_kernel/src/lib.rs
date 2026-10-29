//! Small deterministic numerical stages shared by eight existing EXO core
//! workflows. Authored data, validations, metadata and rendering stay in JS.
#[no_mangle]
pub extern "C" fn exo_core_math_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_quadratic_component(a:f64,c:f64,b:f64,t:f64)->f64 {
    let u=1.0-t;
    u*u*a+2.0*u*t*c+t*t*b
}

#[no_mangle]
pub extern "C" fn exo_cubic_component(a:f64,c1:f64,c2:f64,b:f64,t:f64)->f64 {
    let q=1.0-t;
    q*q*q*a+3.0*q*q*t*c1+3.0*q*t*t*c2+t*t*t*b
}

#[no_mangle]
pub extern "C" fn exo_segment_distance_squared(px:f64,py:f64,ax:f64,ay:f64,bx:f64,by:f64)->f64 {
    let dx=bx-ax;
    let dy=by-ay;
    let len=dx*dx+dy*dy;
    let t=if len>1e-15 { ((px-ax)*dx+(py-ay)*dy)/len } else { 0.0 };
    let t=t.max(0.0).min(1.0);
    let rx=px-(ax+dx*t);
    let ry=py-(ay+dy*t);
    rx*rx+ry*ry
}

#[no_mangle]
pub extern "C" fn exo_barycentric_u(px:f64,py:f64,_ax:f64,_ay:f64,bx:f64,by:f64,cx:f64,cy:f64,den:f64)->f64 {
    ((by-cy)*(px-cx)+(cx-bx)*(py-cy))/den
}

#[no_mangle]
pub extern "C" fn exo_barycentric_v(px:f64,py:f64,ax:f64,ay:f64,_bx:f64,_by:f64,cx:f64,cy:f64,den:f64)->f64 {
    ((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/den
}

#[no_mangle]
pub extern "C" fn exo_preview_page(total:f64,limit:f64,requested:f64)->f64 {
    let pages=(total/limit).ceil().max(1.0);
    requested.trunc().max(0.0).min(pages-1.0)
}

#[no_mangle]
pub extern "C" fn exo_numeric_clamp(value:f64,lo:f64,hi:f64)->f64 {
    value.max(lo).min(hi)
}

#[no_mangle]
pub extern "C" fn exo_wash_smooth(a:f64,b:f64,x:f64)->f64 {
    let t=((x-a)/(b-a)).max(0.0).min(1.0);
    t*t*(3.0-2.0*t)
}

#[no_mangle]
pub extern "C" fn exo_hardware_swap(width:f64,height:f64,depth:f64)->u32 {
    u32::from(height<width.min(depth)*0.5)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]fn bezier_components(){
        assert_eq!(exo_quadratic_component(0.,10.,0.,0.5),5.);
        assert_eq!(exo_cubic_component(0.,1.,2.,3.,0.5),1.5);
        assert_eq!(exo_quadratic_component(1.,3.,9.,0.),1.);
    }
    #[test]fn segment_and_barycentric(){
        assert_eq!(exo_segment_distance_squared(1.,2.,0.,0.,2.,0.),4.);
        assert_eq!(exo_segment_distance_squared(1.,2.,0.,0.,0.,0.),5.);
        assert_eq!(exo_barycentric_u(0.,0.,0.,0.,2.,0.,0.,2.,4.),1.);
        assert_eq!(exo_barycentric_v(2.,0.,0.,0.,2.,0.,0.,2.,4.),1.);
    }
    #[test]fn paging_clamping_wash_hardware(){
        assert_eq!(exo_preview_page(24.,14.,999.),1.);
        assert_eq!(exo_preview_page(0.,14.,-3.),0.);
        assert_eq!(exo_numeric_clamp(5.,0.,2.),2.);
        assert_eq!(exo_wash_smooth(0.,1.,0.5),0.5);
        assert_eq!(exo_hardware_swap(10.,2.,12.),1);
        assert_eq!(exo_hardware_swap(10.,6.,12.),0);
    }
}
