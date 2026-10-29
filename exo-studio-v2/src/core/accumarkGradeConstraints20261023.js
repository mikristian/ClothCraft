import {gradeProject} from './grading.js'
import {evaluateIndustrialGradeRule, validateIndustrialGradeRule} from './industrialGradeRules.js'
import {cloneProject} from './project.js'

// Experimental single-vertex constraint solver. All geometry is in centimeters.
const EPS=1e-9
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const cross=(a,b)=>a.x*b.y-a.y*b.x
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y})
const dot=(a,b)=>a.x*b.x+a.y*b.y
const finite=(p)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
function fail(message){throw new Error('AccuMark grade constraint: '+message)}
function index(value,count,name){if(!Number.isInteger(value)||value<0||value>=count)fail('invalid '+name);return value}
function pieceAt(project,id){const p=project.pieces?.find(p=>p.id===id);if(!p)fail('unknown piece '+String(id));return p}
function sizesOf(project){
  const sizes=project.grading?.sizes,base=project.grading?.baseSize
  if(!Array.isArray(sizes)||sizes.length<2||new Set(sizes).size!==sizes.length||sizes.some(s=>typeof s!=='string'||!s.trim())||!sizes.includes(base))fail('invalid grading size set')
  return {sizes,base}
}
function context(project,options){
  if(!project||!options||typeof options!=='object')fail('project and options required')
  const {sizes,base}=sizesOf(project)
  const piece=pieceAt(project,options.pieceId)
  const pointIndex=index(options.pointIndex,piece.points?.length??0,'pointIndex')
  if(piece.curves&&Object.keys(piece.curves).length)fail('curved target geometry unsupported')
  if(piece.points.some(p=>!finite(p)))fail('nonfinite source geometry')
  const tolerance=options.toleranceCm??1e-6
  if(!Number.isFinite(tolerance)||tolerance<=0||tolerance>0.1)fail('invalid toleranceCm')
  return {sizes,base,piece,pointIndex,tolerance}
}
function point(project,id,i){const p=pieceAt(project,id);return p.points[index(i,p.points.length,'reference index')]}
function vertex(project,opts,key,id='pieceId'){return point(project,opts[id],opts[key])}
function solve(graded,opts,original){
  const p=pieceAt(graded,opts.pieceId),current=p.points[opts.pointIndex]
  const mode=opts.mode??'xy'
  if(!['xy','x','y','projected'].includes(mode))fail('unsupported mode')
  let result
  if(opts.kind==='match-length'){
    const anchor=vertex(graded,opts,'anchorIndex')
    const a=vertex(graded,opts,'referenceStartIndex','referencePieceId')
    const b=vertex(graded,opts,'referenceEndIndex','referencePieceId')
    const target=distance(a,b),v=sub(current,anchor),length=distance(current,anchor)
    if(target<EPS||length<EPS)fail('zero-length match geometry')
    if(mode==='projected'){
      const direction=sub(b,a),unit={x:direction.x/target,y:direction.y/target}
      const projection=dot(v,unit)
      if(projection<=EPS)fail('projected length direction invalid')
      result={x:current.x+(target-projection)*unit.x,y:current.y+(target-projection)*unit.y}
    }else if(mode==='xy')result={x:anchor.x+v.x*target/length,y:anchor.y+v.y*target/length}
    else {
      const axis=mode==='x'?'x':'y',other=mode==='x'?'y':'x'
      const remain=target*target-(current[other]-anchor[other])**2
      if(remain < -EPS)fail('target length cannot be reached along axis')
      const sign=Math.sign(current[axis]-anchor[axis])||Math.sign(original[axis]-anchor[axis])
      if(!sign)fail('ambiguous length direction')
      result={...current,[axis]:anchor[axis]+sign*Math.sqrt(Math.max(0,remain))}
    }
  }else if(opts.kind==='keep-angle'||opts.kind==='parallel'){
    if(mode==='projected')fail('projected mode only supports match-length')
    const anchor=vertex(graded,opts,'anchorIndex')
    const a=vertex(graded,opts,'referenceStartIndex','referencePieceId')
    const b=vertex(graded,opts,'referenceEndIndex','referencePieceId')
    const reference=sub(b,a),v=sub(current,anchor)
    const len=Math.hypot(v.x,v.y),rlen=Math.hypot(reference.x,reference.y)
    if(len<EPS||rlen<EPS)fail('degenerate direction')
    let direction={x:reference.x/rlen,y:reference.y/rlen}
    if(opts.kind==='keep-angle'){
      const baseA=vertex(opts.source,opts,'referenceStartIndex','referencePieceId')
      const baseB=vertex(opts.source,opts,'referenceEndIndex','referencePieceId')
      const baseAnchor=vertex(opts.source,opts,'anchorIndex')
      const baseCurrent=vertex(opts.source,opts,'pointIndex')
      const u=sub(baseB,baseA),w=sub(baseCurrent,baseAnchor)
      if(Math.hypot(u.x,u.y)<EPS||Math.hypot(w.x,w.y)<EPS)fail('degenerate base angle')
      const theta=Math.atan2(cross(u,w),dot(u,w))
      direction={x:Math.cos(theta)*direction.x-Math.sin(theta)*direction.y,y:Math.sin(theta)*direction.x+Math.cos(theta)*direction.y}
    }else if(dot(direction,v)<0)direction={x:-direction.x,y:-direction.y}
    if(mode==='xy')result={x:anchor.x+direction.x*len,y:anchor.y+direction.y*len}
    else {
      const axis=mode,other=axis==='x'?'y':'x'
      if(Math.abs(direction[other])<EPS){
        if(Math.abs(current[other]-anchor[other])>EPS)fail('axis locked outside direction')
        result={...current,[axis]:anchor[axis]+direction[axis]*len}
      }else {
        const factor=(current[other]-anchor[other])/direction[other]
        if(factor<=EPS)fail('direction conflicts with locked axis')
        result={...current,[axis]:anchor[axis]+factor*direction[axis]}
      }
    }
  }else if(opts.kind==='intersect'){
    if(!['x','y'].includes(mode))fail('intersection requires x or y mode')
    const edgeStart=vertex(graded,opts,'edgeStartIndex','edgePieceId')
    const edgeEnd=vertex(graded,opts,'edgeEndIndex','edgePieceId')
    const axis=mode,other=axis==='x'?'y':'x',denom=edgeEnd[other]-edgeStart[other]
    if(Math.abs(denom)<EPS)fail('perimeter parallel to axis')
    const t=(current[other]-edgeStart[other])/denom
    if(t< -EPS||t>1+EPS)fail('intersection outside perimeter edge')
    result={...current,[axis]:edgeStart[axis]+t*(edgeEnd[axis]-edgeStart[axis])}
    // Optional explicit internal line endpoint on target vertex.
    if(opts.lineIndex!==undefined){
      const line=p.internalLines?.[index(opts.lineIndex,p.internalLines.length,'lineIndex')]
      if(!line||!finite(line.a)||!finite(line.b))fail('invalid internal line')
      const delta=sub(line.b,line.a)
      if(Math.hypot(delta.x,delta.y)<EPS||Math.abs(cross(delta,sub(result,line.a)))>opts.toleranceCm*Math.hypot(delta.x,delta.y))fail('intersection misses internal line')
    }
  }else fail('unsupported kind')
  if(!finite(result))fail('nonfinite solution')
  return result
}
function normalizeOpts(project,opts){
  const c=context(project,opts)
  const effective={...opts,source:project,toleranceCm:c.tolerance,
    referencePieceId:opts.referencePieceId??opts.pieceId,
    edgePieceId:opts.edgePieceId??opts.pieceId,
    mode:opts.mode??'xy'}
  if(['match-length','keep-angle','parallel'].includes(opts.kind)){
    if(opts.anchorIndex===opts.pointIndex)fail('anchor and moving vertex coincide')
    vertex(project,effective,'anchorIndex')
    vertex(project,effective,'referenceStartIndex','referencePieceId')
    vertex(project,effective,'referenceEndIndex','referencePieceId')
    if(effective.referencePieceId===opts.pieceId&&[opts.referenceStartIndex,opts.referenceEndIndex].includes(opts.pointIndex))fail('constraint depends on moving vertex')
  }
  if(opts.kind==='intersect'){
    vertex(project,effective,'edgeStartIndex','edgePieceId')
    vertex(project,effective,'edgeEndIndex','edgePieceId')
    if(effective.edgePieceId===opts.pieceId&&[opts.edgeStartIndex,opts.edgeEndIndex].includes(opts.pointIndex))fail('edge depends on moving vertex')
  }
  return {c,effective}
}
function residual(actual,expected){return distance(actual,expected)}
/** Inspect the residual distance in cm at every named size; throws on invalid geometry. */
export function inspectAccuMarkGradeConstraint(project,opts){
  const {c,effective}=normalizeOpts(project,opts)
  return c.sizes.map(size=>{
    const graded=gradeProject(project,size),p=pieceAt(graded,effective.pieceId).points[c.pointIndex]
    const expected=solve(graded,effective,point(project,effective.pieceId,c.pointIndex))
    return {size,residualCm:residual(p,expected),actual:{x:p.x,y:p.y},expected:{x:expected.x,y:expected.y},passes:residual(p,expected)<=c.tolerance}
  })
}
/** Solve one explicitly chosen point for every size. Returns a defensive project copy. */
export function applyAccuMarkGradeConstraint(project,opts){
  const {c,effective}=normalizeOpts(project,opts)
  const sourcePoint=c.piece.points[c.pointIndex]
  if(sourcePoint.gradeRule?.enabled)fail('conflicting legacy grade rule')
  if(sourcePoint.industrialGradeRule){
    const rule=validateIndustrialGradeRule(sourcePoint.industrialGradeRule)
    if(JSON.stringify(rule.sizes)!==JSON.stringify(c.sizes)||rule.baseSize!==c.base)fail('existing rule size mismatch')
  }
  const coordinates=new Map()
  for(const size of c.sizes){
    const graded=gradeProject(project,size)
    const actual=pieceAt(graded,effective.pieceId).points[c.pointIndex]
    const wanted=solve(graded,effective,sourcePoint)
    if(size===c.base&&residual(wanted,sourcePoint)>c.tolerance)fail('base geometry violates constraint')
    if(sourcePoint.industrialGradeRule&&residual(wanted,actual)>c.tolerance)fail('conflicting existing industrial rule')
    coordinates.set(size,size===c.base?{x:sourcePoint.x,y:sourcePoint.y}:wanted)
  }
  const offsets=c.sizes.map(size=>({dx:coordinates.get(size).x-sourcePoint.x,dy:coordinates.get(size).y-sourcePoint.y}))
  const rule=validateIndustrialGradeRule({mode:'small-large-incremental',sizes:c.sizes,baseSize:c.base,steps:offsets.slice(1).map((v,i)=>({dx:v.dx-offsets[i].dx,dy:v.dy-offsets[i].dy}))})
  for(const size of c.sizes){
    const delta=evaluateIndustrialGradeRule(rule,size),expected=coordinates.get(size)
    if(distance({x:sourcePoint.x+delta.dx,y:sourcePoint.y+delta.dy},expected)>c.tolerance)fail('rule reconstruction mismatch')
  }
  const copy=cloneProject(project)
  const target=pieceAt(copy,effective.pieceId).points[c.pointIndex]
  target.industrialGradeRule=rule
  const preview=inspectAccuMarkGradeConstraint(copy,opts)
  if(preview.some(item=>!item.passes))fail('graded residual exceeds tolerance')
  return copy
}
