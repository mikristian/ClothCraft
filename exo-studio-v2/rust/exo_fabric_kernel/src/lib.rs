//! Deterministic optical-material calculations moved out of the EXO browser.
//! No DOM, Three.js, network, or solver dependency. This is not measured
//! textile physics. The stable exported C ABI works in wasm32 and native Rust.

pub mod calibration;

pub const ABI_VERSION: u32 = 2;

#[inline]
fn clamp_finite(value: f64, min: f64, max: f64) -> f64 {
    if value.is_finite() {
        value.clamp(min, max)
    } else {
        min
    }
}

pub fn texture_dimension_cm(value: f64) -> f64 {
    if !value.is_finite() || value <= 0.0 {
        20.0
    } else {
        value.max(0.5)
    }
}

pub fn swatch_repeats(swatch_cm: f64, repeat_cm: f64) -> f64 {
    swatch_cm / texture_dimension_cm(repeat_cm)
}

pub fn procedural_repeats(swatch_cm: f64, tile_cm: f64) -> f64 {
    let safe = if tile_cm.is_finite() && tile_cm > 0.0 {
        tile_cm
    } else {
        3.0
    };
    swatch_cm / safe
}

/// Matches EXO's near-neutral visual correction for the linear green channel.
/// The output is one byte for roughness maps (not a new material measurement).
pub fn balance_roughness_byte(green: f64, mean: f64, contrast: f64) -> u8 {
    let relative = (clamp_finite(green, 0.0, 255.0) - clamp_finite(mean, 0.0, 255.0)) / 255.0;
    let neutral = 0.90 + relative * clamp_finite(contrast, 0.0, 1.5);
    (255.0 * clamp_finite(neutral, 0.70, 1.0)).round() as u8
}

#[no_mangle]
pub extern "C" fn exo_fabric_kernel_abi_version() -> u32 {
    ABI_VERSION
}

#[no_mangle]
pub extern "C" fn exo_texture_dimension_cm(value: f64) -> f64 {
    texture_dimension_cm(value)
}

#[no_mangle]
pub extern "C" fn exo_swatch_repeats(swatch_cm: f64, repeat_cm: f64) -> f64 {
    swatch_repeats(swatch_cm, repeat_cm)
}

#[no_mangle]
pub extern "C" fn exo_procedural_repeats(swatch_cm: f64, tile_cm: f64) -> f64 {
    procedural_repeats(swatch_cm, tile_cm)
}

#[no_mangle]
pub extern "C" fn exo_balance_roughness_byte(green: f64, mean: f64, contrast: f64) -> u32 {
    balance_roughness_byte(green, mean, contrast) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dimensions_and_repeats() {
        assert_eq!(texture_dimension_cm(f64::NAN), 20.0);
        assert_eq!(texture_dimension_cm(0.0), 20.0);
        assert_eq!(texture_dimension_cm(0.1), 0.5);
        assert_eq!(texture_dimension_cm(9.0), 9.0);
        assert_eq!(swatch_repeats(270.0, 20.0), 13.5);
        assert_eq!(swatch_repeats(270.0, f64::INFINITY), 13.5);
        assert_eq!(procedural_repeats(270.0, 3.0), 90.0);
        assert_eq!(procedural_repeats(270.0, f64::NAN), 90.0);
    }

    #[test]
    fn roughness_matches_existing_editor() {
        assert_eq!(balance_roughness_byte(123.0, 123.0, 0.5), 230);
        assert_eq!(balance_roughness_byte(f64::NAN, f64::NAN, f64::INFINITY), 230);
        assert_eq!(balance_roughness_byte(255.0, 0.0, 1.5), 255);
        assert_eq!(balance_roughness_byte(0.0, 255.0, 1.5), 179);
        for green in [0.0, 63.0, 127.0, 191.0, 255.0] {
            let computed = balance_roughness_byte(green, 128.0, 0.57);
            assert!((179..=255).contains(&computed));
        }
    }

    #[test]
    fn ffi_abi_matches_native() {
        assert_eq!(exo_fabric_kernel_abi_version(), ABI_VERSION);
        assert_eq!(exo_swatch_repeats(240.0, 40.0), 6.0);
        assert_eq!(exo_balance_roughness_byte(123.0, 123.0, 0.5), 230);
    }
}
