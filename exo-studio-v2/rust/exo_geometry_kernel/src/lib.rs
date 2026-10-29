//! Small dependency-free numerical kernel for EXO CAD drafting and selection.
//! Measurements are expressed in the source unit (centimetres for draft,
//! metres for VBD mesh points). The JS compatibility layer handles validation
//! and unit conversion; no DOM, cloth solver or renderer is duplicated here.

pub const ABI_VERSION: u32 = 1;
mod cubic;
mod axis;
mod topology;
mod point_deletion;
mod span;
mod dxf;

/// DXF notch endpoint in source centimetres; outer=0 is the short inner leg.
#[no_mangle]
pub extern "C" fn exo_dxf_notch_coordinate(point: f64, normal: f64, depth_cm: f64, outer: u32) -> f64 {
    dxf::notch_coordinate(point, normal, depth_cm, outer != 0)
}

#[no_mangle]
pub extern "C" fn exo_pattern_span_horizontal(ax:f64,ay:f64,bx:f64,by:f64,y:f64)->f64 {
    span::intersect([ax,ay],[bx,by],y,true)
}

#[no_mangle]
pub extern "C" fn exo_pattern_span_vertical(ax:f64,ay:f64,bx:f64,by:f64,x:f64)->f64 {
    span::intersect([ax,ay],[bx,by],x,false)
}

#[no_mangle]
pub extern "C" fn exo_topology_kind(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64)->u32{topology::classify([ax,ay,bx,by,cx,cy,dx,dy]).0}
#[no_mangle]
pub extern "C" fn exo_topology_x(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64)->f64{topology::classify([ax,ay,bx,by,cx,cy,dx,dy]).1}
#[no_mangle]
pub extern "C" fn exo_topology_y(ax:f64,ay:f64,bx:f64,by:f64,cx:f64,cy:f64,dx:f64,dy:f64)->f64{topology::classify([ax,ay,bx,by,cx,cy,dx,dy]).2}

pub use axis::project as project_draft_axis;

#[no_mangle]
pub extern "C" fn exo_draft_axis_x(ax:f64, ay:f64, bx:f64, by:f64, degrees:f64) -> f64 {
    project_draft_axis(ax,ay,bx,by,degrees).0
}

#[no_mangle]
pub extern "C" fn exo_draft_axis_y(ax:f64, ay:f64, bx:f64, by:f64, degrees:f64) -> f64 {
    project_draft_axis(ax,ay,bx,by,degrees).1
}

#[no_mangle]
pub extern "C" fn exo_draft_axis_angle_x(ax:f64,ay:f64,bx:f64,by:f64,angle:f64)->f64{
    axis::project_at_angle(ax,ay,bx,by,angle).0
}

#[no_mangle]
pub extern "C" fn exo_draft_axis_angle_y(ax:f64,ay:f64,bx:f64,by:f64,angle:f64)->f64{
    axis::project_at_angle(ax,ay,bx,by,angle).1
}

pub use cubic::{coordinate as cubic_coordinate, derivative as cubic_derivative, polyline_length as cubic_polyline_length};

#[no_mangle]
pub extern "C" fn exo_cubic_coordinate(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    cubic_coordinate(a, b, c, d, t)
}

#[no_mangle]
pub extern "C" fn exo_cubic_derivative(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    cubic_derivative(a, b, c, d, t)
}

#[no_mangle]
pub extern "C" fn exo_cubic_polyline_length(
    ax: f64, ay: f64, bx: f64, by: f64,
    cx: f64, cy: f64, dx: f64, dy: f64,
    start: f64, end: f64, slices: u32,
) -> f64 {
    cubic_polyline_length([ax, ay, bx, by, cx, cy, dx, dy], start, end, slices)
}

/// JavaScript Math.round semantics (negative half ties towards +infinity).
pub fn snap_grid_coordinate(value: f64, origin: f64, spacing: f64) -> f64 {
    origin + (((value - origin) / spacing) + 0.5).floor() * spacing
}

/// Fraction along a 2D segment of the nearest point, clamped to [0,1].
pub fn nearest_segment_t(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    let dx = bx - ax;
    let dy = by - ay;
    let squared = dx * dx + dy * dy;
    if squared < 1e-12 {
        0.0
    } else {
        (((px - ax) * dx + (py - ay) * dy) / squared).clamp(0.0, 1.0)
    }
}

/// Precise physical 2D segment length in metres.
pub fn length_2d(ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    (ax - bx).hypot(ay - by)
}

/// Precise physical 3D segment length in metres.
pub fn length_3d(ax: f64, ay: f64, az: f64, bx: f64, by: f64, bz: f64) -> f64 {
    (ax - bx).hypot(ay - by).hypot(az - bz)
}

/// Exact quadratic Bézier derivative integrated by adaptive Simpson
/// quadrature. Mirrors the editor's reference error bounds and 20-level cap.
pub fn quadratic_arc_length(coords: [f64; 6], start: f64, end: f64, tolerance: f64) -> f64 {
    let lo = start.clamp(0.0, 1.0).min(end.clamp(0.0, 1.0));
    let hi = start.clamp(0.0, 1.0).max(end.clamp(0.0, 1.0));
    if (hi - lo).abs() <= 1e-9 {
        return 0.0;
    }
    let [ax, ay, cx, cy, bx, by] = coords;
    let speed = |t: f64| {
        let x = 2.0 * ((1.0 - t) * (cx - ax) + t * (bx - cx));
        let y = 2.0 * ((1.0 - t) * (cy - ay) + t * (by - cy));
        x.hypot(y)
    };
    fn simpson(a: f64, b: f64, fa: f64, fm: f64, fb: f64) -> f64 {
        (b - a) * (fa + 4.0 * fm + fb) / 6.0
    }
    fn integrate(
        speed: &impl Fn(f64) -> f64,
        a: f64, b: f64, fa: f64, fm: f64, fb: f64,
        full: f64, error: f64, depth: usize,
    ) -> f64 {
        let mid = (a + b) / 2.0;
        let lm = speed((a + mid) / 2.0);
        let rm = speed((mid + b) / 2.0);
        let left = simpson(a, mid, fa, lm, fm);
        let right = simpson(mid, b, fm, rm, fb);
        let delta = left + right - full;
        if depth >= 20 || delta.abs() <= error * 15.0 {
            return left + right + delta / 15.0;
        }
        integrate(speed, a, mid, fa, lm, fm, left, error / 2.0, depth + 1)
            + integrate(speed, mid, b, fm, rm, fb, right, error / 2.0, depth + 1)
    }
    let fm = speed((lo + hi) / 2.0);
    let fa = speed(lo);
    let fb = speed(hi);
    integrate(
        &speed, lo, hi, fa, fm, fb, simpson(lo, hi, fa, fm, fb),
        tolerance.max(1e-11), 0,
    )
}

#[no_mangle]
pub extern "C" fn exo_geometry_abi_version() -> u32 { ABI_VERSION }

#[no_mangle]
pub extern "C" fn exo_grid_coordinate(value: f64, origin: f64, spacing: f64) -> f64 {
    snap_grid_coordinate(value, origin, spacing)
}

#[no_mangle]
pub extern "C" fn exo_nearest_segment_t(
    px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64,
) -> f64 { nearest_segment_t(px, py, ax, ay, bx, by) }

#[no_mangle]
pub extern "C" fn exo_length_2d(
    ax: f64, ay: f64, bx: f64, by: f64,
) -> f64 { length_2d(ax, ay, bx, by) }

#[no_mangle]
pub extern "C" fn exo_length_3d(
    ax: f64, ay: f64, az: f64, bx: f64, by: f64, bz: f64,
) -> f64 { length_3d(ax, ay, az, bx, by, bz) }

#[no_mangle]
pub extern "C" fn exo_quadratic_arc_length(
    ax: f64, ay: f64, cx: f64, cy: f64, bx: f64, by: f64,
    start: f64, end: f64, tolerance: f64,
) -> f64 { quadratic_arc_length([ax,ay,cx,cy,bx,by],start,end,tolerance) }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_including_negative_half_ties() {
        assert_eq!(snap_grid_coordinate(2.7, 0.0, 1.0), 3.0);
        assert_eq!(snap_grid_coordinate(-1.5, 0.0, 1.0), -1.0);
        assert_eq!(snap_grid_coordinate(11.0, 1.0, 4.0), 13.0);
        assert_eq!(exo_geometry_abi_version(), 1);
    }

    #[test]
    fn segment_geometry() {
        assert_eq!(nearest_segment_t(2.5, 2.0, 0.0, 0.0, 10.0, 0.0), 0.25);
        assert_eq!(nearest_segment_t(1.0, 2.0, 0.0, 0.0, 0.0, 0.0), 0.0);
        assert_eq!(length_2d(0.0, 0.0, 3.0, 4.0), 5.0);
        assert_eq!(length_3d(0.0, 0.0, 0.0, 2.0, 3.0, 6.0), 7.0);
    }

    #[test]
    fn quadratic_arclength() {
        let line = [0.0,0.0,5.0,0.0,10.0,0.0];
        assert!((quadratic_arc_length(line,0.0,1.0,1e-7)-10.0).abs()<1e-10);
        assert!((quadratic_arc_length(line,0.25,0.75,1e-7)-5.0).abs()<1e-10);
        assert_eq!(quadratic_arc_length(line,0.5,0.5,1e-7),0.0);
        let curved=[0.0,0.0,10.0,14.0,20.0,0.0];
        let full=quadratic_arc_length(curved,0.0,1.0,1e-8);
        let halves=quadratic_arc_length(curved,0.0,0.5,1e-9)
            +quadratic_arc_length(curved,0.5,1.0,1e-9);
        assert!((full-halves).abs()<1e-7);
        assert_eq!(exo_quadratic_arc_length(0.0,0.0,5.0,0.0,10.0,0.0,0.0,1.0,1e-7),10.0);
    }
}
