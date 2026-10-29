import {sampleNativeConstructionContour} from './nativeParametricPoint20261023.js'

const valid=n=>typeof n==='number'&&Number.isFinite(n)
const point=p=>Array.isArray(p)&&p.length===2&&p.every(valid)
const add=(a,b,t)=>[a[0]+t*b[0],a[1]+t*b[1]]
const minus=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0]
const fail=e=>({ok:false,reason:e?.message||String(e),manufacturingApproved:false})
function inside(polygon,p){
  let hit=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j]
    if((a[1]>p[1])!==(b[1]>p[1])&&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit
  }
  return hit
}
// Inclusive segment contact: touching or collinear stitch paths are not
// independent physical construction lines and must not reach the mesher.
function intersect(a,b,c,d){
  const on=(p,q,r)=>Math.abs(cross(minus(q,p),minus(r,p)))<=1e-10&&
    r[0]>=Math.min(p[0],q[0])-1e-9&&r[0]<=Math.max(p[0],q[0])+1e-9&&
    r[1]>=Math.min(p[1],q[1])-1e-9&&r[1]<=Math.max(p[1],q[1])+1e-9
  const ab=minus(b,a),cd=minus(d,c)
  const s1=cross(ab,minus(c,a)),s2=cross(ab,minus(d,a))
  const s3=cross(cd,minus(a,c)),s4=cross(cd,minus(b,c))
  return (s1*s2<0&&s3*s4<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)
}
const decimal=s=>typeof s==='number'?s:
  typeof s==='string'&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s.trim())?Number(s.trim()):NaN

/**
 * Validate a whole-row native tuck/pleat-sewing proposal against one immutable
 * physical pattern revision. Coordinates and Rust inputs are metres; the UI
 * specifies all design dimensions in millimetres.
 *
 * Genuine untorn material requires the Rust command to retain the original
 * contour/UV/rest area while welding two new internal stitch paths via a seam.
 * Until that is verified, never consider a proposed tuck manufacturing approved.
 */
export function planNativePhysicalPleats20261025(snapshot,{panelId,edge,
  centerPercent=50,intakeMm=18,depthMm=45,count=1,spacingMm=55}={}){
  try{
    if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)
      throw Error('An unchanged native garment revision is required')
    if(typeof panelId!=='string'||!panelId||typeof edge!=='string'||!edge)
      throw Error('Select a native panel and one straight cutline boundary')
    const center=decimal(centerPercent),intake=decimal(intakeMm),depth=decimal(depthMm)
    const spacing=decimal(spacingMm)
    if(![center,intake,depth,spacing].every(valid)||
      center<=0||center>=100||intake<3||intake>150||depth<8||depth>150||
      !Number.isSafeInteger(count)||count<1||count>16||spacing<5||spacing>500)
      throw Error('Enter a centre between 0–100%, intake 3–150 mm, depth 8–150 mm, 1–16 folds, spacing 5–500 mm')
    if(count>1&&spacing<intake+3)throw Error('Adjacent pleat intakes must have at least 3 mm physical clearance')
    const matches=snapshot.template?.panels?.filter(p=>p.id===panelId)
    if(matches?.length!==1||!matches[0].polygon)throw Error('Selected native garment panel is absent or ambiguous')
    const polygon=matches[0].polygon,names=polygon.edges,verts=polygon.points
    if(!Array.isArray(verts)||!Array.isArray(names)||verts.length<3||
      verts.length!==names.length||new Set(names).size!==names.length||
      names.some(name=>typeof name!=='string'||!name)||verts.length>128||!verts.every(point)||
      polygon.holes?.length)throw Error('Physical pleat requires a simple native contour without holes')
    const index=names.indexOf(edge)
    if(index<0||polygon.curves?.[edge]||polygon.free_curve_points?.[edge]?.length)
      throw Error('Choose an existing straight physical cutline for automatic pleat placement')
    if(polygon.notches?.[edge]?.length||polygon.target_lengths?.[edge]!=null||
      polygon.measurements?.some(pom=>pom.a?.edge===edge||pom.b?.edge===edge))
      throw Error('Selected boundary has manufacturing references that must be remapped explicitly')
    if(snapshot.template.seams?.some(seam=>[seam.a,seam.b].some(ref=>ref?.panel===panelId&&ref.edge===edge)))
      throw Error('This cutline is already sewn; preserve existing edge relationships')
    const a=verts[index],b=verts[(index+1)%verts.length],u=minus(b,a),length=Math.hypot(...u)
    if(length<.025)throw Error('Pleat source edge must be at least 25 mm')
    const inward=[-u[1]/length,u[0]/length]
    const contour=sampleNativeConstructionContour(polygon)
    const twiceArea=contour.reduce((sum,p,i)=>sum+cross(p,contour[(i+1)%contour.length]),0)
    if(twiceArea<=1e-9)throw Error('Native contour winding or area is invalid')
    const existingStations=new Map()
    for(const line of polygon.lines||[]){
      if(!Array.isArray(line?.points)||line.points.length<2||!line.points.every(point))
        throw Error('Stored internal lines contain invalid material coordinates')
      const match=/^(tuck_.*)_line_([ab])$/.exec(line.id||'')
      if(!match)continue
      const relative=minus(line.points[0],a)
      if(Math.abs(cross(relative,u))/length>.001)continue
      const stations=existingStations.get(match[1])||{}
      stations[match[2]]=(relative[0]*u[0]+relative[1]*u[1])/(length*length)
      existingStations.set(match[1],stations)
    }
    const candidate=[]
    for(let i=0;i<count;i++){
      const centre=center/100+((i-(count-1)/2)*spacing/1000)/length
      const left_t=centre-intake/1000/(2*length)
      const right_t=centre+intake/1000/(2*length)
      if(left_t<=.01||right_t>=.99||right_t-left_t<.005)
        throw Error(`Pleat ${i+1} would cross a cutline corner or collapse`)
      for(const stations of existingStations.values()){
        if(valid(stations.a)&&valid(stations.b)&&
          left_t<=Math.max(stations.a,stations.b)+.001/length&&
          right_t>=Math.min(stations.a,stations.b)-.001/length)
          throw Error(`Pleat ${i+1} overlaps an existing physical fold intake`)
      }
      const left=add(a,u,left_t),right=add(a,u,right_t)
      const inset=.0005
      const legs=[left,right].map(base=>{
        // Rust stores start = boundary + inset and end = start + depth.
        const p=add(base,inward,inset),q=add(p,inward,depth/1000)
        if(!inside(contour,p)||!inside(contour,q))
          throw Error(`Pleat ${i+1} stitch endpoint lies outside the material contour`)
        for(let j=1;j<=16;j++){
          if(!inside(contour,add(p,minus(q,p),j/17)))
            throw Error(`Pleat ${i+1} extends outside the material contour`)
        }
        for(let k=0;k<contour.length;k++){
          if(intersect(p,q,contour[k],contour[(k+1)%contour.length]))
            throw Error(`Pleat ${i+1} intersects another physical cutline`)
        }
        for(const line of polygon.lines||[]){
          if(!Array.isArray(line?.points))throw Error('Stored internal lines are invalid')
          for(let k=1;k<line.points.length;k++){
            if(intersect(p,q,line.points[k-1],line.points[k]))
              throw Error(`Pleat ${i+1} crosses an existing internal seam or fold marking`)
          }
        }
        return[p,q]
      })
      for(const previous of candidate){
        if(!(right_t<=previous.left_t-1e-6||left_t>=previous.right_t+1e-6))
          throw Error('Overlapping physical pleat intake stations')
      }
      candidate.push({left_t,right_t,left,right,legs,centrePercent:centre*100,
        command:{kind:'TuckFoldSew',panel:panelId,edge,left_t,right_t,depth_m:depth/1000}})
    }
    return{ok:true,revision:snapshot.revision,panelId,edge,intakeMm:intake,depthMm:depth,
      count,spacingMm:spacing,sourceBoundaryLengthMm:length*1000,
      commands:candidate.map(row=>row.command),preview:candidate,
      originalAreaMm2:twiceArea*.5*1e6,physicalTuckNotchesVerified:false,
      source:'NATIVE_PHYSICAL_INTERIOR_PLEAT_PROPOSAL',manufacturingApproved:false,
      caveat:'This proposal must retain original cloth material and connect separate internal sewing paths in native Rust. Pleat direction, self-contact, grade migration and factory sample signoff are not certified.'}
  }catch(error){return fail(error)}
}
