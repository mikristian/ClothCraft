//! Physical 2D cubic Bézier evaluation shared by the pattern editor and wasm.
//! Uses f64 throughout so independently adjusted knot tangents and cutline
//! stations do not lose precision to a browser's rendering coordinates.

#[inline]
fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

/// De Casteljau evaluation, preserving the same operation order as the
/// original pattern editor's four-point cubic implementation.
pub fn coordinate(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    let left = lerp(lerp(a, b, t), lerp(b, c, t), t);
    let right = lerp(lerp(b, c, t), lerp(c, d, t), t);
    lerp(left, right, t)
}

pub fn derivative(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
    let u = 1.0 - t;
    3.0 * (u * u * (b - a) + 2.0 * u * t * (c - b) + t * t * (d - c))
}

/// Compatibility length for a cubic piece: `slices` line segments over the
/// requested parameter interval. This matches existing persisted material
/// stations exactly enough for notch/split correspondence. It deliberately
/// does not silently replace authored length measurements with a new solver.
pub fn polyline_length(
    coords: [f64; 8],
    start: f64,
    end: f64,
    slices: u32,
) -> f64 {
    if slices == 0 || !start.is_finite() || !end.is_finite() || start > end ||
        coords.iter().any(|v| !v.is_finite()) {
        return f64::NAN;
    }
    let mut distance = 0.0;
    let mut previous = (
        coordinate(coords[0], coords[2], coords[4], coords[6], start),
        coordinate(coords[1], coords[3], coords[5], coords[7], start),
    );
    for i in 1..=slices {
        let t = start + (end - start) * f64::from(i) / f64::from(slices);
        let current = (
            coordinate(coords[0], coords[2], coords[4], coords[6], t),
            coordinate(coords[1], coords[3], coords[5], coords[7], t),
        );
        distance += (current.0 - previous.0).hypot(current.1 - previous.1);
        previous = current;
    }
    distance
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cubic_endpoints_and_tangents() {
        for t in [0.0, 0.125, 0.5, 0.75, 1.0] {
            assert!((coordinate(0.0, 1.0, 2.0, 3.0, t) - 3.0 * t).abs() < 1e-12);
            assert!((derivative(0.0, 1.0, 2.0, 3.0, t) - 3.0).abs() < 1e-12);
        }
        assert_eq!(coordinate(1.0, 0.0, 3.0, 5.0, 0.0), 1.0);
        assert_eq!(coordinate(1.0, 0.0, 3.0, 5.0, 1.0), 5.0);
        assert_eq!(derivative(1.0, 0.0, 3.0, 5.0, 0.0), -3.0);
        assert_eq!(derivative(1.0, 0.0, 3.0, 5.0, 1.0), 6.0);
    }

    #[test]
    fn cutline_stations_and_physical_units() {
        let straight = [0.0, 0.0, 0.1, 0.0, 0.2, 0.0, 0.3, 0.0];
        assert!((polyline_length(straight, 0.0, 1.0, 128) - 0.3).abs() < 1e-12);
        assert!((polyline_length(straight, 0.0, 0.5, 128) - 0.15).abs() < 1e-12);
        assert!(polyline_length(straight, 1.0, 0.0, 128).is_nan());
        let curved = [0.0, 0.0, 0.1, 0.2, 0.2, -0.1, 0.3, 0.0];
        assert!(polyline_length(curved, 0.0, 1.0, 128) > 0.3);
        let halfway = polyline_length(curved, 0.0, 0.5, 128);
        assert!(halfway > 0.0 && halfway < polyline_length(curved, 0.0, 1.0, 128));
    }
}
