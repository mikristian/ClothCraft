const EPS:f64=1e-7;
fn cross(x:f64,y:f64,u:f64,v:f64)->f64{x*v-y*u}
/// 0: disjoint, 1: point, 2: overlapping collinear intervals.
pub fn classify(a:[f64;8])->(u32,f64,f64){
 let [ax,ay,bx,by,cx,cy,dx,dy]=a;
 if ax.min(bx)>cx.max(dx)+EPS || ax.max(bx)<cx.min(dx)-EPS || ay.min(by)>cy.max(dy)+EPS || ay.max(by)<cy.min(dy)-EPS{return (0,0.,0.)}
 let (rx,ry,sx,sy)=(bx-ax,by-ay,dx-cx,dy-cy);
 let (mx,my)=(cx-ax,cy-ay);
 let det=cross(rx,ry,sx,sy);
 if det.abs()>=EPS{
  let t=cross(mx,my,sx,sy)/det;
  let u=cross(mx,my,rx,ry)/det;
  return if t>=-EPS && t<=1.+EPS && u>=-EPS && u<=1.+EPS{(1,ax+t*rx,ay+t*ry)}else{(0,0.,0.)};
 }
 if cross(mx,my,rx,ry).abs()>=EPS{return (0,0.,0.)}
 let rr=rx*rx+ry*ry;
 if rr<=EPS*EPS{return if (ax-cx).hypot(ay-cy)<=1e-5{(1,ax,ay)}else{(0,0.,0.)}}
 let start=(mx*rx+my*ry)/rr;
 let end=((dx-ax)*rx+(dy-ay)*ry)/rr;
 let low=0f64.max(start.min(end));
 let high=1f64.min(start.max(end));
 if high<low-EPS{(0,0.,0.)}else if high-low>EPS{(2,0.,0.)}else{(1,ax+low*rx,ay+low*ry)}
}
#[cfg(test)] mod tests{use super::*;#[test]fn cases(){assert_eq!(classify([0.,0.,2.,2.,0.,2.,2.,0.]).0,1);assert_eq!(classify([0.,0.,2.,0.,1.,0.,3.,0.]).0,2);assert_eq!(classify([0.,0.,1.,0.,2.,0.,3.,0.]).0,0);}}
