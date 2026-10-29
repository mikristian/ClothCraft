//! 2D material occupied intervals from arbitrary nondegenerate triangles.
use std::alloc::{alloc, dealloc, Layout};

pub fn material_spans(triangles: &[[f64; 6]], station: f64, vertical: bool) -> Vec<[f64; 2]> {
    if !station.is_finite() { return Vec::new(); }
    let mut occupied = Vec::new();
    for triangle in triangles {
        if triangle.iter().any(|coord| !coord.is_finite()) { continue; }
        let [[ax,ay],[bx,by],[cx,cy]] = [
            [triangle[0],triangle[1]], [triangle[2],triangle[3]], [triangle[4],triangle[5]]
        ];
        if ((bx-ax)*(cy-ay)-(by-ay)*(cx-ax)).abs()<1e-12 {continue;}
        let verts = [[ax,ay],[bx,by],[cx,cy]];
        let mut intersections=Vec::with_capacity(6);
        for i in 0..3 {
            let p=verts[i]; let q=verts[(i+1)%3];
            let (pa,qa,pc,qc)=if vertical {(p[0],q[0],p[1],q[1])}
                else {(p[1],q[1],p[0],q[0])};
            let dp=pa-station; let dq=qa-station;
            if dp.abs()<1e-10 && dq.abs()<1e-10 {
                intersections.push(pc); intersections.push(qc);
            } else if dp*dq<=0.0 && (qa-pa).abs()>1e-12 {
                let t=(station-pa)/(qa-pa);
                if (-1e-10..=1.0+1e-10).contains(&t) {
                    intersections.push(pc+(qc-pc)*t);
                }
            }
        }
        if intersections.len()<2 { continue; }
        let lo=intersections.iter().copied().fold(f64::INFINITY,f64::min);
        let hi=intersections.iter().copied().fold(f64::NEG_INFINITY,f64::max);
        if hi-lo>1e-7 {occupied.push([lo,hi]);}
    }
    occupied.sort_by(|a,b|a[0].total_cmp(&b[0]));
    let mut merged:Vec<[f64;2]>=Vec::new();
    for [a,b] in occupied {
        if let Some(last)=merged.last_mut() {
            if a<=last[1]+1e-7 {
                last[1]=last[1].max(b);
                continue;
            }
        }
        merged.push([a,b]);
    }
    merged
}

#[no_mangle]
pub extern "C" fn exo_material_guide_abi_version()->u32 {1}

#[no_mangle]
pub extern "C" fn exo_material_guide_alloc(bytes:usize)->*mut u8 {
    if bytes==0 {return std::ptr::null_mut();}
    let Ok(layout)=Layout::from_size_align(bytes,8) else {return std::ptr::null_mut()};
    unsafe {alloc(layout)}
}

#[no_mangle]
pub unsafe extern "C" fn exo_material_guide_free(ptr:*mut u8,bytes:usize) {
    if ptr.is_null()||bytes==0{return;}
    if let Ok(layout)=Layout::from_size_align(bytes,8){dealloc(ptr,layout);}
}

#[no_mangle]
pub unsafe extern "C" fn exo_material_guide_spans(
    input:*const f64,count:usize,station:f64,vertical:u32,output:*mut f64
)->usize {
    if count==0||input.is_null()||output.is_null(){return 0;}
    let Some(len)=count.checked_mul(6) else {return 0};
    if len>isize::MAX as usize/8 {return 0;}
    let values=std::slice::from_raw_parts(input,len);
    let triangles:Vec<[f64;6]>=values.chunks_exact(6)
        .map(|v|[v[0],v[1],v[2],v[3],v[4],v[5]]).collect();
    let spans=material_spans(&triangles,station,vertical!=0);
    for (i,span) in spans.iter().enumerate(){
        *output.add(i*2)=span[0];
        *output.add(i*2+1)=span[1];
    }
    spans.len()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn cutout_is_not_filled() {
        let triangles=[
            [0.,0.,0.4,0.,0.4,0.3],[0.,0.,0.4,0.3,0.,0.3],
            [0.,0.5,0.4,0.5,0.4,0.9],[0.,0.5,0.4,0.9,0.,0.9]
        ];
        assert_eq!(material_spans(&triangles,0.2,true),vec![[0.,0.3],[0.5,0.9]]);
        assert!(material_spans(&triangles,0.4,false).is_empty());
    }
    #[test]
    fn rejects_degenerate_or_invalid_triangles() {
        let triangles=[[0.,0.,1.,1.,2.,2.],[0.,0.,f64::NAN,1.,1.,0.]];
        assert!(material_spans(&triangles,0.5,false).is_empty());
    }
    #[test]
    fn unions_touching_intervals_and_respects_tolerance() {
        let triangles=[[0.,0.,1.,0.,0.,1.],[1.,0.,2.,0.,1.,1.]];
        assert_eq!(material_spans(&triangles,0.,false),vec![[0.,2.]]);
    }
}
