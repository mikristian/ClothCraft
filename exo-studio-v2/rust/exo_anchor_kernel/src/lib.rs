static mut DATA:[f64;10]=[0.;10];
#[no_mangle] pub extern "C" fn exo_anchor_abi_version()->u32{1}
#[no_mangle] pub extern "C" fn exo_anchor_data_ptr()->*mut f64{std::ptr::addr_of_mut!(DATA).cast()}
pub fn interpolate(data:&mut [f64;10],mode:u32)->bool{
    if mode>3 || !data.iter().all(|v|v.is_finite()){return false;}
    let stiffness=data[9];
    for axis in 0..3{
        if mode==3 || (mode==0&&axis==1) || (mode==1&&axis==0) || (mode==2&&axis!=1){
            let result=if mode==3 {data[axis]+(data[axis+6]-data[axis])*stiffness}
                else {(1.-stiffness)*data[axis]+stiffness*data[axis+6]};
            if !result.is_finite(){return false;}
            data[axis]=result;
            data[axis+3]=result;
        }
    }
    true
}
#[no_mangle] pub extern "C" fn exo_anchor_interpolate(mode:u32)->u32{
    let data=unsafe{&mut *std::ptr::addr_of_mut!(DATA)};
    interpolate(data,mode) as u32
}
#[cfg(test)]mod tests{use super::*;
    #[test]fn axes(){for mode in 0..4{let mut d=[1.,2.,3.,7.,8.,9.,5.,6.,7.,0.5];assert!(interpolate(&mut d,mode));for axis in 0..3{let active=mode==3||(mode==0&&axis==1)||(mode==1&&axis==0)||(mode==2&&axis!=1);assert_eq!(d[axis],if active{axis as f64+3.}else{axis as f64+1.});assert_eq!(d[axis+3],if active{axis as f64+3.}else{axis as f64+7.});}}}
    #[test]fn invalid(){let mut d=[0.;10];d[9]=f64::NAN;assert!(!interpolate(&mut d,3));assert!(!interpolate(&mut [0.;10],4));}
}
