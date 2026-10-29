import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

// Material-space sewing preflight. These are the exact BoundaryRef fields
// consumed by Rust Command::Sew; never substitute a visual chord or a cubic t.
const fail=reason=>({ok:false,reason,manufacturingApproved:false})
const validRange=range=>Array.isArray(range)&&range.length===2&&range.every(x=>typeof x==='number'&&Number.isFinite(x))&&
  range[0]>=0&&range[1]-range[0]>=1e-9&&range[1]<=1
const sameBoundary=(a,b)=>a?.panel===b?.panel&&a?.edge===b?.edge
const overlap=(a,b)=>Math.max(a[0],b[0])<Math.min(a[1],b[1])-1e-12

export function preflightNativeSewing20261025(snapshot,{a,b,reverse=false,ease=false,
  toleranceMm=2,expectedRevision}={}){
  try{
    const template=snapshot?.template
    if(!template||!Array.isArray(template.panels)||!Array.isArray(template.seams))
      throw Error('Current native garment snapshot is required')
    if(expectedRevision!==undefined&&(!Number.isSafeInteger(expectedRevision)||
      expectedRevision<0||snapshot.revision!==expectedRevision))
      throw Error('Stale sewing selection: native revision changed')
    if(template.panels.length>128||template.seams.length>256)
      throw Error('Native sewing inventory exceeds review limits')
    const ids=new Set()
    for(const panel of template.panels){
      if(typeof panel?.id!=='string'||!panel.id||ids.has(panel.id))
        throw Error('Native panel inventory contains duplicate or invalid IDs')
      ids.add(panel.id)
    }
    if(typeof reverse!=='boolean'||typeof ease!=='boolean'||!Number.isFinite(toleranceMm)||
      toleranceMm<0||toleranceMm>5)throw Error('Invalid sewing direction, ease, or tolerance')
    for(const edge of [a,b]){
      if(typeof edge?.panel!=='string'||!edge.panel||typeof edge.edge!=='string'||!edge.edge||
        !validRange(edge.range))throw Error('Choose an existing boundary with a finite sewing interval')
    }
    if(sameBoundary(a,b))throw Error('Choose two different physical boundaries')
    const seamIds=new Set()
    for(const seam of template.seams){
      if(!seam||!seam.a||!seam.b||
        (seam.id!==undefined&&(typeof seam.id!=='string'||!seam.id||seamIds.has(seam.id))))
        throw Error('Existing native seam inventory is malformed')
      if(seam.id!==undefined)seamIds.add(seam.id)
      for(const end of [seam.a,seam.b]){
        if(typeof end.panel!=='string'||!ids.has(end.panel)||
          typeof end.edge!=='string'||!end.edge||!validRange(end.range))
          throw Error('Existing native seam has invalid boundary or interval')
      }
      if(sameBoundary(seam.a,seam.b))throw Error('Existing native seam joins the same boundary')
    }
    for(let i=0;i<template.seams.length;i++)for(let j=i+1;j<template.seams.length;j++){
      for(const x of [template.seams[i].a,template.seams[i].b])
        for(const y of [template.seams[j].a,template.seams[j].b])
          if(sameBoundary(x,y)&&overlap(x.range,y.range))
            throw Error('Existing native seams overlap: repair sewing inventory first')
    }
    const sides=[a,b].map(ref=>{
      const candidates=template.panels.filter(p=>p.id===ref.panel)
      if(candidates.length!==1||!candidates[0].polygon)
        throw Error('A sewing panel no longer exists')
      const measured=nativeRustEdgeLength20261023(candidates[0].polygon,ref.edge)
      if(!measured.ok||!(measured.totalLengthM>0))
        throw Error(measured.reason||'Sewn cutline has no measurable physical length')
      for(const seam of template.seams){
        for(const end of [seam.a,seam.b]){
          if(sameBoundary(end,ref)){
            if(!validRange(end.range))throw Error('Existing sewn interval is malformed')
            if(overlap(end.range,ref.range))
              throw Error(`${ref.panel}/${ref.edge} has an existing overlapping sewn interval`)
          }
        }
      }
      return{panel:ref.panel,edge:ref.edge,range:[...ref.range],
        fullLengthM:measured.totalLengthM,
        sewnLengthM:measured.totalLengthM*(ref.range[1]-ref.range[0])}
    })
    if(sides.some(side=>!Number.isFinite(side.sewnLengthM)||side.sewnLengthM<.0001))
      throw Error('Selected sewn interval is shorter than 0.1 mm')
    const mismatchMm=Math.abs(sides[0].sewnLengthM-sides[1].sewnLengthM)*1000
    if(!Number.isFinite(mismatchMm))throw Error('Sewn length mismatch is not finite')
    const requiresEase=mismatchMm>toleranceMm
    if(requiresEase&&!ease)throw Error(
      `Sewn edges differ by ${mismatchMm.toFixed(2)} mm (reference ${toleranceMm.toFixed(1)} mm). Choose a matching edge or explicitly enable easing.`)
    return{ok:true,manufacturingApproved:false,sourceRevision:snapshot.revision??null,requiresEase,mismatchMm,
      measuredMm:sides.map(x=>x.sewnLengthM*1000),sides,
      command:{kind:'Sew',a:{panel:a.panel,edge:a.edge,side:'top',range:[...a.range]},
        b:{panel:b.panel,edge:b.edge,side:'top',range:[...b.range]},reverse,ease},
      warning:requiresEase?'Easing was explicitly selected. Fullness distribution and manufactured seam correspondence still need validation.':
        'Lengths are within the configured provisional 2 mm tolerance; seam direction and stitch validation are still required.'}
  }catch(error){return fail(error.message||String(error))}
}
