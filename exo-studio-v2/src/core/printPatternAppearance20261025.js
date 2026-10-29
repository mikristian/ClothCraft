import {patternSemanticStroke} from './patternVisualTokens.js'
import {sampleInternalCurve} from '../components/nativeInternalCurve.js'

// Paint-only annotations. Print layout cut geometry and authoritative source are untouched.
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const style=role=>patternSemanticStroke(role)
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t)
const curveSamples=(a,b,handles)=>{
  if(!Array.isArray(handles)||![1,2].includes(handles.length)||!handles.every(finitePoint))return [a,b]
  return Array.from({length:13},(_,i)=>{
    const t=i/12,u=1-t
    return handles.length===1
      ?[0,1].map(j=>u*u*a[j]+2*u*t*handles[0][j]+t*t*b[j])
      :[0,1].map(j=>u**3*a[j]+3*u*u*t*handles[0][j]+3*u*t*t*handles[1][j]+t**3*b[j])
  })
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
function nativeEdges(poly){
  const points=poly?.points
  if(!Array.isArray(points)||points.length<3||!points.every(finitePoint))return []
  return points.map((p,i)=>({name:poly.edges?.[i]??String(i),points:curveSamples(p,points[(i+1)%points.length],poly.curves?.[poly.edges?.[i]])}))
}
function atArcFraction(points,t){
  const spans=points.slice(1).map((p,i)=>distance(p,points[i]))
  const length=spans.reduce((a,b)=>a+b,0)
  if(length<=0)return null
  let remaining=t*length
  for(let i=0;i<spans.length;i++){
    if(remaining<=spans[i]||i===spans.length-1){
      const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)
      if(n<=0)return null
      return {point:lerp(a,b,Math.max(0,Math.min(1,remaining/spans[i]))),normal:[-dy/n,dx/n]}
    }
    remaining-=spans[i]
  }
  return null
}

/** Returns print-piece-local centimetre polylines and semantic SVG styles.
 * Caller paints these inside its existing piece placement transform.
 * Graphics require a verified UV-to-print transform and are intentionally omitted.
 */
export function buildPrintPatternAppearance20261025(source,piece,{native=false}={}){
  const empty={internalLines:[],notches:[],seamAllowances:[],graphics:[],warnings:[]}
  if(!piece||!Array.isArray(piece.points)||!piece.points.length)return empty
  const panels=native?(source?.template?.panels??source?.panels):source?.pieces
  const panel=panels?.find(p=>String(p?.id)===String(piece.sourcePanelId??piece.id))
  if(!panel)return {...empty,warnings:['Source panel unavailable for appearance overlays']}
  if(!native)return {...empty,warnings:['Legacy source has no verified native annotation transform']}
  const poly=panel.polygon,edges=nativeEdges(poly)
  if(!edges.length)return empty
  // Matches printPieces20261025: its outline samples twelve points per edge,
  // omitting each edge endpoint (the next edge supplies that vertex).
  const outline=edges.flatMap(e=>e.points.slice(0,-1))
  const minX=Math.min(...outline.map(p=>p[0])),minY=Math.min(...outline.map(p=>p[1]))
  const toCm=p=>[(p[0]-minX)*100,(p[1]-minY)*100]
  const internalLines=[]
  for(const line of poly.lines||[]){
    if(!Array.isArray(line.points)||line.points.length<2||!line.points.every(finitePoint))continue
    for(let i=0;i<line.points.length-1;i++){
      const points=sampleInternalCurve(line.points[i],line.points[i+1],line.tangents?.[i]??[0,0],line.tangents?.[i+1]??[0,0]).map(toCm)
      if(points.length>=2)internalLines.push({id:`${line.id??'line'}:${i}`,points,role:'internal',style:style('internal')})
    }
  }
  const signed=outline.reduce((s,p,i)=>{const q=outline[(i+1)%outline.length];return s+p[0]*q[1]-q[0]*p[1]},0)
  const outward=signed>=0?-1:1
  const notches=[],seamAllowances=[]
  for(const edge of edges){
    for(const [i,mark] of (poly.notches?.[edge.name]||[]).entries()){
      if(!Number.isFinite(mark?.t)||mark.t<0||mark.t>1||!Number.isFinite(mark?.depth_m)||mark.depth_m<=0)continue
      const sample=atArcFraction(edge.points,mark.t)
      if(!sample)continue
      const end=sample.point.map((n,j)=>n+sample.normal[j]*mark.depth_m)
      notches.push({id:`${edge.name}:${i}`,points:[toCm(sample.point),toCm(end)],role:'notch',style:style('notch')})
    }
    const width=poly.seam_allowances?.[edge.name]
    if(!Number.isFinite(width)||width<=0)continue
    // Independent offset segments are visual guides; no invented corner joins.
    const points=edge.points.map((p,i,all)=>{
      const a=all[Math.max(0,i-1)],b=all[Math.min(all.length-1,i+1)]
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)
      return len>0?toCm([p[0]+outward*-dy/len*width,p[1]+outward*dx/len*width]):toCm(p)
    })
    seamAllowances.push({id:String(edge.name),points,role:'seam-allowance',style:style('seam-allowance'),preview:true})
  }
  const warnings=[]
  if(panel.graphics?.length||poly.graphics?.length||source?.graphics?.length)warnings.push('Graphics omitted: source-to-pattern print coordinates have not been verified')
  return {internalLines,notches,seamAllowances,graphics:[],warnings}
}
