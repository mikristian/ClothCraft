//! Bounded saved-project structural gate. The JS document layer retains the
//! original validation order, error strings, and serialized object identity.
#[no_mangle]
pub extern "C" fn exo_restore_abi_version()->u32{1}
/// Flags: root object, pieces array, seams array. Returns first error code.
#[no_mangle]
pub extern "C" fn exo_restore_shape(root:u32,pieces:u32,seams:u32)->u32{
    if root==0 {1} else if pieces==0||seams==0 {2} else {0}
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn structure(){assert_eq!(exo_restore_shape(0,0,0),1);assert_eq!(exo_restore_shape(1,0,1),2);assert_eq!(exo_restore_shape(1,1,0),2);assert_eq!(exo_restore_shape(1,1,1),0);}
}
