#[no_mangle]
pub extern "C" fn exo_mesh_contact_abi_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn exo_mesh_contact_intrusion(distance: f64, clearance: f64, inside: u32) -> f64 {
    if inside != 0 { distance + clearance } else { clearance - distance }
}

#[no_mangle]
pub extern "C" fn exo_mesh_contact_direction_scale(distance: f64, inside: u32) -> f64 {
    if distance > 1e-8 { (if inside != 0 { -1. } else { 1. }) / distance } else { 0. }
}

#[no_mangle]
pub extern "C" fn exo_mesh_contact_correction(limit: f64, intrusion: f64) -> f64 {
    // JS Math.min propagates NaN, unlike f64::min.
    if limit.is_nan() || intrusion.is_nan() { f64::NAN } else if limit <= intrusion { limit } else { intrusion }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn contact_and_degenerate_normals() {
        assert_eq!(exo_mesh_contact_intrusion(0.003, 0.002, 1), 0.005);
        assert_eq!(exo_mesh_contact_intrusion(0.003, 0.002, 0), -0.001);
        assert_eq!(exo_mesh_contact_direction_scale(0., 1), 0.);
        assert_eq!(exo_mesh_contact_direction_scale(1e-8, 0), 0.);
        assert_eq!(exo_mesh_contact_direction_scale(0.5, 1), -2.);
        assert_eq!(exo_mesh_contact_correction(0.002, 0.004), 0.002);
        assert!(exo_mesh_contact_correction(f64::NAN, 0.004).is_nan());
    }
}
