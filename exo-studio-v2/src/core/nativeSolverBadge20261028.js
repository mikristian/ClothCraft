/** Runtime solver identity comes from the current Rust snapshot, never from
 * a requested GPU flag or a feature-enabled executable's capabilities.
 * Experimental Metal compute must not be described as a verified cloth fit. */
export function nativeSolverBadge20261028(nativeSnapshot){
 const backend=nativeSnapshot?.backend
 if(typeof backend!=='string')return 'VERIFYING NATIVE SOLVER'
 if(backend==='ClothCraft GPU VBD + CPU OGC')return 'EXPERIMENTAL GPU VBD + CPU CONTACT'
 if(backend==='ClothCraft CPU VBD + OGC')return 'CPU VBD + OGC'
 return 'UNKNOWN NATIVE SOLVER'
}
