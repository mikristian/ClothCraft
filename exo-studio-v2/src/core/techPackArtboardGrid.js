/** Presentation-only artboard alignment. Native pattern/garment coordinates
 * are never modified; values describe print-artboard CSS pixels only. */
export const ARTBOARD_GRID_PX=8
export const validArtboardGridSize=n=>Number.isInteger(n)&&n>=4&&n<=32?n:ARTBOARD_GRID_PX
export const snapArtboardCoordinate=(value,grid=ARTBOARD_GRID_PX,enabled=true)=>{
 const v=Number(value)
 if(!Number.isFinite(v))return 0
 return enabled?Math.round(v/validArtboardGridSize(grid))*validArtboardGridSize(grid):v
}
export const snapArtboardObject=(object={},grid=ARTBOARD_GRID_PX,enabled=true)=>{
 if(!enabled)return {...object}
 const next={...object}
 for(const key of ['x','y'])if(Number.isFinite(next[key]))next[key]=snapArtboardCoordinate(next[key],grid)
 return next
}
export function alignArtboardBox(box={},direction='left',pageWidth=612,pageHeight=792){
 const width=Math.max(1,Math.min(pageWidth,Number(box.width)||200))
 const height=Math.max(1,Math.min(pageHeight,Number(box.height)||150))
 const x=Number(box.x)||0,y=Number(box.y)||0
 const result={...box}
 if(direction==='left')result.x=0
 if(direction==='center')result.x=(pageWidth-width)/2
 if(direction==='right')result.x=pageWidth-width
 if(direction==='top')result.y=0
 if(direction==='middle')result.y=(pageHeight-height)/2
 if(direction==='bottom')result.y=pageHeight-height
 if(!['left','center','right','top','middle','bottom'].includes(direction))return result
 result.x=Math.min(pageWidth-width,Math.max(0,result.x??x))
 result.y=Math.min(pageHeight-height,Math.max(0,result.y??y))
 return result
}
