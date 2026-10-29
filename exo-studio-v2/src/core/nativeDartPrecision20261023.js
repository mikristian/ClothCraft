import {sampleNativeConstructionContour} from './nativeParametricPoint20261023.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const vector=(a,b)=>[b[0]-a[0],b[1]-a[1]]
const cross=(u,v)=>u[0]*v[1]-u[1]*v[0]
const norm=v=>Math.hypot(...v)
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
const reason=e=>({ok:false,reason:e?.message||String(e),manufacturingApproved:false})
const contains=(polygon,p)=>{
  let inside=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j]
    if((a[1]>p[1])!==(b[1]>p[1])&&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside
  }
  return inside
}
function segmentsCross(a,b,c,d){
  const u=vector(a,b),v=vector(c,d),den=cross(u,v)
  if(Math.abs(den)<=1e-12)return false
  const ac=vector(a,c),t=cross(ac,v)/den,s=cross(ac,u)/den
  return t>1e-5&&t<1-1e-5&&s>-1e-6&&s<1+1e-6
}

/** Exact metric inspector for Rust `DartCutSew`; no freehand pixel guesses.
 * This creates a physical CUT-AND-SEWN wedge, not an uncut folded dart and
 * not an automatic transfer/rotation of existing sewn dart references.
 * All geometry is in metres, user distances in millimetres. */
export function buildNativeDartPrecision20261023(snapshot,{
  panelId,edge,centerFraction=.5,intakeMm=20,depthMm=50,
}={}){
  try{
    if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0||
      typeof panelId!=='string'||typeof edge!=='string')throw Error('Select a current native garment panel and straight boundary')
    if(!finite(centerFraction)||centerFraction<=0||centerFraction>=1||
      !finite(intakeMm)||intakeMm<3||intakeMm>150||
      !finite(depthMm)||depthMm<8||depthMm>500)
      throw Error('Dart needs 3–150 mm intake, 8–500 mm depth, and an interior centre fraction')
    const matches=snapshot.template?.panels?.filter(p=>p.id===panelId)
    if(matches?.length!==1||!matches[0].polygon)throw Error('Dart source panel is missing or ambiguous')
    const poly=matches[0].polygon,index=poly.edges?.indexOf(edge)
    if(index<0||poly.edges.length!==poly.points?.length||poly.points.length>128)
      throw Error('Invalid named native dart source boundary')
    const a=poly.points[index],b=poly.points[(index+1)%poly.points.length]
    if(!Array.isArray(a)||!Array.isArray(b)||![...a,...b].every(finite))throw Error('Source boundary is nonfinite')
    const u=vector(a,b),length=norm(u)
    if(length<.02)throw Error('Dart source boundary must be at least 20 mm')
    if(poly.curves?.[edge]||poly.free_curve_points?.[edge]?.length||
      poly.notches?.[edge]?.length||poly.target_lengths?.[edge]!=null||
      poly.vertex_ids?.[edge]!=null||poly.measurements?.some(m=>m.a?.edge===edge||m.b?.edge===edge)||
      poly.lines?.some(line=>line.id===edge))
      throw Error('Selected dart boundary has curved or attached geometry; preserve metadata before cutting')
    if(poly.holes?.length||poly.lines?.length)throw Error('Cannot safely transfer internal lines or holes to a new dart')
    if(snapshot.template.seams?.some(seam=>[seam?.a,seam?.b].some(ref=>ref?.panel===panelId&&ref?.edge===edge)))
      throw Error('The selected edge is already sewn; use an unsewn source boundary')
    const left_t=centerFraction-(intakeMm/1000)/(2*length)
    const right_t=centerFraction+(intakeMm/1000)/(2*length)
    if(left_t<=.01||right_t>=.99||right_t-left_t<.005)
      throw Error('Dart stations must be strictly inside the source boundary with 1% endpoint clearance')
    const left=lerp(a,b,left_t),right=lerp(a,b,right_t),mid=lerp(left,right,.5)
    const inward=[-u[1]/length,u[0]/length]
    const apex=[mid[0]+inward[0]*depthMm/1000,mid[1]+inward[1]*depthMm/1000]
    const sample=sampleNativeConstructionContour(poly)
    const orientation=sample.reduce((sum,p,i)=>sum+cross(p,sample[(i+1)%sample.length]),0)
    if(orientation<=1e-8)throw Error('Dart requires a counterclockwise, noncollapsed source contour')
    if(!contains(sample,apex))throw Error('Dart apex falls outside the source contour')
    // Actual wedge legs must not cross any existing edge except the source
    // edge they originate from; this also catches nearby side/neck corners.
    for(let i=0;i<sample.length;i++){
      const c=sample[i],d=sample[(i+1)%sample.length]
      if(segmentsCross(left,apex,c,d)||segmentsCross(apex,right,c,d))
        throw Error('Dart legs intersect another part of the garment outline')
    }
    const legsMm=[norm(vector(left,apex))*1000,norm(vector(right,apex))*1000]
    if(Math.abs(legsMm[0]-legsMm[1])>.001)throw Error('Dart legs are not symmetric around the perpendicular bisector')
    return {ok:true,panelId,edge,revision:snapshot.revision,
      centrePercent:centerFraction*100,intakeMm,depthMm,left_t,right_t,
      left,right,apex,legsMm,angleDegrees:2*Math.atan((intakeMm/2)/depthMm)*180/Math.PI,
      wedgeAreaMm2:intakeMm*depthMm/2,
      preview:{panelId,edge,left,right,apex,revision:snapshot.revision},
      command:{kind:'DartCutSew',panel:panelId,edge,left_t,right_t,apex},
      manufacturingApproved:false,source:'SYMMETRIC_NATIVE_CUT_SEWN_DART_PREVIEW',
      caveat:'Rust creates a real V-shaped material cut and a same-panel sewing seam. This is NOT an uncut folded dart, pivot transfer, physical fit proof or factory release.'}
  }catch(e){return reason(e)}
}
