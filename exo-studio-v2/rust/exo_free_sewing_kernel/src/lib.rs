//! Free Sewing geometry in metres. The JS API validates indices/coordinates;
//! this compact ABI accepts one polyline per call, not one vertex per call.
//! Packed f64 layout: input [x0,y0,...], output [x0,y0,...].

#[no_mangle]
pub extern "C" fn exo_free_sewing_abi_version() -> u32 { 1 }

// A fixed WASM scratch arena. Avoids requiring a heap allocator, and bounds
// processing to 8192 vertices (far more than interactive garment cutlines).
const CAP: usize = 8192;
static mut INPUT: [f64; CAP * 2] = [0.0; CAP * 2];
static mut OUTPUT: [f64; CAP * 2] = [0.0; CAP * 2];

#[no_mangle]
pub extern "C" fn exo_free_sewing_input_ptr() -> *mut f64 {
    std::ptr::addr_of_mut!(INPUT).cast::<f64>()
}

#[no_mangle]
pub extern "C" fn exo_free_sewing_output_ptr() -> *const f64 {
    std::ptr::addr_of!(OUTPUT).cast::<f64>()
}

#[no_mangle]
pub extern "C" fn exo_free_sewing_capacity() -> u32 { CAP as u32 }

fn length(a: [f64;2], b: [f64;2]) -> f64 { (b[0]-a[0]).hypot(b[1]-a[1]) }
fn clamp01(t: f64) -> f64 { t.max(0.0).min(1.0) }
fn lerp(a: [f64;2], b:[f64;2], t:f64) -> [f64;2] {
    [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
}
fn segments(pts:&[[f64;2]]) -> (Vec<f64>, f64) {
    let mut lengths=Vec::with_capacity(pts.len().saturating_sub(1));
    let mut total=0.0;
    for i in 1..pts.len(){ let l=length(pts[i-1],pts[i]);lengths.push(l);total+=l; }
    (lengths,total)
}

pub fn project(pts:&[[f64;2]], mouse:[f64;2]) -> Option<[f64;5]> {
    if pts.len()<2{return None}
    let (lengths,total)=segments(pts);
    if total<=1e-7{return None}
    let mut traversed=0.0;
    let mut best:Option<[f64;5]>=None;
    for i in 1..pts.len(){
        let a=pts[i-1];let b=pts[i];let l=lengths[i-1];
        if l<=1e-9{traversed+=l;continue}
        let dx=b[0]-a[0];let dy=b[1]-a[1];
        let u=clamp01(((mouse[0]-a[0])*dx+(mouse[1]-a[1])*dy)/(l*l));
        let p=[a[0]+u*dx,a[1]+u*dy];
        let d=length(p,mouse);
        if best.is_none_or(|v|d<v[3]){best=Some([(traversed+u*l)/total,p[0],p[1],d,total]);}
        traversed+=l;
    }
    best
}

pub fn point_at(pts:&[[f64;2]], fraction:f64) -> Option<[f64;2]> {
    if pts.len()<2{return None}
    let (lengths,total)=segments(pts);
    if total<=1e-7{return None}
    let target=clamp01(fraction)*total;
    let mut traversed=0.0;
    for i in 1..pts.len(){
        let l=lengths[i-1];
        if l>1e-9&&(traversed+l>=target||i==pts.len()-1){
            let t=clamp01((target-traversed)/l);
            return Some(lerp(pts[i-1],pts[i],t))
        }
        traversed+=l;
    }
    pts.last().copied()
}

pub fn range(pts:&[[f64;2]],start:f64,end:f64)->Vec<[f64;2]>{
    if pts.len()<2{return vec![]}
    let (lengths,total)=segments(pts);
    if total<=1e-7{return vec![]}
    let low=clamp01(start.min(end))*total;
    let high=clamp01(start.max(end))*total;
    if high-low<=1e-8{return vec![]}
    let mut output:Vec<[f64;2]>=Vec::new();
    let mut traversed=0.0;
    for i in 1..pts.len(){
        let l=lengths[i-1];let begin=traversed;let finish=begin+l;
        if l>1e-9&&finish>=low-1e-9&&begin<=high+1e-9{
            let a=pts[i-1];let b=pts[i];
            let from=lerp(a,b,clamp01((low.max(begin)-begin)/l));
            let to=lerp(a,b,clamp01((high.min(finish)-begin)/l));
            if output.is_empty(){output.push(from)}
            if output.last().is_some_and(|last|length(*last,to)>1e-9){output.push(to)}
        }
        traversed=finish;
    }
    output
}

// Returns 0 for invalid/degenerate input. Projection emits 5 values; fraction
// emits 2; range emits 2*count values. JS reconstructs original return shapes.
#[no_mangle]
pub extern "C" fn exo_free_sewing_process(op:u32,count:u32,a:f64,b:f64)->u32 {
    let n=count as usize;
    if n<2||n>CAP||!a.is_finite()||!b.is_finite(){return 0}
    // Only JS owns this mutable arena. Calls are sequential on one WASM instance.
    let points=unsafe{std::slice::from_raw_parts(std::ptr::addr_of!(INPUT).cast::<f64>(),2*n)};
    let pts:Vec<[f64;2]>=points.chunks_exact(2).map(|v|[v[0],v[1]]).collect();
    let values:Vec<f64>=match op {
        1=>project(&pts,[a,b]).map(|v|v.to_vec()).unwrap_or_default(),
        2=>point_at(&pts,a).map(|v|v.to_vec()).unwrap_or_default(),
        3=>range(&pts,a,b).into_iter().flat_map(|p|p.into_iter()).collect(),
        _=>vec![],
    };
    let out=unsafe{std::slice::from_raw_parts_mut(std::ptr::addr_of_mut!(OUTPUT).cast::<f64>(),2*CAP)};
    out[..values.len()].copy_from_slice(&values);
    values.len() as u32
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]fn corner_projection(){let pts=[[0.,0.],[0.1,0.],[0.1,0.1]];let p=project(&pts,[0.11,0.05]).unwrap();assert!((p[0]-0.75).abs()<1e-12);assert!((p[4]-0.2).abs()<1e-12);}
    #[test]fn corner_range(){let pts=[[0.,0.],[0.1,0.],[0.1,0.1]];let p=range(&pts,0.2,0.8);assert_eq!(p.len(),3);assert_eq!(p[1],[0.1,0.]);}
    #[test]fn endpoint_and_degenerate(){let pts=[[0.,0.],[0.,0.],[0.2,0.]];assert_eq!(point_at(&pts,1.).unwrap(),[0.2,0.]);assert_eq!(point_at(&[[0.,0.],[0.,0.]],0.5),None);}
}
