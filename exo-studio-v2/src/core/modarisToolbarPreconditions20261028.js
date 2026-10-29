/**
 * Lightweight activation guard for the EXO equivalents in the custom Modaris
 * toolbar. The native Rust operation still owns authoritative validation and
 * revision/history; this rejects obvious no-op clicks before dispatch.
 */
export function checkModarisToolbarPreconditions20261028(route,{
  nativeMode=false,full2D=false,session=null,
}={}){
  if(!route)return {ok:false,reason:'This Modaris command has no verified EXO implementation.'}
  if(['settings','panel','layout'].includes(route.kind))return {ok:true}
  const label=route.tool?.label||'This command'
  if(route.kind==='app'){
    if(!nativeMode||['select','point','grid'].includes(route.action))return {ok:true}
    if(!session?.name)return {ok:false,reason:`${label}: load a native pattern project first.`}
    if(['save','export'].includes(route.action)&&session.busy)
      return {ok:false,reason:`${label}: native project is busy. Finish the edit and retry.`}
    if(route.action==='undo'&&!session.canUndo)
      return {ok:false,reason:'Undo: there is no recorded native edit to reverse.'}
    if(route.action==='redo'&&!session.canRedo)
      return {ok:false,reason:'Redo: there is no native edit to reapply.'}
    return {ok:true}
  }
  if(!nativeMode||!full2D)
    return {ok:false,reason:`${label}: open the native Rust 2D workspace first.`}
  if(!session?.name)
    return {ok:false,reason:`${label}: load and initialize a native pattern project first.`}
  if(session.busy||session.running)
    return {ok:false,reason:`${label}: pause simulation and finish native operations first.`}
  if(route.requiresSelection&&!session.selection?.panelId)
    return {ok:false,reason:`${label}: select a native pattern piece first.`}
  return {ok:true}
}
