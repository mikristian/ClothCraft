//! Half-open polygon cutline scanline primitives. Boundary traversal/order,
//! filtering and even/odd pairing stay in the existing JS document layer.
pub fn intersect(a: [f64; 2], b: [f64; 2], value: f64, horizontal: bool) -> f64 {
    let axis = if horizontal { 1 } else { 0 };
    let transverse = 1 - axis;
    let lo = a[axis];
    let hi = b[axis];
    if !a.into_iter().chain(b).all(f64::is_finite) || !value.is_finite() {
        return f64::NAN;
    }
    if !((lo <= value && value < hi) || (hi <= value && value < lo)) {
        return f64::NAN;
    }
    a[transverse] + (value - lo) * (b[transverse] - a[transverse]) / (hi - lo)
}

#[cfg(test)]
mod tests {
    use super::intersect;
    #[test]
    fn half_open_vertex_and_crossing() {
        assert_eq!(intersect([0., 0.], [4., 4.], 2., true), 2.);
        assert_eq!(intersect([0., 0.], [4., 4.], 2., false), 2.);
        assert_eq!(intersect([0., 0.], [4., 4.], 0., true), 0.);
        assert!(intersect([0., 0.], [4., 4.], 4., true).is_nan());
        assert_eq!(intersect([4., 4.], [0., 0.], 0., true), 0.);
        assert!(intersect([0., 0.], [4., 0.], 0., true).is_nan());
    }
    #[test]
    fn invalid_input_does_not_create_intersections() {
        assert!(intersect([f64::NAN,0.],[2.,2.],1.,true).is_nan());
        assert!(intersect([0.,0.],[2.,2.],f64::INFINITY,true).is_nan());
        assert_eq!(intersect([0.,0.],[4.,2.],1.,true),2.);
    }
}
