import {nativeGradePlan} from './nativeGradePlan.js'

const valid = n=>Number.isFinite(n)
const xy = value=>{
  if(!Array.isArray(value)||value.length!==2||!value.every(valid))throw new Error('Nonfinite native material coordinate')
  return value
}
const clone = obj=>structuredClone(obj)

/**
 * Read-only affine proposal matching integrations/clothcraft/exo-session.rs
 * graded_polygon: scale about the *flattened native boundary* centre, not
 * polygon vertex bounds. The preflight compiled UV bounds are used only when
 * the source polygon has straight edges. For curves use compiled material UV
 * bounds as a sampled contour estimate. Rust's 0.25 mm edge_points flattening
 * can differ from compiled tessellation; expose uncertainty, never exactness.
 *
 * @returns {{ok:true,panelId,revision,basePolygon,sizeRun,sizes,
 * baseSize:'BASE',selectedSize:'PREVIEW',beforeMm,afterMm,scale,center}|
 * {ok:false,reason:string}}
 */
export function buildAccuMarkNativeGradeProposal20261023(snapshot,{panelId,widthDeltaMm,heightDeltaMm,gradeModeOpen=true}={}){
  const reject=reason=>({ok:false,reason})
  if(!gradeModeOpen)return reject('Grade preview is available only while native grading is open')
  const plan=nativeGradePlan(snapshot,panelId,widthDeltaMm,heightDeltaMm)
  if(!plan.ok)return reject(plan.reason)
  const source=snapshot?.template?.panels?.find(item=>item.id===panelId)?.polygon
  if(!source||!Array.isArray(source.points)||source.points.length<3)return reject('Native source panel is missing')
  if(!Array.isArray(source.edges)||source.edges.length!==source.points.length||
     source.edges.some(name=>typeof name!=='string'||!name))return reject('Native polygon edge topology is invalid')
  try{
    const points=source.points.map(xy)
    const pointMin=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))]
    const pointMax=[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]
    const curveEntries=Object.entries(source.curves||{})
    const freeEntries=Object.entries(source.free_curve_points||{}).filter(([,v])=>v?.length)
    const curved=curveEntries.length>0||freeEntries.length>0
    const edgeNames=new Set(source.edges)
    if(new Set(source.edges).size!==source.edges.length)return reject('Duplicate native edge identifiers')
    for(const [edge,controls] of curveEntries){
      if(!edgeNames.has(edge)||!Array.isArray(controls)||controls.length!==2)return reject('Incomplete native cubic controls')
      controls.forEach(xy)
    }
    for(const [edge,knots] of freeEntries){
      if(!edgeNames.has(edge)||!Array.isArray(knots))return reject('Invalid native free curve edge')
      for(const knot of knots){
        if(!valid(knot?.t)||knot.t<=0||knot.t>=1)return reject('Invalid native free curve parameter')
        xy(knot.position)
        for(const key of ['derivative','derivative_in','derivative_out'])if(knot[key]!=null)xy(knot[key])
      }
    }
    const range=snapshot.panels.find(item=>item.id===panelId)
    const indexes=[...new Set(Object.values(range.boundaries||{}).flat())]
    if(indexes.length<Math.max(3,source.points.length)||indexes.some(i=>!Number.isInteger(i)||i<0))
      return reject('Compiled boundary coverage is incomplete')
    // For a curve, extra boundary samples must exist beyond its corner nodes.
    if(curved&&indexes.length<=source.points.length)return reject('Curved contour has no compiled boundary samples')
    const compiled=indexes.map(i=>xy(snapshot.uv[i]))
    const uvMin=[Math.min(...compiled.map(p=>p[0])),Math.min(...compiled.map(p=>p[1]))]
    const uvMax=[Math.max(...compiled.map(p=>p[0])),Math.max(...compiled.map(p=>p[1]))]
    if(curved&&points.some(point=>!compiled.some(p=>Math.hypot(p[0]-point[0],p[1]-point[1])<=1e-7)))
      return reject('Compiled contour is missing authored vertices')
    if([0,1].some(i=>uvMin[i]>pointMin[i]+1e-7||uvMax[i]<pointMax[i]-1e-7))
      return reject('Compiled contour does not enclose authored vertices')
    if(!curved&&[0,1].some(i=>Math.abs(pointMin[i]-uvMin[i])>1e-7||Math.abs(pointMax[i]-uvMax[i])>1e-7))
      return reject('Compiled native material bounds differ from authored panel bounds')
    const min=curved?uvMin:pointMin,max=curved?uvMax:pointMax
    const beforeMm=[(max[0]-min[0])*1000,(max[1]-min[1])*1000]
    if(beforeMm.some((v,i)=>Math.abs(v-plan.before[i])>1e-5||v<=.001))
      return reject('Native grade preflight bounds disagree with source geometry')
    const scale=beforeMm.map((v,i)=>(v+plan[i?'height':'width'])/v)
    const center=[(min[0]+max[0])/2,(min[1]+max[1])/2]
    const affine=p=>p.map((n,i)=>center[i]+(n-center[i])*scale[i])
    const polygon=clone(source)
    polygon.points=points.map(affine)
    if(curved){
      for(const [edge,controls] of curveEntries)polygon.curves[edge]=controls.map(c=>affine(xy(c)))
      for(const [edge,knots] of freeEntries)polygon.free_curve_points[edge]=knots.map(knot=>{
        const next={...knot,position:affine(xy(knot.position))}
        for(const key of ['derivative','derivative_in','derivative_out'])
          if(knot[key]!=null)next[key]=xy(knot[key]).map((v,i)=>v*scale[i])
        return next
      })
    }
    if(polygon.annotations?.length){
      polygon.annotations=polygon.annotations.map(a=>({...a,position:affine(xy(a.position))}))
    }
    if(polygon.lines?.length){
      polygon.lines=polygon.lines.map(line=>({
        ...line,
        points:line.points.map(point=>affine(xy(point))),
        tangents:line.tangents.map(tangent=>xy(tangent).map((n,i)=>n*scale[i])),
      }))
    }
    if(polygon.holes?.length){
      polygon.holes=polygon.holes.map(hole=>({...hole,
        points:hole.points.map(point=>affine(xy(point))),
        edges:[...hole.edges],
      }))
    }
    if(!polygon.points.flat().every(valid))return reject('Grade proposal contains nonfinite coordinates')
    const basePolygon=clone(source)
    return {ok:true,panelId,revision:plan.revision,basePolygon,
      sizeRun:{BASE:{panelId,polygon:basePolygon,units:'m'},PREVIEW:{panelId,polygon,units:'m'}},
      sizes:['BASE','PREVIEW'],baseSize:'BASE',selectedSize:'PREVIEW',
      beforeMm,afterMm:[beforeMm[0]+plan.width,beforeMm[1]+plan.height],scale,center,
      accuracy:curved?'approximate':'exact',
      boundUncertainty:curved?{
        source:'compiled UV sampled contour',unit:'mm',maxErrorMm:null,
        reason:'Rust grades using independently flattened edge_points at 0.25 mm; compiled UV sampling may have different extrema and spacing.',
      }:null}
  }catch(error){return reject(error.message)}
}
