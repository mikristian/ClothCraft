//! Greedy rectangle layout for the production marker. Input entries are
//! *already sorted* and contain the allowed grainline orientations as bounding
//! boxes in centimetres. The caller retains outlines and named piece IDs.
//!
//! Packed f64 input: for each piece instance, [option_count, width, height, ...].
//! Output per instance: [x, y, width, height, selected_option] or five NaNs.
//! The numeric ABI is intentionally small and supports synchronous editor use.

#[derive(Clone, Copy, Debug)]
struct Rectangle {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

fn overlaps(a: Rectangle, b: Rectangle, gap: f64) -> bool {
    !(a.x + a.width + gap <= b.x
        || b.x + b.width + gap <= a.x
        || a.y + a.height + gap <= b.y
        || b.y + b.height + gap <= a.y)
}

fn positions(placed: &[Rectangle], gap: f64, horizontal: bool) -> Vec<f64> {
    let mut locations = vec![0.];
    locations.extend(placed.iter().map(|rect| {
        if horizontal { rect.x + rect.width + gap } else { rect.y + rect.height + gap }
    }));
    locations.sort_by(f64::total_cmp);
    locations.dedup_by(|a, b| *a == *b);
    locations
}

/// Validates and packs all entries as a transaction. Invalid input never
/// partially updates the caller's output buffer.
pub fn pack_entries(input: &[f64], output: &mut [f64], fabric_width: f64, gap: f64) -> Result<(), &'static str> {
    if !fabric_width.is_finite() || fabric_width <= 0. || !gap.is_finite() || gap < 0. {
        return Err("invalid fabric width or gap");
    }
    if output.len() % 5 != 0 { return Err("invalid output size"); }
    let count = output.len() / 5;
    let mut options = Vec::with_capacity(count);
    let mut cursor = 0;
    for _ in 0..count {
        let raw = *input.get(cursor).ok_or("missing option count")?;
        if !raw.is_finite() || raw < 1. || raw.fract() != 0. || raw > 1000. {
            return Err("invalid option count");
        }
        let n = raw as usize;
        cursor += 1;
        let mut choices = Vec::with_capacity(n);
        for _ in 0..n {
            let width = *input.get(cursor).ok_or("missing option width")?;
            let height = *input.get(cursor + 1).ok_or("missing option height")?;
            if !width.is_finite() || !height.is_finite() || width < 0. || height < 0. {
                return Err("invalid box dimensions");
            }
            choices.push((width, height));
            cursor += 2;
        }
        options.push(choices);
    }
    if cursor != input.len() { return Err("trailing option data"); }

    let mut placed: Vec<Rectangle> = Vec::with_capacity(count);
    let mut result = vec![f64::NAN; output.len()];
    for (entry_index, choices) in options.iter().enumerate() {
        let xs = positions(&placed, gap, true);
        let ys = positions(&placed, gap, false);
        let existing_length = placed.iter().map(|r| r.y + r.height).fold(0., f64::max);
        let mut best: Option<(Rectangle, usize, f64)> = None;
        for (option_index, &(width, height)) in choices.iter().enumerate() {
            for &y in &ys {
                for &x in &xs {
                    if x + width > fabric_width + 1e-6 { continue; }
                    let rect = Rectangle { x, y, width, height };
                    if placed.iter().any(|&prior| overlaps(rect, prior, gap)) { continue; }
                    let resulting_length = existing_length.max(y + height);
                    let right_waste = fabric_width - (x + width);
                    let score = resulting_length * 1_000_000. + y * 10_000. + right_waste * 10. + x;
                    if best.is_none_or(|(_, _, previous)| score < previous) {
                        best = Some((rect, option_index, score));
                    }
                }
            }
        }
        if let Some((rect, option_index, _)) = best {
            placed.push(rect);
            let offset = entry_index * 5;
            result[offset..offset + 5].copy_from_slice(&[
                rect.x, rect.y, rect.width, rect.height, option_index as f64,
            ]);
        }
    }
    output.copy_from_slice(&result);
    Ok(())
}

#[no_mangle]
pub extern "C" fn exo_marker_abi_version() -> u32 { 1 }

/// Preserve the marker's existing signed (-180,180] angular convention.
#[no_mangle]
pub extern "C" fn exo_marker_normalized_rotation(value: f64) -> f64 {
    let mut rotation = value % 360.0;
    if rotation > 180.0 { rotation -= 360.0; }
    if rotation <= -180.0 { rotation += 360.0; }
    rotation
}

#[no_mangle]
pub extern "C" fn exo_marker_rotate_x(x:f64,y:f64,degrees:f64)->f64 {
    let radians=degrees*std::f64::consts::PI/180.0;
    x*radians.cos()-y*radians.sin()
}

#[no_mangle]
pub extern "C" fn exo_marker_rotate_y(x:f64,y:f64,degrees:f64)->f64 {
    let radians=degrees*std::f64::consts::PI/180.0;
    x*radians.sin()+y*radians.cos()
}

#[no_mangle]
pub extern "C" fn exo_marker_alloc_f64(len: usize) -> *mut f64 {
    if len == 0 || len > 1_000_000 { return std::ptr::null_mut(); }
    let mut values = vec![0.; len].into_boxed_slice();
    let pointer = values.as_mut_ptr();
    std::mem::forget(values);
    pointer
}

/// # Safety
/// Pointer must come from `exo_marker_alloc_f64` with the identical length;
/// callers must free exactly once after all Rust accesses are complete.
#[no_mangle]
pub unsafe extern "C" fn exo_marker_free_f64(pointer: *mut f64, len: usize) {
    if pointer.is_null() || len == 0 || len > 1_000_000 { return; }
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(pointer, len)));
}

/// # Safety
/// Input and output must refer to disjoint allocations created through the
/// exports above. Lengths are in f64 elements, not bytes.
#[no_mangle]
pub unsafe extern "C" fn exo_marker_pack(
    input: *const f64, input_len: usize, output: *mut f64, output_len: usize,
    fabric_width: f64, gap: f64,
) -> i32 {
    if input.is_null() || output.is_null() || input_len == 0 || output_len == 0
        || input_len > 1_000_000 || output_len > 1_000_000 { return 0; }
    let input = std::slice::from_raw_parts(input, input_len);
    let output = std::slice::from_raw_parts_mut(output, output_len);
    i32::from(pack_entries(input, output, fabric_width, gap).is_ok())
}

pub fn page_coordinates(points: &mut [f64], height: f64, start: f64) {
    let scale = 72. / 2.54;
    for point in points.chunks_exact_mut(2) {
        point[0] = point[0] * scale;
        point[1] = (height - (point[1] - start)) * scale;
    }
}

/// SAFETY: points must refer to a live f64 allocation of exactly len elements.
#[no_mangle]
pub unsafe extern "C" fn exo_marker_page_coordinates(
    points: *mut f64, len: usize, height: f64, start: f64,
) -> i32 {
    if points.is_null() || len == 0 || len > 1_000_000 || len % 2 != 0 { return 0; }
    page_coordinates(std::slice::from_raw_parts_mut(points, len), height, start);
    1
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pdf_coordinates_preserve_page_subtraction_order() {
        let mut points = [2., 399., 150., 805.];
        page_coordinates(&mut points, 400., 400.);
        let scale = 72. / 2.54;
        assert_eq!(points, [2. * scale, 401. * scale, 150. * scale, -5. * scale]);
    }

    #[test]
    fn rotation_and_degenerate_inputs() {
        assert_eq!(exo_marker_normalized_rotation(-180.),180.);
        assert_eq!(exo_marker_normalized_rotation(540.),180.);
        assert_eq!(exo_marker_normalized_rotation(-450.),-90.);
        assert!((exo_marker_rotate_x(3.,4.,0.)-3.).abs()<1e-12);
        assert!((exo_marker_rotate_y(3.,4.,0.)-4.).abs()<1e-12);
        assert_eq!(exo_marker_rotate_x(0.,0.,135.),0.);
        assert!(exo_marker_normalized_rotation(f64::NAN).is_nan());
    }

    #[test]
    fn packs_adjacent_boxes_before_using_extra_length() {
        let mut result = [0.; 10];
        pack_entries(&[1., 70., 100., 1., 70., 100.], &mut result, 150., 10.).unwrap();
        assert_eq!(result, [0., 0., 70., 100., 0., 80., 0., 70., 100., 0.]);
    }

    #[test]
    fn narrow_fabric_uses_legal_cross_grain_option() {
        let mut result = [0.; 5];
        pack_entries(&[2., 170., 60., 60., 170.], &mut result, 100., 1.5).unwrap();
        assert_eq!(result, [0., 0., 60., 170., 1.]);
    }

    #[test]
    fn oversized_piece_is_reported_as_unplaced_without_blocking_next_piece() {
        let mut result = [0.; 10];
        pack_entries(&[1., 110., 20., 1., 50., 20.], &mut result, 90., 1.5).unwrap();
        assert!(result[..5].iter().all(|n| n.is_nan()));
        assert_eq!(&result[5..], &[0., 0., 50., 20., 0.]);
    }

    #[test]
    fn malformed_layout_is_transactionally_rejected() {
        let mut result = [47.; 10];
        assert!(pack_entries(&[1., 10., 10., 2., 15.], &mut result, 150., 1.5).is_err());
        assert_eq!(result, [47.; 10]);
        assert!(pack_entries(&[1., 10., 10., 1., f64::NAN, 5.], &mut result, 150., 1.5).is_err());
        assert_eq!(result, [47.; 10]);
    }
}
