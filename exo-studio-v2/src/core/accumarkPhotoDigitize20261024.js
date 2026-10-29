// Conservative photo-based digitization. This extracts only a silhouette,
// never infers notches, grainlines, CUT/STITCH intent, seam allowances or fit.
const failure=(code,reason)=>({ok:false,code,reason,manufacturingApproved:false})
const vertex=(x,y)=>({x,y})
const polygonArea=points=>points.reduce((n,p,i)=>n+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0)/2
const distanceLine=(p,a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y
  if(dx*dx+dy*dy<1e-12)return Math.hypot(p.x-a.x,p.y-a.y)
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)))
  return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))
}
const intersects=(a,b,c,d)=>{
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)
  const A=cross(a,b,c),B=cross(a,b,d),C=cross(c,d,a),D=cross(c,d,b)
  return A*B< -1e-7&&C*D< -1e-7
}
function reducePolyline(original,tol,maxPoints){
  const first=original[0]
  const start=original.findIndex(p=>Math.hypot(p.x-first.x,p.y-first.y)>tol)
  if(start<0)return null
  const ordered=[...original.slice(start),...original.slice(0,start)]
  const step=radius=>{
    const result=[ordered[0]]
    for(let i=1;i<ordered.length;i++) {
      const last=result.at(-1),next=ordered[(i+1)%ordered.length]
      if(distanceLine(ordered[i],last,next)>radius||i===ordered.length-1)result.push(ordered[i])
    }
    while(result.length>3&&distanceLine(result[0],result.at(-1),result[1])<=radius)result.shift()
    return result
  }
  let radius=Math.max(0,tol),points=step(radius)
  for(let k=0;k<12&&points.length>maxPoints;k++){radius=radius?radius*1.65:.25;points=step(radius)}
  return points.length<=maxPoints?{points,tolerancePx:radius}:null
}
export function traceAccuMarkPhotoSilhouette20261024({rgba,width,height,threshold=120,foreground='dark',minPixels=50,
  simplifyTolerancePx=.75,maxPoints=512}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<10||height<10||width*height>1_000_000 ||
     !rgba||rgba.length!==width*height*4||!Number.isInteger(threshold)||threshold<10||threshold>245 ||
     !['dark','light'].includes(foreground)||!Number.isInteger(minPixels)||minPixels<10||
     !Number.isFinite(simplifyTolerancePx)||simplifyTolerancePx<0||simplifyTolerancePx>15||
     !Number.isInteger(maxPoints)||maxPoints<3||maxPoints>4096)
    return failure('INVALID_IMAGE','Provide bounded RGBA image and valid tracing configuration (maximum one megapixel).')
  const mask=new Uint8Array(width*height)
  let total=0
  for(let i=0;i<width*height;i++) {
    const a=rgba[i*4+3]
    if(a<250)continue // transparency cannot silently become fabric/cutting geometry
    const light=.2126*rgba[i*4]+.7152*rgba[i*4+1]+.0722*rgba[i*4+2]
    if((foreground==='dark'&&light<=threshold)||(foreground==='light'&&light>=threshold)) {mask[i]=1;total++}
  }
  if(total<minPixels)return failure('NO_SILHOUETTE','Foreground is too small; provide a high-contrast photo on a plain background.')
  if(total>width*height*.9)return failure('BACKGROUND_SELECTED','Most of the image is foreground; check threshold and dark/light choice.')
  // Flood fill 4-connected components and reject rather than silently discard
  // secondary cutting pieces, disconnected markings, or internal holes.
  const visited=new Uint8Array(mask.length),queue=new Int32Array(total)
  const components=[]
  for(let seed=0;seed<mask.length;seed++){
    if(!mask[seed]||visited[seed])continue
    let head=0,tail=1,edge=false
    queue[0]=seed;visited[seed]=1
    const pixels=[]
    while(head<tail){
      const idx=queue[head++],x=idx%width,y=Math.floor(idx/width)
      pixels.push(idx)
      if(x===0||y===0||x===width-1||y===height-1)edge=true
      for(const next of [x>0?idx-1:-1,x<width-1?idx+1:-1,y>0?idx-width:-1,y<height-1?idx+width:-1]){
        if(next>=0&&mask[next]&&!visited[next]){visited[next]=1;queue[tail++]=next}
      }
    }
    if(pixels.length>=minPixels)components.push({pixels,edge})
  }
  if(components.length!==1)return failure('MULTIPLE_SILHOUETTES',`Expected exactly one large connected pattern; found ${components.length} shapes.`)
  if(components[0].edge)return failure('CROPPED_PATTERN','Pattern touches the image edge; recapture with the entire piece visible.')
  const edges=new Map()
  let count=0
  const add=(a,b)=>{
    const key=a.x+','+a.y
    if(edges.has(key))throw Error('Ambiguous contour junction: trace requires a clean simple silhouette.')
    edges.set(key,b);count++
  }
  try{
    for(const idx of components[0].pixels){
      const x=idx%width,y=Math.floor(idx/width)
      if(y===0||!mask[idx-width])add(vertex(x,y),vertex(x+1,y))
      if(x===width-1||!mask[idx+1])add(vertex(x+1,y),vertex(x+1,y+1))
      if(y===height-1||!mask[idx+width])add(vertex(x+1,y+1),vertex(x,y+1))
      if(x===0||!mask[idx-1])add(vertex(x,y+1),vertex(x,y))
    }
    if(count>100000)return failure('BOUNDARY_COMPLEXITY','Contour is too noisy to safely trace.')
    const [first]=edges.keys(),[sx,sy]=first.split(',').map(Number)
    const points=[]
    let x=sx,y=sy
    for(let i=0;i<count;i++){
      const key=x+','+y,next=edges.get(key)
      if(!next)return failure('OPEN_BOUNDARY','Image silhouette contains a broken or ambiguous boundary.')
      points.push(vertex(x,y));edges.delete(key);x=next.x;y=next.y
      if(x===sx&&y===sy)break
    }
    if(edges.size)return failure('HOLES_OR_EXTRA_BOUNDARIES','Internal holes or multiple boundaries require manual review and are not auto-converted.')
    if(points.length<4||Math.abs(polygonArea(points))<minPixels)return failure('DEGENERATE_PATTERN','No valid closed outer boundary found.')
    const simplified=reducePolyline(points,simplifyTolerancePx,maxPoints)
    if(!simplified||simplified.points.length<3)return failure('COMPLEX_SHAPE','Unable to simplify image without exceeding pattern point limits.')
    const draft=simplified.points
    const sourceArea=Math.abs(polygonArea(points)),draftArea=Math.abs(polygonArea(draft))
    if(Math.abs(draftArea-sourceArea)/sourceArea>.01)return failure('SIMPLIFICATION_AREA_LOSS','Simplification changed silhouette area by over 1%.')
    if(draft.some((p,i)=>draft.some((q,j)=>j>i+1&&(i!==0||j!==draft.length-1)&&
      intersects(p,draft[(i+1)%draft.length],q,draft[(j+1)%draft.length]))))
      return failure('SELF_INTERSECTION','Extracted outline crosses itself.')
    return {ok:true,observedPoints:draft,pixelBounds:{
      xMin:Math.min(...draft.map(p=>p.x)),xMax:Math.max(...draft.map(p=>p.x)),
      yMin:Math.min(...draft.map(p=>p.y)),yMax:Math.max(...draft.map(p=>p.y))},
      sourcePixelCount:components[0].pixels.length,
      rawContourPoints:points.length,outlinePoints:draft.length,sourceAreaPx2:sourceArea,areaChangeRatio:Math.abs(draftArea-sourceArea)/sourceArea,
      simplifyTolerancePx:simplified.tolerancePx,
      sourceUnits:'pixels',physicalCalibrationVerified:false,
      marksRecovered:false,notchesRecovered:false,seamAllowancesRecovered:false,
      manufacturingApproved:false,
      note:'Segmented isolated high-contrast silhouette only. A user must calibrate physical length; contrast shadows and perspective can distort scale.'}
  }catch(error){return failure('AMBIGUOUS_BOUNDARY',error.message)}
}
