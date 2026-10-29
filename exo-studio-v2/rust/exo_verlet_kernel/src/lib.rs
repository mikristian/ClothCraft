//! Batched 3D Verlet integration. JS retains timestep, forces and particle ownership.
//! Input stride: [x,y,z,prevX,prevY,prevZ,invMass]; output stride: [x,y,z,prevX,prevY,prevZ].
const MAX_PARTICLES: usize = 1_000_000;

#[no_mangle]
pub extern "C" fn exo_verlet_abi_version() -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn exo_verlet_alloc(len: usize) -> *mut f64 {
    if len == 0 || len > MAX_PARTICLES * 7 {
        return core::ptr::null_mut();
    }
    let values = vec![0.0_f64; len].into_boxed_slice();
    Box::into_raw(values) as *mut f64
}

#[no_mangle]
pub unsafe extern "C" fn exo_verlet_dealloc(ptr: *mut f64, len: usize) {
    if !ptr.is_null() && len > 0 && len <= MAX_PARTICLES * 7 {
        drop(Box::from_raw(core::ptr::slice_from_raw_parts_mut(ptr, len)));
    }
}

pub fn integrate(input: &[f64], output: &mut [f64], damping: f64, gravity: f64) -> bool {
    if input.len() % 7 != 0
        || input.len() / 7 > MAX_PARTICLES
        || output.len() != input.len() / 7 * 6
        || !damping.is_finite()
        || !gravity.is_finite()
        || !input.iter().all(|x| x.is_finite())
    {
        return false;
    }
    // Validate all results before writing any output.
    let mut staged = Vec::with_capacity(output.len());
    for v in input.chunks_exact(7) {
        let mut out = [v[0], v[1], v[2], v[3], v[4], v[5]];
        if v[6] > 0.0 {
            out[0] = v[0] + (v[0] - v[3]) * damping;
            out[1] = (v[1] + (v[1] - v[4]) * damping) - gravity;
            out[2] = v[2] + (v[2] - v[5]) * damping;
            out[3] = v[0];
            out[4] = v[1];
            out[5] = v[2];
        }
        if !out.iter().all(|x| x.is_finite()) {
            return false;
        }
        staged.extend_from_slice(&out);
    }
    output.copy_from_slice(&staged);
    true
}

/// Returns 1 on success, 0 for invalid input, and never writes partial results.
#[no_mangle]
pub unsafe extern "C" fn exo_verlet_integrate(
    input: *const f64,
    output: *mut f64,
    count: usize,
    damping: f64,
    gravity: f64,
) -> u32 {
    if input.is_null() || output.is_null() || count == 0 || count > MAX_PARTICLES {
        return 0;
    }
    let Some(in_len) = count.checked_mul(7) else {
        return 0;
    };
    let Some(out_len) = count.checked_mul(6) else {
        return 0;
    };
    if !integrate(
        core::slice::from_raw_parts(input, in_len),
        core::slice::from_raw_parts_mut(output, out_len),
        damping,
        gravity,
    ) {
        return 0;
    }
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn movable_and_pinned() {
        let input = [
            2., 4., 6., 1., 2., 3., 1., 8., 9., 10., 7., 8., 9., 0., 3., 4., 5., 2., 3., 4., -1.,
        ];
        let mut out = [0.; 18];
        assert!(integrate(&input, &mut out, 0.5, 0.25));
        assert_eq!(&out[..6], &[2.5, 4.75, 7.5, 2., 4., 6.]);
        assert_eq!(&out[6..12], &[8., 9., 10., 7., 8., 9.]);
        assert_eq!(&out[12..], &[3., 4., 5., 2., 3., 4.]);
    }
    #[test]
    fn zero_one_and_fractional_damping() {
        for (d, x) in [(0., 2.), (1., 3.), (0.25, 2.25)] {
            let mut out = [0.; 6];
            assert!(integrate(&[2., 0., 0., 1., 0., 0., 1.], &mut out, d, 0.));
            assert_eq!(out[0], x);
        }
    }
    #[test]
    fn atomic_invalid_and_overflow() {
        let mut out = [99.; 6];
        for input in [
            [1., 2., 3., 4., 5., f64::NAN, 1.],
            [f64::MAX, 0., 0., -f64::MAX, 0., 0., 1.],
        ] {
            assert!(!integrate(&input, &mut out, 1., 0.));
            assert_eq!(out, [99.; 6]);
        }
        assert!(!integrate(&[1.; 7], &mut out, f64::INFINITY, 0.));
        assert!(!integrate(&[1.; 6], &mut out, 1., 0.));
        assert_eq!(out, [99.; 6]);
    }
    #[test]
    fn tiny_huge_and_order_independent() {
        for magnitude in [1e-300, 1e150] {
            let a = [magnitude, 0., 0., 0., 0., 0., 1.];
            let b = [0., magnitude, 0., 0., 0., 0., 1.];
            let mut forward = [0.; 12];
            let mut reverse = [0.; 12];
            assert!(integrate(&[a, b].concat(), &mut forward, 0.5, 0.));
            assert!(integrate(&[b, a].concat(), &mut reverse, 0.5, 0.));
            assert_eq!(&forward[..6], &reverse[6..]);
            assert_eq!(&forward[6..], &reverse[..6]);
        }
    }
}
