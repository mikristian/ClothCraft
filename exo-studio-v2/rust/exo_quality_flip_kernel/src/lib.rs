#[cfg(target_arch="wasm32")]
#[link(wasm_import_module="env")]
extern "C" {fn hypot(x:f64,y:f64)->f64;}
fn hyp(x:f64,y:f64)->f64 {#[cfg(target_arch="wasm32")] {unsafe{hypot(x,y)}} #[cfg(not(target_arch="wasm32"))] {x.hypot(y)}}
fn cross(a:[f64;2],b:[f64;2],c:[f64;2])->f64 {(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])}
fn js_max(a:f64,b:f64)->f64 {if a.is_nan()||b.is_nan(){f64::NAN}else if a==0.0&&b==0.0{0.0}else{a.max(b)}}
fn quality(a:[f64;2],b:[f64;2],c:[f64;2])->f64 {let area=cross(a,b,c).abs();let longest=js_max(js_max(hyp(a[0]-b[0],a[1]-b[1]),hyp(b[0]-c[0],b[1]-c[1])),hyp(c[0]-a[0],c[1]-a[1]));if area>1e-11{longest*longest/area}else{f64::INFINITY}}
#[no_mangle] pub extern "C" fn exo_quality_flip_abi_version()->u32{1}
#[no_mangle] pub extern "C" fn exo_convex_quad(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64)->u32 {let (a,b,c,d)=([ax,ay],[bx,by],[cx,cy],[dx,dy]);(!(cross(a,b,c)*cross(a,b,d)>=-1e-10 || cross(c,d,a)*cross(c,d,b)>=-1e-10)) as u32}
#[no_mangle] pub extern "C" fn exo_quality_flip_better(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64,improvement:f64)->u32 {let (a,b,c,d)=([ax,ay],[bx,by],[cx,cy],[dx,dy]);let original=js_max(quality(a,b,c),quality(b,a,d));let next=js_max(quality(c,d,a),quality(d,c,b));(next<original*(1.0-improvement)) as u32}
#[cfg(test)]mod tests{use super::*;#[test]fn convex(){assert_eq!(exo_convex_quad(0.,0.,2.,0.,1.,1.,1.,-1.),1);assert_eq!(exo_convex_quad(0.,0.,2.,0.,1.,1.,1.,2.),0);}#[test]fn quality_metric(){assert!(quality([0.,0.],[1.,0.],[0.,1.]).is_finite());assert!(quality([0.,0.],[1.,0.],[2.,0.]).is_infinite());}}
