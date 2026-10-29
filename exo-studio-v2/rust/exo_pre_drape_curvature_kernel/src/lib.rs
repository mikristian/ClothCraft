//! Pure reset-preview arc displacement. The cloth solver never consumes this data.
use std::sync::Mutex;

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "env")]
extern "C" {
    fn exo_host_sin(v: f64) -> f64;
    fn exo_host_cos(v: f64) -> f64;
}
fn sin(v: f64) -> f64 {
    #[cfg(target_arch = "wasm32")]
    { unsafe { exo_host_sin(v) } }
    #[cfg(not(target_arch = "wasm32"))]
    { v.sin() }
}
fn cos(v: f64) -> f64 {
    #[cfg(target_arch = "wasm32")]
    { unsafe { exo_host_cos(v) } }
    #[cfg(not(target_arch = "wasm32"))]
    { v.cos() }
}
pub fn arc(coord:f64, center:f64, width:f64, radius:f64, half_angle:f64, sign:f64, toward_body:f64) -> [f64;2] {
    let angle = ((coord-center)*2.0/width)*half_angle;
    let bulge = sign*(radius*(cos(angle)-cos(half_angle))+toward_body);
    [center+radius*sin(angle), bulge]
}
static RESULT: Mutex<[f64;2]> = Mutex::new([0.0;2]);
#[no_mangle]
pub extern "C" fn exo_pre_drape_abi_version()->u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_pre_drape_arc(coord:f64,center:f64,width:f64,radius:f64,half_angle:f64,sign:f64,toward_body:f64){
    *RESULT.lock().unwrap()=arc(coord,center,width,radius,half_angle,sign,toward_body);
}
#[no_mangle]
pub extern "C" fn exo_pre_drape_result(index:usize)->f64 {
    RESULT.lock().unwrap().get(index).copied().unwrap_or(f64::NAN)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn curvature_arc_endpoints_and_center() {
        let radius=0.48/(2.0*1.05);
        let middle=arc(0.0,0.0,0.48,radius,1.05,-1.0,0.0);
        assert!(middle[0].abs()<1e-15);
        assert!(middle[1]<0.0);
        for coord in [-0.24,0.24] {
            let result=arc(coord,0.0,0.48,radius,1.05,-1.0,0.0);
            assert!(result[1].abs()<1e-15);
            assert!(result[0].is_finite());
        }
    }
}
