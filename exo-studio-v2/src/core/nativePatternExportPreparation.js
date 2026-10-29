// Produce a disposable ClothCraft export document. Never modify the editable project.
import {exportEdgeKeep,exportAreaTerm} from './rustExportContourKernel.js'
const copy = value => structuredClone(value)
const area = points => points.reduce((sum,p,i) => {
  const next=points[(i+1)%points.length]
  return sum+exportAreaTerm(p,next)
},0)/2

export function prepareNativePatternExport(project, {minimumEdgeCm=0.01}={}) {
  if (!(minimumEdgeCm>0) || !Number.isFinite(minimumEdgeCm)) throw Error('Invalid minimum export edge length')
  const document=copy(project)
  const mappings=new Map()
  const removed=[]
  const reversed=[]
  for(const piece of document.pieces||[]){
    const original=piece.points
    if(!Array.isArray(original)||original.length<3)continue
    const n=original.length
    // Retain original starts of sufficiently long edges; a microscopic edge
    // contributes no meaningful cutline segment and is folded into its predecessor.
    const retained=[]
    for(let i=0;i<n;i++)if(exportEdgeKeep(original[i],original[(i+1)%n],minimumEdgeCm))retained.push(i)
    if(retained.length<3)throw Error(`Panel ${piece.id} has fewer than three usable edges`)
    const oldToNew=new Map()
    const retainedSet=new Set(retained)
    retained.forEach((old,index)=>oldToNew.set(old,index))
    const missing=[]
    for(let i=0;i<n;i++)if(!retainedSet.has(i)){
      missing.push(i)
      removed.push({pieceId:piece.id,edgeIndex:i})
    }
    let points=retained.map(i=>original[i])
    const reverse=area(points)<0
    if(reverse){
      points=points.slice().reverse()
      reversed.push(piece.id)
    }
    const m=points.length
    const newCurves={}
    for(const [key,value] of Object.entries(piece.curves||{})){
      const old=Number(key)
      if(!oldToNew.has(old))continue
      const idx=oldToNew.get(old)
      // A retained edge followed by removed micro-edges is an approximate
      // straight merge; do not apply its former Bezier to the new endpoint.
      if(!retainedSet.has((old+1)%n))continue
      newCurves[reverse?(m-2-idx+m)%m:idx]=copy(value)
    }
    piece.points=points
    if(piece.curves)piece.curves=newCurves
    mappings.set(piece.id,{oldToNew,reverse,count:m,missing:new Set(missing)})
    // Edge-indexed construction metadata must reference the new directed edge.
    for(const key of ['notches','topstitches','edgeSeamAllowances']){
      if(!Array.isArray(piece[key]))continue
      piece[key]=piece[key].filter(item=>!Number.isInteger(item.edgeIndex)||oldToNew.has(item.edgeIndex)).map(item=>{
        if(!Number.isInteger(item.edgeIndex))return item
        const idx=oldToNew.get(item.edgeIndex)
        item.edgeIndex=reverse?(m-2-idx+m)%m:idx
        if(reverse && Number.isFinite(item.t))item.t=1-item.t
        return item
      })
    }
  }
  document.seams=(document.seams||[]).filter(seam=>{
    for(const side of [seam.a,seam.b]){
      const map=mappings.get(side?.pieceId)
      if(map && !map.oldToNew.has(side.edgeIndex))return false
    }
    return true
  }).map(seam=>{
    let changed=0
    for(const side of [seam.a,seam.b]){
      const map=mappings.get(side?.pieceId)
      if(!map)continue
      const idx=map.oldToNew.get(side.edgeIndex)
      side.edgeIndex=map.reverse?(map.count-2-idx+map.count)%map.count:idx
      if(map.reverse){
        const start=side.startT??0,end=side.endT??1
        if('startT' in side || 'endT' in side){side.startT=1-end;side.endT=1-start}
        changed++
      }
    }
    if(changed%2)seam.reverseB=!Boolean(seam.reverseB)
    return seam
  })
  return {document, report:{reversed,removed,removedSeams:(project.seams?.length||0)-document.seams.length}}
}
