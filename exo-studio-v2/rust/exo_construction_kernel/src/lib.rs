#[no_mangle]
pub extern "C" fn exo_construction_abi_version()->u32 {1}
fn intersect(a:(f64,f64),b:(f64,f64),c:(f64,f64),d:(f64,f64))->(f64,f64){
 let u=(b.0-a.0,b.1-a.1);let v=(d.0-c.0,d.1-c.1);
 let t=((c.0-a.0)*v.1-(c.1-a.1)*v.0)/(u.0*v.1-u.1*v.0);
 (a.0+t*u.0,a.1+t*u.1)
}
fn project(p:(f64,f64),a:(f64,f64),b:(f64,f64))->(f64,f64){
 let u=(b.0-a.0,b.1-a.1);let t=((p.0-a.0)*u.0+(p.1-a.1)*u.1)/(u.0*u.0+u.1*u.1);
 (a.0+t*u.0,a.1+t*u.1)
}
fn along(a:(f64,f64),b:(f64,f64),distance:f64,normal:bool)->(f64,f64){
 let u=(b.0-a.0,b.1-a.1);let norm=u.0.hypot(u.1);
 if normal {(a.0-u.1/norm*distance,a.1+u.0/norm*distance)}
 else {(a.0+u.0/norm*distance,a.1+u.1/norm*distance)}
}
// Scalars avoid allocation and preserve the synchronous editor API.
#[no_mangle]
pub extern "C" fn exo_intersection_x(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64)->f64{intersect((ax,ay),(bx,by),(cx,cy),(dx,dy)).0}
#[no_mangle]
pub extern "C" fn exo_intersection_y(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64)->f64{intersect((ax,ay),(bx,by),(cx,cy),(dx,dy)).1}
#[no_mangle]
pub extern "C" fn exo_projection_x(px:f64,py:f64,ax:f64,ay:f64,bx:f64,by:f64)->f64{project((px,py),(ax,ay),(bx,by)).0}
#[no_mangle]
pub extern "C" fn exo_projection_y(px:f64,py:f64,ax:f64,ay:f64,bx:f64,by:f64)->f64{project((px,py),(ax,ay),(bx,by)).1}
#[no_mangle]
pub extern "C" fn exo_along_x(ax:f64,ay:f64,bx:f64,by:f64,d:f64,normal:i32)->f64{along((ax,ay),(bx,by),d,normal!=0).0}
#[no_mangle]
pub extern "C" fn exo_along_y(ax:f64,ay:f64,bx:f64,by:f64,d:f64,normal:i32)->f64{along((ax,ay),(bx,by),d,normal!=0).1}
#[no_mangle]
pub extern "C" fn exo_mirror_x(px:f64,py:f64,ax:f64,ay:f64,bx:f64,by:f64)->f64{2.0*project((px,py),(ax,ay),(bx,by)).0-px}
#[no_mangle]
pub extern "C" fn exo_mirror_y(px:f64,py:f64,ax:f64,ay:f64,bx:f64,by:f64)->f64{2.0*project((px,py),(ax,ay),(bx,by)).1-py}
#[cfg(test)] mod tests {use super::*;#[test]fn geometry(){assert_eq!(intersect((0.,0.),(10.,10.),(10.,0.),(0.,10.)),(5.,5.));assert_eq!(project((3.,4.),(0.,0.),(10.,0.)),(3.,0.));assert_eq!(along((0.,0.),(10.,0.),2.,true),(0.,2.));assert_eq!(exo_mirror_y(3.,4.,0.,0.,10.,0.),-4.);}}
