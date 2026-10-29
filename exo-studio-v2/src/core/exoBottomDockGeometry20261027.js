/** Shared bottom drop zone for grading palettes and ordinary EXO tool widgets.
 * The insertion indicator is intentionally thin; its pointer acquisition
 * zone extends upward so the target is easy to hit with a trackpad. */
export function isExoBottomDockHit20261027(rootRect,hostRect,x,y,edge='bottom'){
 if(!rootRect||!hostRect||![rootRect.x,rootRect.y,rootRect.width,rootRect.height,hostRect.y,x,y].every(Number.isFinite))return false
 if(rootRect.width<120||rootRect.height<140)return false
 if(edge==='top')return x>=rootRect.x&&x<=rootRect.x+rootRect.width&&y>=rootRect.y&&y<=Math.min(rootRect.y+rootRect.height-45,Math.max(rootRect.y+100,hostRect.y+(hostRect.height||29)+30))
 const bottom=rootRect.y+rootRect.height
 const top=Math.max(rootRect.y+45,Math.min(hostRect.y-30,bottom-126))
 return x>=rootRect.x&&x<=rootRect.x+rootRect.width&&y>=top&&y<=bottom-8
}

const PANEL_SELECTOR='.exo-grade-bottom-widget--docked,.clo-floating-tool--docked'
const panelIdentity=node=>node?.getAttribute?.('data-exo-grade-bottom-widget')||
 node?.getAttribute?.('data-clo-floating-widget')||null

/** Insert before the nearest panel midpoint, so either side can be targeted. */
export function getExoBottomDockInsertIndex20261028(host,clientX,excludeId=null){
 const panels=Array.from(host?.querySelectorAll?.(PANEL_SELECTOR)||[])
  .filter(node=>panelIdentity(node)!==excludeId)
  .map(node=>({rect:node.getBoundingClientRect(),id:panelIdentity(node)}))
  .filter(item=>Number.isFinite(item.rect.left)&&Number.isFinite(item.rect.width))
  .sort((a,b)=>a.rect.left-b.rect.left)
 if(!Number.isFinite(clientX))return panels.length
 const index=panels.findIndex(item=>clientX<item.rect.left+item.rect.width/2)
 return index===-1?panels.length:index
}

/** Notify the existing React splitter, which owns persistent CSS grid order. */
export function requestExoBottomDockInsert20261028(host,id,clientX){
 if(!host||!id)return false
 const index=getExoBottomDockInsertIndex20261028(host,clientX,id)
 const EventType=host.ownerDocument?.defaultView?.CustomEvent||globalThis.CustomEvent
 if(typeof EventType!=='function'||typeof host.dispatchEvent!=='function')return false
 host.dispatchEvent(new EventType('exo-bottom-dock-insert',{detail:{id,index}}))
 return true
}

export function setExoBottomDockHover20261027(host,active,label='Widget',clientX=null,excludeId=null){
 if(!host)return
 host.dataset.exoGradeDockDragHover=String(Boolean(active))
 if(!active){
  const EventType=host.ownerDocument?.defaultView?.CustomEvent||globalThis.CustomEvent
  if(typeof EventType==='function'&&typeof host.dispatchEvent==='function')
   host.dispatchEvent(new EventType('exo-bottom-dock-hover',{detail:{active:false}}))
  delete host.dataset.exoGradeDockDragLabel
  host.style?.removeProperty?.('--exo-dock-preview-left')
  host.style?.removeProperty?.('--exo-dock-preview-width')
  host.style?.removeProperty?.('--exo-dock-preview-height')
  delete host.dataset.exoDockPreviewPosition
  return
 }
 host.dataset.exoGradeDockDragLabel=String(label||'Widget').slice(0,72)
 const bounds=typeof host.getBoundingClientRect==='function'?host.getBoundingClientRect():{left:0,width:600}
 const hostWidth=Math.max(0,bounds.width)
 // The preview snaps to the actual new embedded grid slot, rather than
 // following the pointer as an arbitrary floating rectangle. A newly dropped
 // tool occupies the next column in the same in-page split layout.
 const occupants=Array.from(host.querySelectorAll?.(PANEL_SELECTOR)||[])
  .filter(node=>panelIdentity(node)!==excludeId).length
 const index=getExoBottomDockInsertIndex20261028(host,clientX,excludeId)
 const paneWidth=Math.max(70,(hostWidth-12-5*occupants)/(occupants+1))
 const left=Math.max(5,6+index*(paneWidth+5))
 const viewportHeight=typeof window==='undefined'?800:window.innerHeight
 const height=host.dataset.exoGradeDockOccupied==='true'?
  Math.max(65,Math.round(bounds.height-35)):Math.max(100,Math.min(165,viewportHeight*.21))
 host.dataset.exoDockPreviewPosition=`${index+1}/${occupants+1}`
 host.style?.setProperty?.('--exo-dock-preview-left',`${Math.round(left)}px`)
 host.style?.setProperty?.('--exo-dock-preview-width',`${Math.round(paneWidth)}px`)
 host.style?.setProperty?.('--exo-dock-preview-height',`${Math.round(height)}px`)
 const EventType=host.ownerDocument?.defaultView?.CustomEvent||globalThis.CustomEvent
 if(typeof EventType==='function'&&typeof host.dispatchEvent==='function')
  host.dispatchEvent(new EventType('exo-bottom-dock-hover',{
  detail:{active:true,id:excludeId,index,label:String(label||'Widget').slice(0,72)},
  }))
}
