#[no_mangle]
pub extern "C" fn exo_label_layout_abi_version() -> i32 { 1 }

#[no_mangle]
pub extern "C" fn exo_label_layout_alloc(words: usize) -> *mut f64 {
    let mut data = vec![0.0; words];
    let ptr = data.as_mut_ptr();
    std::mem::forget(data);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn exo_label_layout_free(ptr: *mut f64, words: usize) {
    if !ptr.is_null() { drop(Vec::from_raw_parts(ptr, words, words)); }
}

/// Input: midpoint xy, normal xy, screenUnit, width, height, bounds l/t/w/h,
/// then xy obstacle points. Output: x, y, box l/r/t/b, collision count.
/// Stable candidate order is distance [20,36,54,76] with sign [+1,-1].
fn place(input: &[f64], count: usize) -> Option<[f64; 7]> {
    if input.len() != 11 + count * 2 || !input.iter().all(|v| v.is_finite()) { return None; }
    let [mx, my, nx, ny, unit, width, height, left, top, w, h]: [f64; 11] = input[..11].try_into().ok()?;
    if unit <= 0.0 || width < 0.0 || height < 0.0 { return None; }
    let mut best = None;
    for distance in [20.0, 36.0, 54.0, 76.0] {
        for sign in [1.0, -1.0] {
            // f64::max/min follow the same finite-number clamping as JS Math.max/min.
            let x = (mx + nx * distance * unit * sign).min(left + w - width / 2.0 - 4.0 * unit).max(left + width / 2.0 + 4.0 * unit);
            let y = (my + ny * distance * unit * sign).min(top + h - 8.0 * unit).max(top + height + 30.0 * unit);
            let bleft = x - width / 2.0;
            let bright = x + width / 2.0;
            let btop = y - height;
            let bbottom = y + 3.0 * unit;
            let mut collisions = 0usize;
            for pt in input[11..].chunks_exact(2) {
                if pt[0] + 7.0 * unit > bleft && pt[0] - 7.0 * unit < bright
                    && pt[1] + 7.0 * unit > btop && pt[1] - 7.0 * unit < bbottom {
                    collisions += 1;
                }
            }
            let result = [x, y, bleft, bright, btop, bbottom, collisions as f64];
            if collisions == 0 { return Some(result); }
            if best.as_ref().is_none_or(|b: &[f64; 7]| result[6] < b[6]) {
                best = Some(result);
            }
        }
    }
    best
}

#[no_mangle]
pub unsafe extern "C" fn exo_label_layout_place(ptr: *const f64, count: usize, output: *mut f64) -> i32 {
    if ptr.is_null() || output.is_null() || count > 1_000_000 { return 0; }
    let input = std::slice::from_raw_parts(ptr, 11 + count * 2);
    match place(input, count) {
        Some(result) => { std::ptr::copy_nonoverlapping(result.as_ptr(), output, 7); 1 }
        None => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn empty_points_select_first_candidate() {
        let input = [50., 50., 1., 0., 1., 48., 13., 0., 0., 200., 200.];
        let result = place(&input, 0).unwrap();
        assert_eq!(result, [70., 50., 46., 94., 37., 53., 0.]);
    }
    #[test]
    fn collisions_pick_later_candidate() {
        let input = [50.,50.,1.,0.,1.,48.,13.,0.,0.,200.,200.,70.,50.];
        let result = place(&input, 1).unwrap();
        assert_eq!(result[0], 30.);
        assert_eq!(result[6], 0.);
    }
    #[test]
    fn all_blocked_retains_first_tie() {
        let mut input = vec![50.,50.,1.,0.,1.,48.,13.,0.,0.,200.,200.];
        for x in [70.,30.,86.,14.,104.,8.,126.] { input.extend([x,50.]); }
        let result = place(&input, 7).unwrap();
        assert!(result[6] > 0.);
    }
}
