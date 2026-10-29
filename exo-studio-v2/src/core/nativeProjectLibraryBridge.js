let sequence = 0
// The live Rust editor owns its current garment. Ask that same mounted editor
// for an exact serialized snapshot instead of reading a stale mirror project.
export function requestNativeLibraryProject(action, project) {
  if (!['capture','open'].includes(action)) return Promise.reject(new Error('Unknown native library action'))
  const requestId=`library-${Date.now()}-${++sequence}`
  return new Promise((resolve,reject)=>{
    let settled=false
    const cleanup=()=>{window.removeEventListener('exo-project-file-library-native-result',handle);window.clearTimeout(timer)}
    const handle=event=>{
      if(event.detail?.requestId!==requestId||settled)return
      settled=true;cleanup()
      if(event.detail.ok)resolve(event.detail)
      else reject(new Error(event.detail.error||'The native garment editor could not finish the library action'))
    }
    const timer=window.setTimeout(()=>{
      if(settled)return
      settled=true;cleanup();reject(new Error('The native garment editor did not answer. Verify it is running, then try again.'))
    },45000)
    window.addEventListener('exo-project-file-library-native-result',handle)
    window.dispatchEvent(new CustomEvent('exo-project-file-library-native-request',{detail:{requestId,action,...(action==='open'?{project}:{})}}))
  })
}
