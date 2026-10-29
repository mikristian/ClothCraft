/**
 * In-process automation for the complete EXO UI shell. Native cloth physics
 * and pattern topology remain authoritative in the separate Rust HTTP agent.
 *
 * The window event transport is intentionally page-local: it never exposes
 * the user's private IndexedDB archive or settings to an unauthenticated HTTP
 * listener. Browser agents and same-page extensions can invoke these actions.
 */
export const APP_AUTOMATION_REQUEST = 'clothcraft:automation:request'
export const APP_AUTOMATION_RESPONSE = 'clothcraft:automation:response'

const specs = [
  ['app.capabilities', 'List executable in-app automation actions and their transport', false],
  ['app.status', 'Get active engine, project, workspace section and viewport state', false],
  ['app.project.summary', 'Read authored pattern/seam counts and current project metadata', false],
  ['app.project.save', 'Save the current garment through its active editor', true],
  ['app.library.open', 'Show the full-screen File Library', false],
  ['app.library.list', 'List saved file-library project metadata', false],
  ['app.library.collections.list', 'List saved project collections', false],
  ['app.library.collections.create', 'Create a named project collection', true],
  ['app.library.capture', 'Save an editable snapshot of the current garment in the library', true],
  ['app.library.project.open', 'Open an existing saved garment by ID', true],
  ['app.assets.list', 'List built-in garments, fabrics, hardware or studio-stage presets', false],
  ['app.appearance.get', 'Read the effective theme and visible panel settings', false],
  ['app.appearance.setTheme', 'Switch to a validated built-in interface theme', true],
  ['app.workspace.setLayout', 'Switch between 2D, 3D, split and stacked workspaces', true],
  ['app.scene.setStage', 'Choose a bundled stage for the legacy renderer', true],
]

export const APP_AUTOMATION_ACTIONS = Object.freeze(specs.map(([id,description,mutates])=>Object.freeze({id,description,mutates,transport:'same-page CustomEvent'})))

export function installAppAutomation(getHandlers, target=window) {
  if(typeof getHandlers!=='function'||!target?.addEventListener||!target?.dispatchEvent)throw TypeError('Automation event target and handlers required')
  const actionIds=new Set(APP_AUTOMATION_ACTIONS.map(item=>item.id))
  let queue=Promise.resolve()
  const onRequest=event=>{
    const detail=event?.detail
    if(!detail||typeof detail.id!=='string'||detail.id.length>128)return
    const {id,action,args={}}=detail
    queue=queue.catch(()=>{}).then(async()=>{
      let response
      try{
        if(!actionIds.has(action))throw Object.assign(Error('Unsupported ClothCraft UI automation action'),{code:'UNSUPPORTED_ACTION'})
        if(args===null||typeof args!=='object'||Array.isArray(args))throw Object.assign(Error('Arguments must be an object'),{code:'INVALID_ARGUMENTS'})
        const handlers=getHandlers()
        const handler=handlers?.[action]
        if(typeof handler!=='function')throw Object.assign(Error('This action is not available in the current workspace'),{code:'UNAVAILABLE'})
        response={id,action,ok:true,result:await handler(args)}
      }catch(error){response={id,action,ok:false,code:error?.code||'ACTION_FAILED',error:error?.message||String(error)}}
      target.dispatchEvent(new CustomEvent(APP_AUTOMATION_RESPONSE,{detail:response}))
    })
  }
  target.addEventListener(APP_AUTOMATION_REQUEST,onRequest)
  return()=>target.removeEventListener(APP_AUTOMATION_REQUEST,onRequest)
}

export function requestAppAutomation(action,args={},target=window,{timeoutMs=30000}={}) {
  const id=`clothcraft-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return new Promise((resolve,reject)=>{
    const handler=event=>{
      if(event.detail?.id!==id)return
      cleanup()
      if(event.detail.ok)resolve(event.detail.result)
      else reject(Object.assign(Error(event.detail.error||'Automation failed'),{code:event.detail.code}))
    }
    const cleanup=()=>{target.removeEventListener(APP_AUTOMATION_RESPONSE,handler);clearTimeout(timer)}
    const timer=setTimeout(()=>{cleanup();reject(Object.assign(Error('ClothCraft UI automation did not respond'),{code:'TIMEOUT'}))},timeoutMs)
    target.addEventListener(APP_AUTOMATION_RESPONSE,handler)
    target.dispatchEvent(new CustomEvent(APP_AUTOMATION_REQUEST,{detail:{id,action,args}}))
  })
}
