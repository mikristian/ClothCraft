//! Pure deletion edge mapping and sampled cutline validity. No editor state.
use crate::topology::classify;

#[no_mangle]
pub extern "C" fn exo_deleted_point_edge(edge: f64, point: f64, count: f64) -> f64 {
    if !edge.is_finite() || edge.fract() != 0.0 || edge < 0.0 || edge >= count { return -1.0; }
    let previous = (point - 1.0 + count) % count;
    if edge == previous || edge == point { -1.0 }
    else if point == 0.0 || edge > point { edge - 1.0 } else { edge }
}

// Owned transfer buffer: five doubles per vertex (x,y,curved,cx,cy).
#[no_mangle]
pub extern "C" fn exo_deletion_alloc(len: usize) -> *mut f64 {
    Box::into_raw(vec![0.0; len].into_boxed_slice()) as *mut f64
}
#[no_mangle]
pub unsafe extern "C" fn exo_deletion_free(ptr: *mut f64, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}
#[no_mangle]
pub unsafe extern "C" fn exo_deletion_valid(ptr: *const f64, len: usize) -> u32 {
    valid(std::slice::from_raw_parts(ptr, len)) as u32
}
fn near(a: [f64;2], b: [f64;2]) -> bool { (a[0]-b[0]).hypot(a[1]-b[1]) <= 1e-5 }
fn coordinate(v: f64) -> bool { v.is_finite() && v.abs() <= 100000.0 }
pub fn valid(data: &[f64]) -> bool {
    if data.len()%5 != 0 || data.len()<15 { return false; }
    let vertices: Vec<_> = data.chunks_exact(5).collect();
    let n=vertices.len();
    let mut segments=Vec::new();
    let mut area=0.0;
    // Anchor shoelace products to a local vertex to retain small contours at
    // large valid pattern offsets (the JS topology validator does the same).
    let origin=[vertices[0][0],vertices[0][1]];
    for i in 0..n {
        let a=vertices[i]; let b=vertices[(i+1)%n];
        if !coordinate(a[0]) || !coordinate(a[1]) || (b[0]-a[0]).hypot(b[1]-a[1])<0.001 { return false; }
        let curved=a[2]!=0.0;
        if curved && (!coordinate(a[3]) || !coordinate(a[4])) { return false; }
        let samples=if curved {24} else {1};
        let at=|step:usize| {
            if !curved { return if step==0 {[a[0],a[1]]} else {[b[0],b[1]]}; }
            let t=step as f64 / samples as f64; let u=1.0-t;
            [u*u*a[0]+2.0*u*t*a[3]+t*t*b[0],u*u*a[1]+2.0*u*t*a[4]+t*t*b[1]]
        };
        for s in 0..samples {
            let p=at(s); let q=at(s+1);
            area+=(p[0]-origin[0])*(q[1]-origin[1])
                -(q[0]-origin[0])*(p[1]-origin[1]);
            segments.push((i,s,p,q));
        }
    }
    if (0.5*area).abs()<1e-5 {return false;}
    for (i,&(edge,s,a,b)) in segments.iter().enumerate() {
        for &(other,t,c,d) in &segments[i+1..] {
            let (kind,x,y)=classify([a[0],a[1],b[0],b[1],c[0],c[1],d[0],d[1]]);
            if kind==0 {continue;}
            if kind==1 {
                if edge==other && s.abs_diff(t)==1 && near([x,y],b) {continue;}
                let join=if (edge+1)%n==other {Some(vertices[other])}
                    else if (other+1)%n==edge {Some(vertices[edge])} else {None};
                if edge!=other && join.is_some_and(|v|near([x,y],[v[0],v[1]])) {continue;}
            }
            return false;
        }
    }
    true
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn mapping() {
        assert_eq!(exo_deleted_point_edge(3.,1.,5.),2.);
        assert_eq!(exo_deleted_point_edge(0.,1.,5.),-1.);
        assert_eq!(exo_deleted_point_edge(4.,0.,5.),-1.);
        assert_eq!(exo_deleted_point_edge(2.,0.,5.),1.);
        assert_eq!(exo_deleted_point_edge(f64::NAN,1.,5.),-1.);
    }
    #[test] fn contours() {
        let mut v=vec![0.,0.,0.,0.,0., 10.,0.,0.,0.,0., 10.,10.,0.,0.,0., 0.,10.,0.,0.,0.];
        assert!(valid(&v));
        v[2]=1.;v[3]=30.;v[4]=0.; assert!(!valid(&v)); // foldback
        v[2]=0.;v[5]=0.;v[6]=0.; assert!(!valid(&v));
        v[0]=f64::NAN; assert!(!valid(&v));
        assert!(!valid(&[]));
    }
    #[test] fn far_origin_area() {
        let v=vec![99999.,99999.,0.,0.,0.,
            99999.01,99999.,0.,0.,0.,
            99999.01,99999.01,0.,0.,0.,
            99999.,99999.01,0.,0.,0.];
        assert!(valid(&v), "small valid contour must survive translated shoelace area");
    }
}
