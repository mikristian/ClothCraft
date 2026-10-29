//! Bounded port of dxf.js notchForEdge endpoint arithmetic after edge sampling.
//! IDs, edge selection, units and DXF serialization remain owned by JS.
pub fn notch_coordinate(point: f64, normal: f64, depth_cm: f64, outer: bool) -> f64 {
    if outer {
        point + normal * depth_cm
    } else {
        point - normal * depth_cm * 0.15
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_depth_and_normal_direction() {
        assert_eq!(notch_coordinate(10.0, 1.0, 0.45, false), 9.9325);
        assert_eq!(notch_coordinate(10.0, 1.0, 0.45, true), 10.45);
        assert_eq!(notch_coordinate(10.0, -1.0, 0.45, true), 9.55);
    }

    #[test]
    fn zero_and_signed_depth_preserve_source_arithmetic() {
        for point in [-100.25, 0.0, 31.7] {
            for normal in [-1.0, -0.6, 0.0, 0.8, 1.0] {
                for depth in [-2.0, 0.0, 0.45, 3.7] {
                    assert_eq!(notch_coordinate(point, normal, depth, false), point - normal * depth * 0.15);
                    assert_eq!(notch_coordinate(point, normal, depth, true), point + normal * depth);
                }
            }
        }
    }
}
