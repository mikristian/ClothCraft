//! POM measurement annotation anchor in the same SVG coordinate space as endpoints.
//! No rendering, DOM dependency, allocations, or platform-specific code.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point { pub x: f64, pub y: f64 }

/// Move from the midpoint along the left-hand unit normal of the measured
/// segment, then apply a screen-coordinate offset. For a horizontal POM line
/// drawn left-to-right, a positive normal offset moves the label upward.
/// Invalid inputs or a degenerate segment return None.
pub fn pom_label_anchor(a: Point, b: Point, normal_offset: f64, dx: f64, dy: f64) -> Option<Point> {
    if ![a.x, a.y, b.x, b.y, normal_offset, dx, dy].iter().all(|n| n.is_finite()) { return None; }
    let vx = b.x - a.x;
    let vy = b.y - a.y;
    let length = vx.hypot(vy);
    if !length.is_finite() || length <= 1e-12 { return None; }
    let x = a.x + vx * 0.5 - (vy / length) * normal_offset + dx;
    let y = a.y + vy * 0.5 + (vx / length) * -normal_offset + dy;
    if x.is_finite() && y.is_finite() { Some(Point { x, y }) } else { None }
}

#[no_mangle]
pub extern "C" fn exo_pom_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_pom_label_x(ax:f64, ay:f64, bx:f64, by:f64, normal:f64, dx:f64, dy:f64) -> f64 {
    pom_label_anchor(Point{x:ax,y:ay}, Point{x:bx,y:by},normal,dx,dy).map_or(f64::NAN, |p| p.x)
}

#[no_mangle]
pub extern "C" fn exo_pom_label_y(ax:f64, ay:f64, bx:f64, by:f64, normal:f64, dx:f64, dy:f64) -> f64 {
    pom_label_anchor(Point{x:ax,y:ay}, Point{x:bx,y:by},normal,dx,dy).map_or(f64::NAN, |p| p.y)
}

/// Return the horizontal crossing of an oriented material boundary segment.
/// `NaN` denotes no crossing. Horizontal segments near the line return their
/// minimum endpoint X; callers still consider both endpoints for full spans.
pub fn horizontal_crossing(a:Point,b:Point,y:f64)->Option<f64>{
    if ![a.x,a.y,b.x,b.y,y].iter().all(|n|n.is_finite()){return None;}
    if (a.y-b.y).abs()<1e-6 {
        return if (y-a.y).abs()<0.01 {Some(a.x.min(b.x))} else {None};
    }
    if y<a.y.min(b.y) || y>a.y.max(b.y) {return None;}
    let x=a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y);
    x.is_finite().then_some(x)
}

#[no_mangle]
pub extern "C" fn exo_pom_horizontal_crossing(ax:f64,ay:f64,bx:f64,by:f64,y:f64)->f64{
    horizontal_crossing(Point{x:ax,y:ay},Point{x:bx,y:by},y).unwrap_or(f64::NAN)
}

// Presentation-only theme tokens shared by the native desktop host and WASM.
// Explicit hex validation in Rust keeps CSS injection and invalid stored colors
// out of the rendered theme. This never alters geometry or material properties.
pub const EXO_THEME_ABI_VERSION: u32 = 1;

fn hex_digit(byte: u32) -> Option<u32> {
    match byte {
        48..=57 => Some(byte - 48),
        65..=70 => Some(byte - 65 + 10),
        97..=102 => Some(byte - 97 + 10),
        _ => None,
    }
}

/// A 7-byte #RRGGBB input. The all-zero input denotes Automatic.
/// Returns a 24-bit RGB integer; `fallback` is always used for invalid input.
pub fn resolve_theme_color(bytes: [u32; 7], fallback: u32) -> u32 {
    let safe_fallback = fallback & 0x00ff_ffff;
    if bytes.iter().all(|byte| *byte == 0) { return safe_fallback; }
    if bytes[0] != b'#' as u32 { return safe_fallback; }
    let mut value = 0u32;
    for byte in bytes.iter().skip(1) {
        let Some(nibble) = hex_digit(*byte) else { return safe_fallback; };
        value = (value << 4) | nibble;
    }
    value
}

pub fn full_2d_nest_visible(is_two_d: bool, full_workspace: bool, native_two_d: bool) -> bool {
    is_two_d && (full_workspace || native_two_d)
}

#[no_mangle]
pub extern "C" fn exo_theme_abi_version() -> u32 { EXO_THEME_ABI_VERSION }

#[no_mangle]
pub extern "C" fn exo_theme_resolve_rgb(
    hash: u32, r1: u32, r2: u32, g1: u32, g2: u32, b1: u32, b2: u32, fallback: u32,
) -> u32 {
    resolve_theme_color([hash, r1, r2, g1, g2, b1, b2], fallback)
}

#[no_mangle]
pub extern "C" fn exo_theme_full_2d_nest_visible(is_two_d: u32, full_workspace: u32, native_two_d: u32) -> u32 {
    u32::from(full_2d_nest_visible(is_two_d != 0, full_workspace != 0, native_two_d != 0))
}

#[no_mangle]
pub extern "C" fn exo_theme_glow_enabled(enabled: u32) -> u32 { u32::from(enabled == 1) }

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn theme_hex_validation_and_auto() {
        let input = [35, 49, 50, 97, 66, 67, 100]; // #12aBCd
        assert_eq!(resolve_theme_color(input, 0xeeeeee), 0x12abcd);
        assert_eq!(exo_theme_resolve_rgb(35, 49, 50, 97, 66, 67, 100, 0), 0x12abcd);
        assert_eq!(resolve_theme_color([0;7], 0xffffff), 0xffffff);
        assert_eq!(resolve_theme_color([0;7], u32::MAX), 0xffffff);
        assert_eq!(resolve_theme_color([35, 49, 50, 51, 52, 53, 90], 0x123456), 0x123456);
        assert_eq!(resolve_theme_color([0, 49, 50, 51, 52, 53, 54], 0x123456), 0x123456);
        assert_eq!(exo_theme_abi_version(), EXO_THEME_ABI_VERSION);
    }
    #[test] fn nest_visibility_only_full_two_dimensional_workspace() {
        assert_eq!(exo_theme_full_2d_nest_visible(1, 1, 0), 1);
        assert_eq!(exo_theme_full_2d_nest_visible(1, 0, 1), 1);
        assert_eq!(exo_theme_full_2d_nest_visible(1, 0, 0), 0);
        assert_eq!(exo_theme_full_2d_nest_visible(0, 1, 1), 0);
        assert_eq!(exo_theme_glow_enabled(1), 1);
        assert_eq!(exo_theme_glow_enabled(0), 0);
        assert_eq!(exo_theme_glow_enabled(5), 0);
    }
    #[test] fn horizontal_crossing_geometry(){
        assert_eq!(horizontal_crossing(p(0.,0.),p(10.,10.),5.),Some(5.));
        assert_eq!(horizontal_crossing(p(0.,10.),p(10.,0.),5.),Some(5.));
        assert_eq!(horizontal_crossing(p(0.,0.),p(10.,0.),0.),Some(0.));
        assert_eq!(horizontal_crossing(p(0.,0.),p(10.,0.),3.),None);
        assert_eq!(horizontal_crossing(p(0.,0.),p(10.,10.),20.),None);
        assert!(exo_pom_horizontal_crossing(0.,0.,10.,10.,20.).is_nan());
    }
    fn p(x:f64,y:f64)->Point {Point{x,y}}
    #[test] fn horizontal_pom() {
        assert_eq!(pom_label_anchor(p(0.,10.),p(20.,10.),2.,3.,-1.),Some(p(13.,7.)));
    }
    #[test] fn vertical_and_reversal() {
        assert_eq!(pom_label_anchor(p(4.,0.),p(4.,10.),2.,0.,0.),Some(p(2.,5.)));
        assert_eq!(pom_label_anchor(p(4.,10.),p(4.,0.),2.,0.,0.),Some(p(6.,5.)));
    }
    #[test] fn translation_invariance() {
        let a=p(2.,4.);let b=p(8.,12.);
        let first=pom_label_anchor(a,b,3.,1.,-2.).unwrap();
        let shifted=pom_label_anchor(p(a.x+100.,a.y-50.),p(b.x+100.,b.y-50.),3.,1.,-2.).unwrap();
        assert!((shifted.x-first.x-100.).abs()<1e-12);
        assert!((shifted.y-first.y+50.).abs()<1e-12);
    }
    #[test] fn reject_invalid_and_degenerate() {
        assert_eq!(pom_label_anchor(p(1.,1.),p(1.,1.),2.,0.,0.),None);
        assert_eq!(pom_label_anchor(p(f64::NAN,1.),p(2.,1.),2.,0.,0.),None);
        assert!(exo_pom_label_x(1.,1.,1.,1.,2.,0.,0.).is_nan());
    }
}
