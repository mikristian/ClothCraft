export const EXO_CUSTOM_TOOLBAR_DOCKS_20261028=['left','right','top','bottom']

const finiteRect=rect=>rect&&[rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)&&rect.width>80&&rect.height>80

/** Determine a visible edge target from viewport coordinates. Center = floating. */
export function resolveCustomToolbarDock20261028(rect,x,y,sideRects={}){
 if(!finiteRect(rect)||!Number.isFinite(x)||!Number.isFinite(y))return null
 // Side panels are also targets, including portions outside the central workspace.
 for(const side of ['left','right']){
  const area=sideRects[side]
  if(finiteRect(area)&&x>=area.left&&x<=area.left+area.width&&
     y>=area.top&&y<=area.top+area.height)return side
 }
 if(x<rect.left||x>rect.left+rect.width||y<rect.top||y>rect.top+rect.height)return null
 const horizontal=Math.min(100,Math.max(46,rect.width*.13))
 const vertical=Math.min(82,Math.max(44,rect.height*.16))
 const candidates=[
  ['left',(x-rect.left)/horizontal],
  ['right',(rect.left+rect.width-x)/horizontal],
  ['top',(y-rect.top)/vertical],
  ['bottom',(rect.top+rect.height-y)/vertical],
 ].filter(([,distance])=>distance>=0&&distance<=1)
 candidates.sort((a,b)=>a[1]-b[1])
 return candidates[0]?.[0]||null
}
