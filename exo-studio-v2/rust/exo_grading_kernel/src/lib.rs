#[no_mangle]
pub extern "C" fn exo_grading_abi_version() -> u32 { 1 }

/// One component of the existing point grader. Bounds and designer overrides
/// are resolved by the JS document layer, which retains all point metadata.
fn grade_component(x: f64, y: f64, min_x: f64, max_x: f64,
                   min_y: f64, max_y: f64, offset: f64,
                   width: f64, length: f64, horizontal: bool) -> f64 {
    let center = (min_x + max_x) * 0.5;
    let height = (max_y - min_y).max(1.0);
    let normalized_y = (y - min_y) / height;
    if horizontal {
        x + (if x == center { 0.0 } else { (x - center).signum() }) * (width * offset) * 0.5
            * (0.55 + 0.45 * (1.0 - normalized_y))
    } else {
        y - (length * offset) * (1.0 - normalized_y)
    }
}

#[no_mangle]
pub extern "C" fn exo_grade_point_x(x:f64,y:f64,min_x:f64,max_x:f64,min_y:f64,max_y:f64,offset:f64,width:f64,length:f64)->f64 {
    grade_component(x,y,min_x,max_x,min_y,max_y,offset,width,length,true)
}
#[no_mangle]
pub extern "C" fn exo_grade_point_y(x:f64,y:f64,min_x:f64,max_x:f64,min_y:f64,max_y:f64,offset:f64,width:f64,length:f64)->f64 {
    grade_component(x,y,min_x,max_x,min_y,max_y,offset,width,length,false)
}

/// Validate and evaluate one persisted designer grade-rule coordinate.
/// NaN marks an invalid persisted rule and requests automatic grading.
#[no_mangle]
pub extern "C" fn exo_grade_rule_coordinate(base:f64,delta:f64,offset:f64)->f64 {
    if !delta.is_finite() { f64::NAN } else { base+delta*offset }
}

/// Flat, versioned industrial batch ABI. `coordinates` holds x/y pairs in
/// piece-major, point-major order. `piece_lengths` specifies each piece's
/// point count; `point_ids` contains one stable nonzero identifier per point,
/// unique within each piece, and `piece_ids` one unique nonzero ID per piece.
/// `steps` holds signed dx/dy displacements in point-major, break-major order.
/// The break between size k and k+1 is at index k, including nonuniform steps.
/// `output` has size-major, piece-major, point-major x/y pairs. Caller must
/// allocate `size_count * point_count * 2` doubles. All inputs and the output
/// must be disjoint. A negative result is a validation failure; output remains
/// untouched. Native clients must provide valid readable/writable buffers.
#[no_mangle]
pub extern "C" fn exo_grading_batch_abi_version() -> u32 { 1 }

/// Allocate a scratch array with explicit ownership. All scratch buffers
/// exported here hold f64 values, including u32 IDs represented exactly as
/// integers in the interval 1..=u32::MAX. Call free with its original length.
#[no_mangle]
pub extern "C" fn exo_grading_batch_alloc(length: u32) -> *mut f64 {
    if length == 0 || (length as usize) > (isize::MAX as usize / std::mem::size_of::<f64>()) {
        return std::ptr::null_mut();
    }
    let mut data = vec![0.0; length as usize];
    let ptr = data.as_mut_ptr();
    std::mem::forget(data);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn exo_grading_batch_free(pointer: *mut f64, length: u32) {
    if pointer.is_null() || length == 0 { return; }
    drop(Vec::from_raw_parts(pointer,length as usize,length as usize));
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BatchError { Shape, Identifier, NonFinite, Overflow }

pub fn grade_multi_piece(
    coordinates: &[[f64; 2]], piece_ids: &[u32], piece_lengths: &[usize],
    point_ids: &[u32], steps: &[[f64; 2]], size_count: usize, base_index: usize,
) -> Result<Vec<[f64; 2]>, BatchError> {
    if size_count < 2 || base_index >= size_count || piece_ids.is_empty()
        || piece_ids.len() != piece_lengths.len() || coordinates.is_empty()
        || point_ids.len() != coordinates.len()
        || piece_lengths.iter().any(|&n| n == 0)
        || piece_lengths.iter().try_fold(0usize, |a,&b| a.checked_add(b)) != Some(coordinates.len())
        || coordinates.len().checked_mul(size_count).is_none()
        || coordinates.len().checked_mul(size_count - 1) != Some(steps.len())
    { return Err(BatchError::Shape); }
    let mut unique_pieces = std::collections::HashSet::new();
    if piece_ids.iter().any(|&id| id == 0 || !unique_pieces.insert(id)) { return Err(BatchError::Identifier); }
    let mut point_offset = 0;
    for &len in piece_lengths {
        let mut unique_points = std::collections::HashSet::new();
        if point_ids[point_offset..point_offset+len].iter().any(|&id| id == 0 || !unique_points.insert(id)) {
            return Err(BatchError::Identifier);
        }
        point_offset += len;
    }
    if coordinates.iter().chain(steps.iter()).any(|pair| pair.iter().any(|x| !x.is_finite())) {
        return Err(BatchError::NonFinite);
    }
    let mut result = vec![[0.0,0.0]; coordinates.len()*size_count];
    for (point_index, &base) in coordinates.iter().enumerate() {
        let mut offset = [0.0f64,0.0];
        for index in base_index..size_count {
            if index > base_index {
                let step = steps[point_index*(size_count-1)+index-1];
                offset = [offset[0]+step[0],offset[1]+step[1]];
            }
            let coordinates = [base[0]+offset[0],base[1]+offset[1]];
            if coordinates.iter().any(|v| !v.is_finite()) { return Err(BatchError::Overflow); }
            result[index*point_ids.len()+point_index] = coordinates;
        }
        offset = [0.0,0.0];
        for index in (0..base_index).rev() {
            let step = steps[point_index*(size_count-1)+index];
            offset = [offset[0]-step[0],offset[1]-step[1]];
            let coordinates = [base[0]+offset[0],base[1]+offset[1]];
            if coordinates.iter().any(|v| !v.is_finite()) { return Err(BatchError::Overflow); }
            result[index*point_ids.len()+point_index] = coordinates;
        }
    }
    Ok(result)
}

/// Returns 0 on success, -1 shape, -2 ID, -3 nonfinite input, -4 overflow.
/// Pointer checks precede slice construction; buffers must be valid and
/// disjoint as specified by the ABI. This exports plain C/WASM numeric arrays.
#[no_mangle]
pub unsafe extern "C" fn exo_grade_multi_piece_batch(
    coordinates: *const f64, piece_ids: *const u32, piece_lengths: *const u32,
    point_ids: *const u32, steps: *const f64,
    piece_count: u32, point_count: u32, size_count: u32, base_index: u32,
    output: *mut f64,
) -> i32 {
    let pieces = piece_count as usize;
    let points = point_count as usize;
    let sizes = size_count as usize;
    if pieces == 0 || points == 0 || sizes < 2 || base_index >= size_count { return -1; }
    let Some(step_count) = points.checked_mul(sizes-1) else { return -1; };
    let Some(output_count) = points.checked_mul(sizes) else { return -1; };
    if coordinates.is_null() || piece_ids.is_null() || piece_lengths.is_null()
        || point_ids.is_null() || steps.is_null() || output.is_null()
        || points.checked_mul(2).is_none() || step_count.checked_mul(2).is_none()
        || output_count.checked_mul(2).is_none() { return -1; }
    // Check byte bounds before making Rust slices. wasm32 address space limits
    // buffer sizes further, and the caller owns pointer provenance.
    let max_elements = isize::MAX as usize / std::mem::size_of::<f64>();
    if output_count > max_elements / 2 || step_count > max_elements / 2 || points > max_elements / 2 {
        return -1;
    }
    let positions = std::slice::from_raw_parts(coordinates as *const [f64; 2], points);
    let piece_ids = std::slice::from_raw_parts(piece_ids, pieces);
    let lengths: Vec<usize> = std::slice::from_raw_parts(piece_lengths, pieces).iter().map(|&n| n as usize).collect();
    let point_ids = std::slice::from_raw_parts(point_ids, points);
    let steps = std::slice::from_raw_parts(steps as *const [f64; 2], step_count);
    match grade_multi_piece(positions,piece_ids,&lengths,point_ids,steps,sizes,base_index as usize) {
        Ok(graded) => {
            std::ptr::copy_nonoverlapping(graded.as_ptr() as *const f64,output,output_count*2);
            0
        }
        Err(BatchError::Shape) => -1,
        Err(BatchError::Identifier) => -2,
        Err(BatchError::NonFinite) => -3,
        Err(BatchError::Overflow) => -4,
    }
}

/// WASM convenience ABI using owned f64 scratch buffers for every input and
/// output. It avoids unaligned byte-address casting in JS. Native consumers
/// may use the typed u32 ABI above. IDs must be integers representable as u32.
#[no_mangle]
pub unsafe extern "C" fn exo_grade_multi_piece_batch_f64(
    coordinates:*const f64, piece_ids:*const f64, piece_lengths:*const f64,
    point_ids:*const f64, steps:*const f64,
    piece_count:u32, point_count:u32, size_count:u32, base_index:u32,
    output:*mut f64,
) -> i32 {
    let pieces=piece_count as usize;let points=point_count as usize;
    if pieces==0 || points==0 || size_count<2 || base_index>=size_count
      || coordinates.is_null() || piece_ids.is_null() || piece_lengths.is_null()
      || point_ids.is_null() || steps.is_null() || output.is_null() {return -1;}
    let Some(step_count)=points.checked_mul(size_count as usize-1) else{return -1;};
    let Some(output_count)=points.checked_mul(size_count as usize) else{return -1;};
    let max=isize::MAX as usize / std::mem::size_of::<f64>();
    if points>max/2 || step_count>max/2 || output_count>max/2 || pieces>max {return -1;}
    let ids=std::slice::from_raw_parts(piece_ids,pieces);
    let lengths=std::slice::from_raw_parts(piece_lengths,pieces);
    let pids=std::slice::from_raw_parts(point_ids,points);
    let parse=|value:f64| -> Option<u32> {
      if value.is_finite() && value>=0.0 && value<=u32::MAX as f64 && value.fract()==0.0 {
          Some(value as u32)
      }else{None}
    };
    let Some(ids)=ids.iter().copied().map(parse).collect::<Option<Vec<_>>>() else{return -2;};
    let Some(lengths)=lengths.iter().copied().map(parse).collect::<Option<Vec<_>>>() else{return -1;};
    let Some(pids)=pids.iter().copied().map(parse).collect::<Option<Vec<_>>>() else{return -2;};
    let positions=std::slice::from_raw_parts(coordinates as *const [f64;2],points);
    let steps=std::slice::from_raw_parts(steps as *const [f64;2],step_count);
    let lengths:Vec<usize>=lengths.iter().map(|&n|n as usize).collect();
    match grade_multi_piece(positions,&ids,&lengths,&pids,steps,size_count as usize,base_index as usize) {
      Ok(graded)=>{std::ptr::copy_nonoverlapping(graded.as_ptr() as *const f64,output,output_count*2);0}
      Err(BatchError::Shape)=>-1,
      Err(BatchError::Identifier)=>-2,
      Err(BatchError::NonFinite)=>-3,
      Err(BatchError::Overflow)=>-4,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn vertical_and_designer_neutral() {
        assert_eq!(exo_grade_point_x(0.,0.,-10.,10.,0.,20.,2.,3.,1.2),0.);
        assert!((exo_grade_point_y(4.,0.,-10.,10.,0.,20.,2.,3.,1.2)+2.4).abs()<1e-12);
        assert!((exo_grade_point_y(4.,20.,-10.,10.,0.,20.,2.,3.,1.2)-20.).abs()<1e-12);
    }
    #[test]
    fn persisted_designer_rules_and_invalid_fallback() {
        assert_eq!(exo_grade_rule_coordinate(12.,-2.5,-2.),17.);
        assert_eq!(exo_grade_rule_coordinate(12.,0.,3.),12.);
        assert!(exo_grade_rule_coordinate(12.,f64::NAN,2.).is_nan());
        assert!(exo_grade_rule_coordinate(12.,f64::INFINITY,2.).is_nan());
    }
    #[test]
    fn four_pieces_six_sizes_signed_nonuniform_and_base_invariance() {
        let lengths=[3,2,2,1]; let ids=[101,102,103,104];
        let point_ids=[1,2,3,1,2,1,2,1];
        let coordinates=[[0.,0.],[4.,5.],[3.,9.],[10.,12.],[5.,1.],[1.,7.],[6.,4.],[2.,3.]];
        let mut steps=vec![[0.,0.];8*5];
        for p in 0..8 { for k in 0..5 { steps[p*5+k]=[k as f64*0.25-0.6,p as f64*0.1-k as f64*0.2]; } }
        let out=grade_multi_piece(&coordinates,&ids,&lengths,&point_ids,&steps,6,2).unwrap();
        assert_eq!(out.len(),48);
        assert_eq!(&out[16..24],&coordinates);
        for p in 0..8 {
            assert!((out[3*8+p][0]-coordinates[p][0]-steps[p*5+2][0]).abs()<1e-12);
            assert!((out[8+p][1]-coordinates[p][1]+steps[p*5+1][1]).abs()<1e-12);
        }
    }
    #[test]
    fn invalid_inputs_never_write_partial_ffi_output() {
        let coords=[0.,0.,1.,1.,2.,2.,3.,3.];
        let pieces=[5,6,7,8]; let lengths=[1,1,1,1]; let point_ids=[1,1,1,1];
        let mut steps=[0.;40];let mut output=[4321.;48];
        let call=|pids:&[u32;4], coords:&[f64;8], steps:&[f64;40], output:&mut[f64;48]|unsafe{
            exo_grade_multi_piece_batch(coords.as_ptr(),pieces.as_ptr(),lengths.as_ptr(),pids.as_ptr(),steps.as_ptr(),4,4,6,2,output.as_mut_ptr())
        };
        assert_eq!(call(&point_ids,&coords,&steps,&mut output),0);
        assert_eq!(&output[16..24],&coords);
        output.fill(4321.); steps[37]=f64::NAN;
        assert_eq!(call(&point_ids,&coords,&steps,&mut output),-3);
        assert!(output.iter().all(|&v|v==4321.));
        steps[37]=0.; let bad_ids=[0,1,1,1];
        assert_eq!(call(&bad_ids,&coords,&steps,&mut output),-2);
        assert!(output.iter().all(|&v|v==4321.));
        let huge=coords;
        // Point 2 has base x=2, then two consecutive maximum positive breaks.
        // Step values are interleaved x/y, hence the even flattened indices.
        steps[24]=f64::MAX;
        steps[26]=f64::MAX;
        assert_eq!(call(&point_ids,&huge,&steps,&mut output),-4);
        assert!(output.iter().all(|&v|v==4321.));
    }
}
