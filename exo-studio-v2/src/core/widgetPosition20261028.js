/** Clamp the whole dragged widget, not only its titlebar corner. */
export function clampWidgetPosition20261028(x,y,host,widget){
 const finite=value=>Number.isFinite(value)?value:0
 const limit=(position,available,size)=>Math.max(0,Math.min(finite(position),Math.max(0,finite(available)-Math.max(0,finite(size)))))
 return {x:limit(x,host?.width,widget?.width),y:limit(y,host?.height,widget?.height)}
}
