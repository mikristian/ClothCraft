//! Role classification on exact JS-tokenized bitsets and anatomical offsets.
#[no_mangle]
pub extern "C" fn exo_body_arrangement_abi_version() -> u32 { 1 }
// role codes: 0 none, 1/2 arms, 3/4 hoods, 5/6 wrist, 7 waist, 8 neck,
// 9-12 legs, 13/14 lower, 15/16 torso.
pub fn role(t: u32, c: u32) -> u32 {
    let has = |b| (t & (1_u32 << b)) != 0_u32;
    let ctx = |b| (c & (1_u32 << b)) != 0_u32;
    let side = if has(0) { 1 } else if has(1) { 2 } else { 0 };
    let back = has(2); let front = has(3);
    if (has(4) || has(5)) && side != 0 { return side; }
    if has(6) && side != 0 { return 2 + side; }
    if (has(7) || has(8)) && side != 0 { return 4 + side; }
    if (has(9) || has(10) || has(11)) && !has(12) { return 7; }
    if has(13) || has(14) || has(15) || has(16) { return 8; }
    if has(12) || has(17) || has(18) || has(19) { return 0; }
    if (ctx(0) || has(20)) && side != 0 && (front || back) { return 9 + (side - 1) * 2 + if front { 0 } else { 1 }; }
    if (front || back) && (ctx(0) || ctx(1) || has(21)) { return if front { 13 } else { 14 }; }
    if front || back { return if front { 15 } else { 16 }; }
    0
}
#[no_mangle]
pub extern "C" fn exo_body_arrangement_role(tokens: u32, context: u32) -> u32 { role(tokens, context) }
/// axis 0=x 1=y 2=z, height in metres for body front/back.
#[no_mangle]
pub extern "C" fn exo_body_arrangement_offset(role: u32, axis: u32, height: f64) -> f64 {
    let value: [f64; 3] = match role {
        1 => [-0.285,1.26,0.045], 2 => [0.285,1.26,0.045],
        3|4 => [0.0,1.59,-0.2],
        5 => [-0.73,1.0,0.0], 6 => [0.73,1.0,0.0],
        7 => [0.0,0.88,0.0], 8 => [0.0,1.59,0.0],
        9 => [-0.15,0.0,0.14], 10 => [-0.15,0.0,-0.14],
        11 => [0.15,0.0,0.14], 12 => [0.15,0.0,-0.14],
        13 => [0.0,0.0,0.16], 14 => [0.0,0.0,-0.16],
        15 => [0.0,(1.66-height).max(0.63),0.245],
        16 => [0.0,(1.66-height).max(0.63),-0.245],
        _ => return f64::NAN,
    };
    value.get(axis as usize).copied().unwrap_or(f64::NAN)
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn priority_and_offsets() {
        assert_eq!(role((1<<0)|(1<<4),0),1);
        assert_eq!(role((1<<0)|(1<<3)|(1<<20),0),9);
        assert_eq!(role((1<<0)|(1<<3)|(1<<12),1),0);
        assert_eq!(role(1<<3,1),13);
        assert!((exo_body_arrangement_offset(15,1,0.65)-1.01).abs()<1e-12);
        assert_eq!(exo_body_arrangement_offset(16,2,0.65),-0.245);
    }
}
