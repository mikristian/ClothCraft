const CAPACITY: usize = 65536;
static mut INPUT: [f64; CAPACITY * 7] = [0.; CAPACITY * 7];
static mut OUTPUT: [f64; CAPACITY] = [0.; CAPACITY];
static mut PARTICLE_SUMS: [f64; CAPACITY] = [0.; CAPACITY];
static mut PARTICLE_COUNTS: [f64; CAPACITY] = [0.; CAPACITY];
static mut SUMMARY: [f64; 3] = [0.; 3];
static mut INDICES: [f64; CAPACITY * 2] = [0.; CAPACITY * 2];
#[no_mangle]
pub extern "C" fn exo_strain_abi_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn exo_strain_capacity() -> usize { CAPACITY }
#[no_mangle]
pub extern "C" fn exo_strain_input_ptr() -> *mut f64 { std::ptr::addr_of_mut!(INPUT).cast() }
#[no_mangle]
pub extern "C" fn exo_strain_output_ptr() -> *mut f64 { std::ptr::addr_of_mut!(OUTPUT).cast() }
#[no_mangle]
pub extern "C" fn exo_strain_indices_ptr() -> *mut f64 { std::ptr::addr_of_mut!(INDICES).cast() }
#[no_mangle]
pub extern "C" fn exo_strain_sums_ptr() -> *mut f64 { std::ptr::addr_of_mut!(PARTICLE_SUMS).cast() }
#[no_mangle]
pub extern "C" fn exo_strain_counts_ptr() -> *mut f64 { std::ptr::addr_of_mut!(PARTICLE_COUNTS).cast() }
#[no_mangle]
pub extern "C" fn exo_strain_summary_ptr() -> *mut f64 { std::ptr::addr_of_mut!(SUMMARY).cast() }
pub fn compute(input: &[f64], output: &mut [f64]) -> bool {
    if input.len() != output.len() * 7 || !input.iter().all(|x| x.is_finite()) { return false; }
    for (row, out) in input.chunks_exact(7).zip(output.iter_mut()) {
        let dx = row[0] - row[3];
        let dy = row[1] - row[4];
        let dz = row[2] - row[5];
        let length = (dx * dx + dy * dy + dz * dz).sqrt();
        *out = (length - row[6]).abs() / row[6];
    }
    true
}
#[no_mangle]
pub extern "C" fn exo_strain_compute(n: usize) -> u32 {
    if n > CAPACITY { return 0; }
    let input = unsafe { std::slice::from_raw_parts(exo_strain_input_ptr(), n * 7) };
    let output = unsafe { std::slice::from_raw_parts_mut(exo_strain_output_ptr(), n) };
    compute(input, output) as u32
}
pub fn accumulate(input: &[f64], indices: &[f64], sums: &mut [f64], counts: &mut [f64], summary: &mut [f64;3]) -> bool {
    if input.len()%7!=0 || indices.len()!=input.len()/7*2 || sums.len()!=counts.len() ||
       !input.iter().all(|v|v.is_finite()) ||
       !indices.iter().all(|v|v.is_finite() && *v>=0. && *v < sums.len() as f64 && v.fract()==0.) {return false;}
    sums.fill(0.); counts.fill(0.); summary.fill(0.);
    for (i,row) in input.chunks_exact(7).enumerate() {
        let dx=row[0]-row[3];let dy=row[1]-row[4];let dz=row[2]-row[5];
        let current=(dx*dx+dy*dy+dz*dz).sqrt();
        let strain=(current-row[6]).abs()/row[6];
        let a=indices[2*i] as usize;let b=indices[2*i+1] as usize;
        sums[a]+=strain;sums[b]+=strain;
        counts[a]+=1.;counts[b]+=1.;
        summary[0]+=strain;summary[1]=summary[1].max(strain);summary[2]+=1.;
    }
    true
}
#[no_mangle]
pub extern "C" fn exo_strain_accumulate(n:usize,p:usize)->u32 {
    if n>CAPACITY||p>CAPACITY{return 0;}
    let input=unsafe{std::slice::from_raw_parts(exo_strain_input_ptr(),n*7)};
    let indices=unsafe{std::slice::from_raw_parts(exo_strain_indices_ptr(),n*2)};
    let sums=unsafe{std::slice::from_raw_parts_mut(exo_strain_sums_ptr(),p)};
    let counts=unsafe{std::slice::from_raw_parts_mut(exo_strain_counts_ptr(),p)};
    let summary=unsafe{&mut *std::ptr::addr_of_mut!(SUMMARY)};
    accumulate(input,indices,sums,counts,summary) as u32
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn normal_and_zero_length() {
        let mut out=[0.;2];
        assert!(compute(&[0.,0.,0.,2.,0.,0.,1.,0.,0.,0.,0.,0.,0.,1.],&mut out));
        assert_eq!(out,[1.,1.]);
    }
    #[test] fn malformed_atomic() {
        let mut out=[77.];
        assert!(!compute(&[0.,0.,0.,f64::NAN,0.,0.,1.],&mut out));
        assert_eq!(out,[77.]);
        assert_eq!(exo_strain_compute(CAPACITY+1),0);
    }
    #[test] fn ordered_accumulation_and_shared_endpoints() {
        let input=[0.,0.,0.,2.,0.,0.,1., 0.,0.,0.,0.,0.,0.,1.];
        let mut sums=[0.;2];let mut counts=[0.;2];let mut summary=[0.;3];
        assert!(accumulate(&input,&[0.,1.,0.,0.],&mut sums,&mut counts,&mut summary));
        assert_eq!(sums,[3.,1.]);assert_eq!(counts,[3.,1.]);assert_eq!(summary,[2.,1.,2.]);
    }
}
