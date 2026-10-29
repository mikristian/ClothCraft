// Integer-only WASM fast path. JS retains full legacy semantics for other inputs.
#[no_mangle]
pub extern "C" fn exo_mesh_selection_abi_version() -> i32 { 1 }

#[no_mangle]
pub extern "C" fn exo_mesh_selection_alloc(words: usize) -> *mut i32 {
    let mut data = vec![0i32; words];
    let ptr = data.as_mut_ptr();
    std::mem::forget(data);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn exo_mesh_selection_free(ptr: *mut i32, words: usize) {
    if !ptr.is_null() { drop(Vec::from_raw_parts(ptr, words, words)); }
}

/// input: [index_count, face_count, selected_index, additive, indices..., faceIndex,a,b,c...]
/// output: [index_count, vertex_count, sorted_indices..., sorted_unique_vertices...]
/// returns 1 for a selection, 0 for empty, -1 for malformed inputs.
#[no_mangle]
pub unsafe extern "C" fn exo_mesh_selection_merge(
    input_ptr: *const i32, input_words: usize, output_ptr: *mut i32, output_words: usize,
) -> i32 {
    if input_ptr.is_null() || output_ptr.is_null() || input_words < 4 { return -1; }
    let input = std::slice::from_raw_parts(input_ptr, input_words);
    let ni = input[0]; let nf = input[1]; let selected = input[2];
    if ni < 0 || nf < 0 || selected < 0 { return -1; }
    let (ni,nf)=(ni as usize,nf as usize);
    if ni.checked_add(nf.checked_mul(4).unwrap_or(usize::MAX)).and_then(|n|n.checked_add(4)) != Some(input_words) {return -1;}
    let mut indices = if input[3] != 0 { input[4..4+ni].to_vec() } else { Vec::new() };
    if let Some(pos) = indices.iter().position(|&i|i==selected) {
        if input[3] != 0 { indices.remove(pos); }
    } else { indices.push(selected); }
    if indices.is_empty() {return 0;}
    indices.sort_unstable();
    let mut vertices = Vec::with_capacity(nf.saturating_mul(3));
    for face in input[4+ni..].chunks_exact(4) {vertices.extend_from_slice(&face[1..4]);}
    vertices.sort_unstable(); vertices.dedup();
    if indices.len().saturating_add(vertices.len()).saturating_add(2)>output_words {return -1;}
    let output = std::slice::from_raw_parts_mut(output_ptr,output_words);
    output[0]=indices.len() as i32; output[1]=vertices.len() as i32;
    output[2..2+indices.len()].copy_from_slice(&indices);
    output[2+indices.len()..2+indices.len()+vertices.len()].copy_from_slice(&vertices);
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn selection_and_vertices() {
        let input=[2,2,3,1,3,7,7,1,2,4,3,0,1,2];
        let mut output=[0;12];
        let status=unsafe { exo_mesh_selection_merge(input.as_ptr(),input.len(),output.as_mut_ptr(),output.len()) };
        assert_eq!(status,1);
        assert_eq!(&output[..7],&[1,4,7,0,1,2,4]);
    }
    #[test]
    fn empty_selection() {
        let input=[1,0,7,1,7];let mut output=[0;3];
        assert_eq!(unsafe {exo_mesh_selection_merge(input.as_ptr(),input.len(),output.as_mut_ptr(),output.len())},0);
    }
}
