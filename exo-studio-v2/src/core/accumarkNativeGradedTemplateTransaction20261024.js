import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023} from './accumarkNativeGradedSewnSeamQA20261023.js'

const fail=(reason,issues=[])=>({ok:false,reason,issues,manufacturingApproved:false,nativeCommitted:false})
const blocked='Native open exists but does not enforce a conditional source revision; proposal requires an atomic revision guard and reload validation'
const forbidden=new Set(['__proto__','prototype','constructor'])

// Descriptor copy avoids accessor execution, inherited toJSON hooks, cycles,
// invisible properties and symbol metadata that JSON would silently discard.
function safeCopy(value,active=new Set(),depth=0,budget={remaining:100000}) {
  if(--budget.remaining<0||depth>48)throw Error('Source exceeds transaction safety bounds')
  if(value===null||typeof value==='string'||typeof value==='boolean')return value
  if(typeof value==='number'&&Number.isFinite(value))return value
  if(!value||typeof value!=='object')throw Error('Source contains unsupported value')
  if(active.has(value))throw Error('Source contains cyclic references')
  const array=Array.isArray(value)
  if(!array&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('Source has unsupported prototype')
  if(array&&Object.getPrototypeOf(value)!==Array.prototype)throw Error('Source array has unsupported prototype')
  const descriptors=Object.getOwnPropertyDescriptors(value)
  if(Reflect.ownKeys(value).some(key=>typeof key==='symbol'))throw Error('Source has hidden symbol metadata')
  active.add(value)
  let result
  if(array){
    const length=descriptors.length?.value
    if(!Number.isSafeInteger(length)||length>10000)throw Error('Invalid source array length')
    result=[]
    for(let i=0;i<length;i++){
      const d=descriptors[i]
      if(!d||!d.enumerable||!('value'in d))throw Error('Sparse or accessor source array')
      result.push(safeCopy(d.value,active,depth+1,budget))
    }
    if(Reflect.ownKeys(descriptors).some(k=>k!=='length'&&(!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=length)))
      throw Error('Source array has additional properties')
  }else{
    result=Object.create(null)
    for(const [key,d] of Object.entries(descriptors)){
      if(forbidden.has(key)||!d.enumerable||!('value'in d))throw Error('Hidden, accessor or unsafe source field')
      result[key]=safeCopy(d.value,active,depth+1,budget)
    }
  }
  active.delete(value)
  return result
}
const xy=v=>Array.isArray(v)&&v.length===2&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=10)
const signedArea=points=>points.reduce((s,p,i)=>s+p[0]*points[(i+1)%points.length][1]-p[1]*points[(i+1)%points.length][0],0)/2
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
function intersects(a,b,c,d){
  const e=1e-12,ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b)
  if(Math.abs(ab1)<e||Math.abs(ab2)<e||Math.abs(cd1)<e||Math.abs(cd2)<e)
    throw Error('Polygon edges touch or overlap within tolerance')
  return (ab1>0)!==(ab2>0)&&(cd1>0)!==(cd2>0)
}
function polygonQA(source,graded,panelId,size){
  const a=source.points,b=graded.points
  if(!Array.isArray(b)||b.length!==a.length||b.length<3||b.length>10000||!b.every(xy))
    throw Error(`${panelId}/${size}: invalid or out-of-bounds metre vertices`)
  if(JSON.stringify(source.edges)!==JSON.stringify(graded.edges))
    throw Error(`${panelId}/${size}: edge topology changed`)
  const areaA=signedArea(a),areaB=signedArea(b)
  if(Math.abs(areaA)<1e-10||Math.abs(areaB)<1e-10||Math.sign(areaA)!==Math.sign(areaB))
    throw Error(`${panelId}/${size}: degenerate or reversed winding`)
  for(let i=0;i<b.length;i++){
    const p=b[i],q=b[(i+1)%b.length]
    if(Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5)
      throw Error(`${panelId}/${size}: collapsed edge`)
    for(let j=i+1;j<b.length;j++){
      if(j===i+1||(i===0&&j===b.length-1))continue
      if(intersects(p,q,b[j],b[(j+1)%b.length]))
        throw Error(`${panelId}/${size}: self-intersecting polygon`)
    }
  }
}

// Cubic curves are part of the physical boundary. Check the sampled boundary,
// including crossings between the curved and straight edges, for every size.
// Free-curve derivative conventions have not been confirmed against native Rust.
function curvedBoundaryQA(source,graded,panelId,size){
  for(const [edge,knots] of Object.entries(source.free_curve_points||{})){
    let previous=0
    for(const knot of knots){
      if(!(knot.t>previous&&knot.t<1))throw Error(`${panelId}/${size}: unsorted or repeated free-curve knots on ${edge}`)
      previous=knot.t
    }
  }
  const changed=source.points.some((p,i)=>p.some((n,k)=>n!==graded.points[i][k]))
  const free=Object.values(source.free_curve_points||{}).some(knots=>knots.length)
  if(free&&changed)throw Error(`${panelId}/${size}: free-curve grading requires native derivative verification`)
  const cubic=Object.keys(source.curves||{}).length>0
  if(!cubic)return
  const makeBoundary=polygon=>{
    const boundary=[]
    const count=polygon.points.length
    if(count*32>1500)throw Error(`${panelId}/${size}: curved boundary exceeds bounded sampling limit`)
    for(let i=0;i<count;i++){
      const p=polygon.points[i],q=polygon.points[(i+1)%count]
      const controls=polygon.curves?.[polygon.edges[i]]
      if(controls&&!controls.every(xy))throw Error(`${panelId}/${size}: invalid cubic control bounds`)
      for(let j=0;j<(controls?32:1);j++){
        const t=controls?j/32:0,u=1-t
        const point=controls?[0,1].map(k=>u*u*u*p[k]+3*u*u*t*controls[0][k]+3*u*t*t*controls[1][k]+t*t*t*q[k]):p
        if(!xy(point))throw Error(`${panelId}/${size}: invalid curved boundary coordinates`)
        boundary.push(point)
      }
    }
    return boundary
  }
  const verify=polygon=>{
    const b=makeBoundary(polygon),n=b.length,area=signedArea(b)
    if(Math.abs(area)<1e-10)throw Error(`${panelId}/${size}: collapsed curved boundary`)
    for(let i=0;i<n;i++){
      const a=b[i],end=b[(i+1)%n]
      if(Math.hypot(a[0]-end[0],a[1]-end[1])<1e-7)
        throw Error(`${panelId}/${size}: collapsed sampled curve segment`)
      for(let j=i+2;j<n;j++){
        if(i===0&&j===n-1)continue
        if(intersects(a,end,b[j],b[(j+1)%n]))
          throw Error(`${panelId}/${size}: curved boundary self-intersects`)
      }
    }
    return area
  }
  const a=verify(source),b=verify(graded)
  if(Math.sign(a)!==Math.sign(b))throw Error(`${panelId}/${size}: curved boundary winding reversed`)
}

/** Full-size geometry transaction proposal. No mutation or implicit native commit. */
export function proposeAccuMarkNativeGradedTemplateTransaction20261024(snapshot,ruleSet,{selectedSize,allowNamedSizes=false}={}){
  try{
    const source=safeCopy(snapshot),rules=safeCopy(ruleSet)
    // Downstream legacy FNV compiler JSON stringifies array/object literals.
    // An inherited Object.prototype.toJSON would execute even on safe source.
    if('toJSON' in Object.prototype||'toJSON' in Array.prototype)
      throw Error('Inherited JSON serialization hooks are unsupported')
    if(!source?.template||!Array.isArray(source.template.panels)||!Array.isArray(rules?.sizes))
      return fail('Missing native template or complete grade size rules')
    if(!allowNamedSizes&&(rules.sizes.length!==6||rules.sizes.some((size,index)=>size!==['XS','S','M','L','XL','XXL'][index])))
      return fail('Native transaction requires complete ordered XS–XXL six-size rules')
    if(allowNamedSizes&&(rules.sizes.length<2||rules.sizes.length>24||
      rules.sizes.some(s=>typeof s!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(s))||
      new Set(rules.sizes).size!==rules.sizes.length||!rules.sizes.includes(rules.baseSize)))
      return fail('Native schema v2 requires 2–24 distinct safe named sizes')
    if(!selectedSize||!rules.sizes.includes(selectedSize))return fail('Selected size must exist in native size rules')
    const result=compileAccuMarkNativeRuleSizeRun(source,rules,{selectedSize})
    if(!result.ok)return fail(result.reason,result.issues||[])
    // A pattern may legitimately have no sewn partners yet. Keep its graded
    // geometry catalog editable, while any actual sewn relationship must pass
    // all-size physical-length QA. An empty array is not sewing evidence.
    if(source.template.seams!==undefined&&!Array.isArray(source.template.seams))
      return fail('Invalid native sewn seam collection')
    if(source.template.seams?.length){
      const sewn=inspectAccuMarkNativeGradedSewnSeamQA20261023(source,rules,{allowNamedSizes})
      if(!sewn.ok)return fail('Sewn seam validation failed: '+(sewn.reason||sewn.issues?.[0]?.code||'graded seam lengths differ'),sewn.issues||[])
    }
    const templates=Object.create(null), QA=[]
    const sourcePanels=source.template.panels
    for(const size of rules.sizes){
      const template=safeCopy(source.template)
      for(let i=0;i<template.panels.length;i++){
        const panel=template.panels[i],original=sourcePanels[i]
        const entry=result.byPanel?.[panel.id]
        if(!entry?.sizeRun?.[size])throw Error(`Incomplete native graded geometry for ${panel.id}/${size}`)
        const graded=entry.sizeRun[size].polygon
        polygonQA(original.polygon,graded,panel.id,size)
        curvedBoundaryQA(original.polygon,graded,panel.id,size)
        panel.polygon=safeCopy(graded)
        QA.push({panelId:panel.id,size,pointCount:graded.points.length,units:'m',geometryChecked:true,curvesExact:entry.accuracy==='exact',cubicBoundarySampled:Object.keys(original.polygon.curves||{}).length>0})
      }
      templates[size]=template
    }
    return {ok:true,status:'validated-native-import-proposal',nativeCommitted:false,
      nativeImportAvailable:false,commitEligible:false,
      commitCondition:'A single atomic native operation must compare captured session revision with the current live revision before opening the exact complete patched FittingProject; Rust open currently resets revision to zero and has no compare-and-swap.',
      nativeImportBlocker:blocked,manufacturingApproved:false,
      selectedSize,selectedTemplate:templates[selectedSize],templatesBySize:templates,
      proposedSnapshot:Object.assign(safeCopy(source),{template:safeCopy(templates[selectedSize]),state:null,mesh_signature:null}),
      originalNativeTemplate:safeCopy(source.template),qa:QA,
      provenance:{ruleSchema:rules.schema,templateFingerprint:rules.templateFingerprint,
        sourceRevision:source.revision??null,units:'m',source:'independent-point-rules-native-import-proposal'}}
  }catch(e){return fail(e.message)}
}
