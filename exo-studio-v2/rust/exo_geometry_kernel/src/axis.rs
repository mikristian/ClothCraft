//! CLO-style angular guideline projection in global drafting coordinates.

/// Project displacement onto the nearest angular guideline, in degrees.
/// Caller validates finite points, positive increments and divisibility of 360.
/// The short-motion behavior is handled by the JS compatibility wrapper.
pub fn project(ax: f64, ay: f64, bx: f64, by: f64, degrees: f64) -> (f64, f64) {
    let dx = bx - ax;
    let dy = by - ay;
    if dx.hypot(dy) < 1e-10 { return (bx, by); }
    let increment = degrees * std::f64::consts::PI / 180.0;
    // Match JavaScript Math.round, including negative half ties toward +∞.
    let turns = (dy.atan2(dx) / increment + 0.5).floor();
    let angle = turns * increment;
    project_at_angle(ax,ay,bx,by,angle)
}

/// Projection stage with the snap-angle chosen by the caller. The web adapter
/// supplies JavaScript's rounded angle to avoid libm atan2 half-tie drift.
pub fn project_at_angle(ax:f64,ay:f64,bx:f64,by:f64,angle:f64)->(f64,f64){
    let dx=bx-ax;
    let dy=by-ay;
    let travel = dx * angle.cos() + dy * angle.sin();
    (ax + travel * angle.cos(), ay + travel * angle.sin())
}

#[cfg(test)]
mod tests {
    use super::project;
    fn near(a:f64,b:f64) { assert!((a-b).abs() < 1e-11,"{a} != {b}"); }
    #[test] fn horizontal_and_vertical() {
        let (x,y)=project(10.,20.,24.,22.,45.);near(x,24.);near(y,20.);
        let (x,y)=project(10.,20.,11.,35.,45.);near(x,10.);near(y,35.);
    }
    #[test] fn diagonal_projection_changes_length() {
        let (x,y)=project(0.,0.,8.,6.,45.);near(x,7.);near(y,7.);
    }
    #[test] fn negative_direction_and_translation() {
        let (x,y)=project(5.,-4.,-2.,-10.,45.);near(x,-1.5);near(y,-10.5);
    }
    #[test] fn tiny_motion_retains_destination() {
        assert_eq!(project(1.,2.,1.+1e-12,2.,45.),(1.+1e-12,2.));
    }
}
