// Read-only sampled geometry QA. Measurements approximate curves and do not certify manufacture.
import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {evaluateFreeCurve} from './nativeFreeCurvePoints.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const MAX_SAMPLES = 256
const SAMPLES_PER_CURVE = 24
const EPS_MM = 0.001
const EPS_AREA_MM2 = 0.001
const finitePoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])
const between = (a,b,c) => Math.min(a,b)-EPS_MM <= c && c <= Math.max(a,b)+EPS_MM
const onSegment = (a,b,p) => Math.abs(cross(a,b,p)) <= EPS_MM*dist(a,b) &&
  between(a[0],b[0],p[0]) && between(a[1],b[1],p[1])

function segmentsIntersect(a,b,c,d) {
  const abC=cross(a,b,c), abD=cross(a,b,d), cdA=cross(c,d,a), cdB=cross(c,d,b)
  const epsAB=EPS_MM*dist(a,b), epsCD=EPS_MM*dist(c,d)
  if ((abC > epsAB && abD < -epsAB || abC < -epsAB && abD > epsAB) &&
      (cdA > epsCD && cdB < -epsCD || cdA < -epsCD && cdB > epsCD)) return true
  return (Math.abs(abC)<=epsAB && onSegment(a,b,c)) ||
    (Math.abs(abD)<=epsAB && onSegment(a,b,d)) ||
    (Math.abs(cdA)<=epsCD && onSegment(c,d,a)) ||
    (Math.abs(cdB)<=epsCD && onSegment(c,d,b))
}

function contour(polygon) {
  const points=polygon?.points,edges=polygon?.edges
  if (!Array.isArray(points)||points.length<3||points.length>MAX_SAMPLES||!Array.isArray(edges)||edges.length!==points.length ||
      !points.every(finitePoint) || new Set(edges).size!==edges.length)
    throw Error('Invalid or incomplete polygon contour')
  const sampled=[]
  for (let i=0;i<points.length;i++) {
    const edge=edges[i],knots=polygon.free_curve_points?.[edge]
    const curved=Object.prototype.hasOwnProperty.call(polygon.curves||{},edge) ||
      Object.prototype.hasOwnProperty.call(polygon.free_curve_points||{},edge)
    const n=curved?Math.max(SAMPLES_PER_CURVE,((knots?.length||0)+1)*SAMPLES_PER_CURVE):1
    if (sampled.length+n>MAX_SAMPLES) throw Error('Contour too complex: exceeds 256 sampled points')
    for (let j=0;j<n;j++) {
      const p=curved?evaluateFreeCurve(polygon,edge,j/n):points[i]
      if (!finitePoint(p)) throw Error('Invalid curved contour sample')
      sampled.push([p[0]*1000,p[1]*1000])
    }
  }
  return sampled
}

function metrics(sampled,polygon) {
  const n=sampled.length,blockers=[]
  let sampledPerimeterMm=0,twiceArea=0
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity
  for (let i=0;i<n;i++) {
    const a=sampled[i],b=sampled[(i+1)%n],length=dist(a,b)
    sampledPerimeterMm+=length
    twiceArea+=a[0]*b[1]-b[0]*a[1]
    minX=Math.min(minX,a[0]);maxX=Math.max(maxX,a[0])
    minY=Math.min(minY,a[1]);maxY=Math.max(maxY,a[1])
    if (!Number.isFinite(length)||length<=EPS_MM) blockers.push('Collapsed sampled contour edge')
  }
  // A fixed 24-station chord sum systematically understates curved sewing
  // lengths. Match native Rust's bounded 0.25 mm cubic flattening for every
  // named physical edge. Retain the sampled contour solely for bounds, area
  // and crossing detection, which remain approximation-based inspections.
  let perimeterMm=0,allEdgesMeasured=true
  for(const edge of polygon.edges){
    const measurement=nativeRustEdgeLength20261023(polygon,edge)
    if(!measurement.ok||!Number.isFinite(measurement.totalLengthM)||measurement.totalLengthM<=0){
      blockers.push(`Unmeasurable native edge ${edge}: ${measurement.reason||'Invalid physical length'}`)
      allEdgesMeasured=false
      continue
    }
    perimeterMm+=measurement.totalLengthM*1000
    if(measurement.totalLengthM*1000<=EPS_MM)
      blockers.push(`Collapsed native physical edge ${edge}`)
  }
  // Partial sums must never look like a finished production measurement.
  if(!allEdgesMeasured)perimeterMm=null
  const areaMm2=twiceArea/2,widthMm=maxX-minX,heightMm=maxY-minY
  if (![perimeterMm,areaMm2,widthMm,heightMm].every(Number.isFinite))
    blockers.push('Nonfinite contour measurements')
  if (Math.abs(areaMm2)<=EPS_AREA_MM2) blockers.push('Degenerate or zero signed contour area')
  if (widthMm<=EPS_MM||heightMm<=EPS_MM) blockers.push('Collapsed contour bounds')
  for (let i=0;i<n;i++) {
    const a=sampled[i],b=sampled[(i+1)%n]
    for (let j=i+1;j<n;j++) {
      if (j===i+1||(i===0&&j===n-1)) continue
      if (segmentsIntersect(a,b,sampled[j],sampled[(j+1)%n])) {
        blockers.push('Self-crossing sampled contour')
        return {perimeterMm,sampledPerimeterMm,areaMm2,widthMm,heightMm,blockers:[...new Set(blockers)]}
      }
    }
  }
  return {perimeterMm,sampledPerimeterMm,areaMm2,widthMm,heightMm,blockers:[...new Set(blockers)]}
}

/** Returns all panel/size rows. A failed draft import or any geometry blocker fails closed. */
export function auditAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet,{allowNamedSizes=false}={}) {
  const result={ok:false,blocks:true,issues:[],manufacturingApproved:false,panels:[]}
  try {
    const sizes=ruleSet?.sizes
    if(!Array.isArray(sizes)||(!allowNamedSizes&&
        (sizes.length!==6||sizes.some((s,i)=>s!==['XS','S','M','L','XL','XXL'][i]))))
      throw Error('QA requires all six ordered XS–XXL sizes')
    // Advanced F7 drafts can evaluate 2–24 arbitrary named sizes, but this
    // MUST NOT change the six-size-only native Rust factory acceptance gate.
    if(allowNamedSizes&&(sizes.length<2||sizes.length>24||
      new Set(sizes).size!==sizes.length||sizes.some(s=>
        typeof s!=='string'||!s||s.length>32)))
      throw Error('Invalid named-size QA range')
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
    if (!compiled.ok) throw Error(compiled.reason||'Invalid or stale grading rule sidecar')
    const panels=snapshot?.template?.panels
    if(!Array.isArray(panels)||!panels.length||panels.length>256||
      panels.some(panel=>typeof panel?.id!=='string'||!panel.id)||
      new Set(panels.map(panel=>panel.id)).size!==panels.length||
      Object.keys(compiled.byPanel||{}).length!==panels.length)
      throw Error('Native grade QA requires distinct, complete source panels')
    const rows=[]
    for(const panel of panels) {
      const entry=compiled.byPanel[panel.id]
      if (!entry?.sizeRun) throw Error(`Missing compiled panel: ${panel.id}`)
      const base=metrics(contour(entry.basePolygon),entry.basePolygon)
      for (const size of sizes) {
        const graded=entry.sizeRun[size]?.polygon
        if (!graded) throw Error(`Missing compiled size: ${panel.id}/${size}`)
        const measurement=metrics(contour(graded),graded)
        const blockers=[...measurement.blockers]
        if (Math.sign(measurement.areaMm2)!==Math.sign(base.areaMm2) &&
            Math.abs(measurement.areaMm2)>EPS_AREA_MM2 && Math.abs(base.areaMm2)>EPS_AREA_MM2)
          blockers.push('Contour orientation sign flipped relative to base')
        if (base.blockers.length) blockers.push('Base contour has geometry blockers')
        const row={panelId:panel.id,size,perimeterMm:measurement.perimeterMm,
          sampledPerimeterMm:measurement.sampledPerimeterMm,
          perimeterMeasurement:'NATIVE_RUST_CURVE_FLATTEN_0_25MM',
          widthMm:measurement.widthMm,heightMm:measurement.heightMm,
          areaMm2:measurement.areaMm2,blockers:[...new Set(blockers)]}
        rows.push(row)
        if (row.blockers.length) result.issues.push({panelId:panel.id,size,blockers:row.blockers})
      }
    }
    if(rows.length!==panels.length*sizes.length||
      new Set(rows.map(row=>`${row.panelId}\u0000${row.size}`)).size!==rows.length)
      throw Error('Native grade QA has incomplete or duplicate size coverage')
    result.panels=rows
    result.blocks=result.issues.length>0
    result.ok=!result.blocks
  } catch(error) {
    result.issues.push({reason:error instanceof Error?error.message:String(error)})
  }
  return result
}

/** Native grading UI contract: per-panel six-size rows plus code/message issues. */
export function inspectAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet) {
  const audit=auditAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet)
  const byPanel=new Map()
  for(const row of audit.panels) {
    if(!byPanel.has(row.panelId))byPanel.set(row.panelId,{panelId:row.panelId,rows:[]})
    byPanel.get(row.panelId).rows.push(row)
  }
  const issues=audit.issues.flatMap(item=>
    Array.isArray(item.blockers)
      ? item.blockers.map(message=>({panelId:item.panelId,size:item.size,
          code:'GEOMETRY_BLOCKED',message}))
      : [{code:'INVALID_RULE_SET',message:item.reason||'Invalid native grading rules'}])
  return {ok:audit.ok,blocks:[...byPanel.values()],issues,manufacturingApproved:false}
}
