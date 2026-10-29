//! Open measurement approximations, not an inverse nonlinear solver calibration.
//! Inputs are mm, N, GSM and degrees; outputs are kg, N/m, N·m and unitless friction.
fn positive(v: f64) -> bool {
    v.is_finite() && v > 0.0
}
pub fn area_mass(area: f64, gsm: f64) -> Option<f64> {
    (positive(area) && positive(gsm)).then(|| area * gsm / 1000.0)
}
#[derive(Debug, PartialEq)]
pub struct TensileFit {
    pub stiffness_n_per_m: f64,
    pub rms_error_n_per_m: f64,
    pub max_measured_strain: f64,
    pub points: usize,
}
pub fn tensile(width_mm: f64, gauge_mm: f64, observations: &[[f64; 2]]) -> Option<TensileFit> {
    if !positive(width_mm) || !positive(gauge_mm) || observations.is_empty() {
        return None;
    }
    let width = width_mm / 1000.0;
    let mut denominator = 0.0;
    let mut numerator = 0.0;
    let mut max_strain: f64 = 0.0;
    for &[extension, force] in observations {
        if !positive(extension) || !positive(force) {
            return None;
        }
        let strain = extension / gauge_mm;
        if strain > 1.0 {
            return None;
        }
        denominator += strain * strain;
        numerator += strain * (force / width);
        max_strain = max_strain.max(strain);
    }
    let stiffness = numerator / denominator;
    let mut residual = 0.0;
    for &[extension, force] in observations {
        let error = force / width - stiffness * (extension / gauge_mm);
        residual += error * error;
    }
    Some(TensileFit {
        stiffness_n_per_m: stiffness,
        rms_error_n_per_m: (residual / observations.len() as f64).sqrt(),
        max_measured_strain: max_strain,
        points: observations.len(),
    })
}
pub fn shear(width: f64, force: f64, angle: f64) -> Option<f64> {
    let radians = angle * std::f64::consts::PI / 180.0;
    (positive(width) && positive(force) && positive(angle) && radians < std::f64::consts::PI / 4.0)
        .then(|| force / ((width / 1000.0) * radians.tan()))
}
pub fn bending(gsm: f64, overhang: f64, deflection: f64, gravity: f64) -> Option<f64> {
    let length = overhang / 1000.0;
    let delta = deflection / 1000.0;
    (positive(gsm)
        && positive(overhang)
        && positive(deflection)
        && positive(gravity)
        && delta / length < 0.15)
        .then(|| (gsm / 1000.0) * gravity * length.powi(4) / (8.0 * delta))
}
pub fn friction(angle: f64) -> Option<f64> {
    (positive(angle) && angle < 85.0).then(|| (angle * std::f64::consts::PI / 180.0).tan())
}
#[no_mangle]
pub extern "C" fn exo_calibration_mass(area: f64, gsm: f64) -> f64 {
    area_mass(area, gsm).unwrap_or(f64::NAN)
}
#[no_mangle]
pub extern "C" fn exo_calibration_shear(width: f64, force: f64, angle: f64) -> f64 {
    shear(width, force, angle).unwrap_or(f64::NAN)
}
#[no_mangle]
pub extern "C" fn exo_calibration_bending(gsm: f64, length: f64, delta: f64, gravity: f64) -> f64 {
    bending(gsm, length, delta, gravity).unwrap_or(f64::NAN)
}
#[no_mangle]
pub extern "C" fn exo_calibration_friction(angle: f64) -> f64 {
    friction(angle).unwrap_or(f64::NAN)
}
// Caller owns exactly `count` f64 slots until free; first 2*points are
// interleaved extension/force, final three receive stiffness, RMS, max strain.
#[no_mangle]
pub extern "C" fn exo_calibration_alloc(count: usize) -> *mut f64 {
    Box::into_raw(vec![0.0; count].into_boxed_slice()) as *mut f64
}
/// # Safety
/// ptr must be an allocation of count slots returned by exo_calibration_alloc.
#[no_mangle]
pub unsafe extern "C" fn exo_calibration_free(ptr: *mut f64, count: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(
        ptr, count,
    )));
}
/// # Safety
/// ptr must reference 2*points+3 allocated f64 slots, exclusively borrowed.
#[no_mangle]
pub unsafe extern "C" fn exo_calibration_tensile(
    ptr: *mut f64,
    points: usize,
    width: f64,
    gauge: f64,
) -> u32 {
    let observations = std::slice::from_raw_parts(ptr as *const [f64; 2], points);
    if let Some(fit) = tensile(width, gauge, observations) {
        let out = ptr.add(2 * points);
        *out = fit.stiffness_n_per_m;
        *out.add(1) = fit.rms_error_n_per_m;
        *out.add(2) = fit.max_measured_strain;
        1
    } else {
        0
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn measured_si_units() {
        assert_eq!(area_mass(2.0, 450.0), Some(0.9));
        let fit = tensile(30.0, 200.0, &[[2.0, 0.12], [4.0, 0.24]]).unwrap();
        assert!((fit.stiffness_n_per_m - 400.0).abs() < 1e-10);
        assert!(fit.rms_error_n_per_m < 1e-10);
        assert_eq!(fit.points, 2);
        assert_eq!(fit.max_measured_strain, 0.02);
        assert!((friction(45.0).unwrap() - 1.0).abs() < 1e-14);
        assert!((bending(220.0, 100.0, 5.0, 9.80665).unwrap() - 0.0053936575).abs() < 1e-14);
        assert!((shear(30.0, 0.09, 10.0).unwrap() - 17.01384545885313).abs() < 1e-12);
    }
    #[test]
    fn validation_boundaries() {
        for bad in [0.0, -1.0, f64::NAN, f64::INFINITY] {
            assert!(area_mass(bad, 200.0).is_none());
            assert!(tensile(30.0, 200.0, &[[2.0, bad]]).is_none());
            assert!(friction(bad).is_none());
        }
        assert!(tensile(30.0, 200.0, &[]).is_none());
        assert!(tensile(30.0, 200.0, &[[201.0, 1.0]]).is_none());
        assert!(tensile(30.0, 200.0, &[[200.0, 1.0]]).is_some());
        assert!(shear(30.0, 1.0, 45.0).is_none());
        assert!(bending(220.0, 100.0, 15.0, 9.80665).is_none());
        assert!(friction(85.0).is_none());
    }
    #[test]
    fn buffer_abi() {
        unsafe {
            let ptr = exo_calibration_alloc(7);
            std::ptr::copy_nonoverlapping([2.0, 0.12, 4.0, 0.24].as_ptr(), ptr, 4);
            assert_eq!(exo_calibration_tensile(ptr, 2, 30.0, 200.0), 1);
            assert!((*ptr.add(4) - 400.0).abs() < 1e-10);
            exo_calibration_free(ptr, 7);
        }
    }
}
