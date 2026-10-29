// A tech pack uses one print stock and orientation across every factory sheet.
// Legacy per-sheet values remain readable until the document controls are used.
export const TECHPACK_PAPER_SIZES=Object.freeze({Letter:{label:'US Letter · 8.5 × 11 in',width:8.5,height:11},A4:{label:'A4 · 210 × 297 mm',width:210,height:297}})

export function techPackPageLayout(workspace={},pageId='overview'){
  const legacy=workspace.pages?.[pageId]||{}
  const orientation=workspace.orientation==='landscape'||workspace.orientation==='portrait'?workspace.orientation:
    legacy.orientation==='landscape'?'landscape':'portrait'
  const paperSize=workspace.paperSize==='A4'||workspace.paperSize==='Letter'?workspace.paperSize:
    legacy.paperSize==='A4'?'A4':'Letter'
  return {orientation,paperSize,pageName:paperSize==='Letter'?'Letter':'A4',
    pageStyle:paperSize+(orientation==='landscape'?'Landscape':'Portrait')}
}

export function applyTechPackPageLayout(workspace={},patch={}){
  const changes={}
  if(patch.orientation==='portrait'||patch.orientation==='landscape')changes.orientation=patch.orientation
  if(patch.paperSize==='Letter'||patch.paperSize==='A4')changes.paperSize=patch.paperSize
  return {...workspace,...changes,pages:Object.fromEntries(Object.entries(workspace.pages||{}).map(([id,settings])=>[id,{
    ...settings,...changes
  }]))}
}
