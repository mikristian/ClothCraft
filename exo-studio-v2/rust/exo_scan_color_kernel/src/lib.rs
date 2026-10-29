//! Color-only albedo reconstruction for licensed scans. Preserves source
//! image alpha, scan luminance provenance and JS-owned wash semantics.

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
unsafe extern "C" {
    #[link_name = "pow"] fn host_pow(x: f64, y: f64) -> f64;
    #[link_name = "round"] fn host_round(x: f64) -> f64;
}

#[inline]
fn pow(x:f64,y:f64)->f64 {
    #[cfg(target_arch = "wasm32")] {unsafe {host_pow(x,y)}}
    #[cfg(not(target_arch = "wasm32"))] {x.powf(y)}
}
#[inline]
fn round(x:f64)->f64 {
    #[cfg(target_arch = "wasm32")] {unsafe {host_round(x)}}
    #[cfg(not(target_arch = "wasm32"))] {(x+0.5).floor()}
}
#[inline]
fn clip(n:f64,lo:f64,hi:f64)->f64 {if n.is_finite(){n.max(lo).min(hi)} else {lo}}
#[inline]
fn channel(original:f64,target:f64,brightness:f64,ratio:f64)->u32 {
    let hue=original/255.0-brightness;
    let color=target*ratio+hue*19.0*(0.4+target/255.0);
    round(clip(color,0.0,255.0)) as u32
}

#[no_mangle]
pub extern "C" fn exo_scan_color_abi_version()->u32 {1}

/// Packs red, green, blue in low 24 bits. Inputs are *numeric* JS pixels and
/// authored target color, validated by JS before calling native.
#[no_mangle]
pub extern "C" fn exo_scan_regrade_rgb(
    red:f64,green:f64,blue:f64,average_luminance:f64,
    target_red:f64,target_green:f64,target_blue:f64
)->u32 {
    let mean=clip(average_luminance,0.06,0.94);
    let brightness=(0.2126*red+0.7152*green+0.0722*blue)/255.0;
    let ratio=clip(pow((brightness+0.075)/(mean+0.075),0.88),0.45,1.65);
    let r=channel(red,target_red,brightness,ratio);
    let g=channel(green,target_green,brightness,ratio);
    let b=channel(blue,target_blue,brightness,ratio);
    r | (g<<8) | (b<<16)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn all_black_black_tint_and_white_saturation(){
        assert_eq!(exo_scan_regrade_rgb(0.,0.,0.,1.,0.,0.,0.),0);
        assert_eq!(exo_scan_regrade_rgb(255.,255.,255.,0.001,250.,250.,250.),0x00ff_ffff);
    }
    #[test] fn preserves_bounded_channels(){
        for k in 0..256 {
            let x=k as f64;
            let packed=exo_scan_regrade_rgb(x,255.-x,x*0.5,0.7,20.,125.,235.);
            assert!(packed<=0x00ff_ffff);
        }
    }
}
