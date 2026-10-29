//! Principal engineering extension from a triangle's rest UV to world-space
//! deformation gradient. Input units are metres; this is a visualization of
//! strain, not constitutive stress or contact pressure.

pub const ABI_VERSION: u32 = 1;
const MAX_VERTICES: usize = 8192;
const MAX_TRIANGLES: usize = 32768;

/// The JS reference uses 3D world coordinates, component-wise gradient and
/// the largest eigenvalue of the 2x2 right Cauchy-Green tensor.
pub fn triangle_extension(uv: [[f64; 2]; 3], world: [[f64; 3]; 3]) -> f64 {
    let [a, b, c] = uv;
    let [x, y, z] = world;
    let u = b[0] - a[0];
    let v = b[1] - a[1];
    let s = c[0] - a[0];
    let t = c[1] - a[1];
    let det = u * t - s * v;
    if det.abs() < 1e-14 { return 0.0; }
    let mut f = [0.0; 3];
    let mut g = [0.0; 3];
    for i in 0..3 {
        f[i] = ((y[i] - x[i]) * t - (z[i] - x[i]) * v) / det;
        g[i] = (-(y[i] - x[i]) * s + (z[i] - x[i]) * u) / det;
    }
    // Match the JS Array.reduce(..., 0) operation order for parity.
    let dot = |p: &[f64; 3], q: &[f64; 3]| -> f64 {
        let mut value = 0.0;
        for i in 0..3 { value += p[i] * q[i]; }
        value
    };
    let aa = dot(&f, &f);
    let bb = dot(&g, &g);
    let ab = dot(&f, &g);
    (((aa + bb + (aa - bb).hypot(2.0 * ab)) / 2.0).max(0.0)).sqrt() - 1.0
}

#[no_mangle]
pub extern "C" fn exo_strain_abi_version() -> u32 { ABI_VERSION }

#[no_mangle]
pub extern "C" fn exo_triangle_extension(
    ax: f64, ay: f64, bx: f64, by: f64, cx: f64, cy: f64,
    px: f64, py: f64, pz: f64,
    qx: f64, qy: f64, qz: f64,
    rx: f64, ry: f64, rz: f64,
) -> f64 {
    triangle_extension(
        [[ax, ay], [bx, by], [cx, cy]],
        [[px, py, pz], [qx, qy, qz], [rx, ry, rz]],
    )
}

// Packed buffers make one JS-to-WASM call per mesh snapshot, rather than one
// per triangle or vertex. The static scratch memory belongs to each WASM
// instance, which runs synchronously on its owning browser thread.
static mut REST_UV: [f64; MAX_VERTICES * 2] = [0.0; MAX_VERTICES * 2];
static mut WORLD: [f64; MAX_VERTICES * 3] = [0.0; MAX_VERTICES * 3];
static mut TRIANGLES: [u32; MAX_TRIANGLES * 3] = [0; MAX_TRIANGLES * 3];
static mut VERTEX_EXTENSIONS: [f64; MAX_VERTICES] = [0.0; MAX_VERTICES];

#[no_mangle]
pub extern "C" fn exo_strain_vertex_capacity() -> u32 { MAX_VERTICES as u32 }
#[no_mangle]
pub extern "C" fn exo_strain_triangle_capacity() -> u32 { MAX_TRIANGLES as u32 }
#[no_mangle]
pub extern "C" fn exo_strain_uv_ptr() -> *mut f64 { std::ptr::addr_of_mut!(REST_UV).cast::<f64>() }
#[no_mangle]
pub extern "C" fn exo_strain_world_ptr() -> *mut f64 { std::ptr::addr_of_mut!(WORLD).cast::<f64>() }
#[no_mangle]
pub extern "C" fn exo_strain_triangles_ptr() -> *mut u32 { std::ptr::addr_of_mut!(TRIANGLES).cast::<u32>() }
#[no_mangle]
pub extern "C" fn exo_strain_output_ptr() -> *const f64 {
    std::ptr::addr_of!(VERTEX_EXTENSIONS).cast::<f64>()
}

/// Return one on success and zero for unsupported counts/invalid input. The
/// caller checks all source indices/points before writing the scratch arrays.
#[no_mangle]
pub extern "C" fn exo_strain_vertex_extensions(vertices: u32, triangles: u32) -> u32 {
    let count = vertices as usize;
    let tri_count = triangles as usize;
    if count == 0 || count > MAX_VERTICES || tri_count > MAX_TRIANGLES { return 0; }
    // SAFETY: buffers are allocated for the life of this WASM instance;
    // exported functions are called sequentially by the single-thread bridge.
    let rest = unsafe { std::slice::from_raw_parts(std::ptr::addr_of!(REST_UV).cast::<f64>(), count * 2) };
    let world = unsafe { std::slice::from_raw_parts(std::ptr::addr_of!(WORLD).cast::<f64>(), count * 3) };
    let faces = unsafe { std::slice::from_raw_parts(std::ptr::addr_of!(TRIANGLES).cast::<u32>(), tri_count * 3) };
    let output = unsafe { std::slice::from_raw_parts_mut(std::ptr::addr_of_mut!(VERTEX_EXTENSIONS).cast::<f64>(), count) };
    output.fill(0.0);
    let mut occurrences = vec![0u32; count];
    for face in faces.chunks_exact(3) {
        let [a, b, c] = [face[0] as usize, face[1] as usize, face[2] as usize];
        if a >= count || b >= count || c >= count {return 0;}
        let rest_point = |i: usize| [rest[i * 2], rest[i * 2 + 1]];
        let world_point = |i: usize| [world[i * 3], world[i * 3 + 1], world[i * 3 + 2]];
        let extension = triangle_extension(
            [rest_point(a), rest_point(b), rest_point(c)],
            [world_point(a), world_point(b), world_point(c)],
        );
        if !extension.is_finite() { return 0; }
        for &i in &[a, b, c] {
            output[i] += extension;
            occurrences[i] += 1;
        }
    }
    for (i, value) in output.iter_mut().enumerate() {
        if occurrences[i] > 0 { *value /= occurrences[i] as f64; }
    }
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rest_rotation_and_stretch() {
        let uv = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]];
        assert_eq!(triangle_extension(uv, [[0.0,0.0,0.0],[1.0,0.0,0.0],[0.0,1.0,0.0]]),0.0);
        assert!((triangle_extension(uv, [[0.0,0.0,0.0],[1.2,0.0,0.0],[0.0,1.0,0.0]])-0.2).abs() < 1e-12);
        assert!(triangle_extension(uv, [[5.0,4.0,3.0],[5.0,4.0,4.0],[4.0,4.0,3.0]]).abs() < 1e-12);
        assert_eq!(triangle_extension([[0.0,0.0];3], [[0.0,0.0,0.0];3]),0.0);
    }
    #[test]
    fn packed_buffers_are_bounded() {
        assert_eq!(exo_strain_vertex_extensions((MAX_VERTICES + 1) as u32,0),0);
        assert_eq!(exo_strain_vertex_extensions(1,(MAX_TRIANGLES + 1) as u32),0);
        assert_eq!(exo_strain_vertex_extensions(1,0),1);
    }
}
