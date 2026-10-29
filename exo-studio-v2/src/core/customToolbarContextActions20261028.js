export const CUSTOM_TOOLBAR_TARGETS_20261028=['floating','left','right','top','bottom']

/** Pure, reversible placement transitions; never delete toolbar definitions. */
export function applyCustomToolbarPlacement20261028(bars,id,action){
 if(!Array.isArray(bars)||typeof id!=='string'||!CUSTOM_TOOLBAR_TARGETS_20261028.includes(action)&&action!=='hide')
  return bars
 return bars.map(bar=>bar?.id!==id?bar:
  action==='hide'?{...bar,visible:false}:{...bar,dock:action,visible:true})
}
