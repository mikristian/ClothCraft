import {preflightNativeSewing20261025} from './nativeSewingPreflight20261025.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const rejected=reason=>({ok:false,reason,manufacturingApproved:false})
const validRef=ref=>ref&&typeof ref.panel==='string'&&ref.panel.length>0&&
  typeof ref.edge==='string'&&ref.edge.length>0&&
  (ref.range===undefined||(Array.isArray(ref.range)&&ref.range.length===2&&
    ref.range.every(Number.isFinite)&&ref.range[0]>=0&&ref.range[1]<=1&&
    ref.range[1]-ref.range[0]>=1e-9))
const normalize=ref=>({panel:ref.panel,edge:ref.edge,range:ref.range?[...ref.range]:[0,1]})
const same=(a,b)=>a.panel===b.panel&&a.edge===b.edge
const overlaps=(a,b)=>same(a,b)&&Math.max(a.range[0],b.range[0])<Math.min(a.range[1],b.range[1])-1e-12

function validateOptions(snapshot,refs,{reverse,ease,expectedRevision}){
  if(!Array.isArray(snapshot?.template?.panels)||!Array.isArray(snapshot?.template?.seams))
    throw Error('Current native garment snapshot is required')
  if(typeof reverse!=='boolean'||typeof ease!=='boolean')throw Error('Invalid reverse or ease option')
  if(expectedRevision!==undefined&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||snapshot.revision!==expectedRevision))
    throw Error('Stale sewing selection: native revision changed')
  if(refs.some(ref=>!validRef(ref)))throw Error('Choose existing boundaries with valid finite sewing intervals')
  return refs.map(normalize)
}

function length(snapshot,ref){
  const panel=snapshot.template.panels.find(p=>p.id===ref.panel)
  if(!panel?.polygon)throw Error(`Missing physical sewing panel ${ref.panel}`)
  const measured=nativeRustEdgeLength20261023(panel.polygon,ref.edge)
  if(!measured.ok||!(measured.totalLengthM>0))throw Error(measured.reason||`Invalid physical boundary ${ref.panel}/${ref.edge}`)
  return measured.totalLengthM*(ref.range[1]-ref.range[0])
}

function planPairs(snapshot,requested,{reverse,ease,expectedRevision},kind){
  const inventory=[...snapshot.template.seams]
  const pairs=[]
  let maxMismatchMm=0
  let requiresEase=false
  for(const [a,b] of requested){
    // Existing seams and earlier proposed pairs share one virtual inventory.
    const candidate={...snapshot,template:{...snapshot.template,seams:inventory}}
    const check=preflightNativeSewing20261025(candidate,{a,b,reverse,ease,expectedRevision})
    if(!check.ok)throw Error(check.reason)
    // A single native batch cannot safely contain a repeated material interval.
    for(const previous of pairs){
      if([previous.a,previous.b].some(end=>overlaps(end,a)||overlaps(end,b)))
        throw Error('Proposed sewing pairs overlap in material space')
    }
    pairs.push({a:check.command.a,b:check.command.b,reverse,ease})
    inventory.push({a,b})
    maxMismatchMm=Math.max(maxMismatchMm,check.mismatchMm)
    requiresEase ||= check.requiresEase
  }
  if(!pairs.length)throw Error('Select at least one sewing pair')
  const command=kind==='SewMany'?{kind,pairs}:
    {kind,original:pairs[0],mirrored:pairs[1]}
  return {ok:true,command,pairs,sourceRevision:snapshot.revision??null,
    mismatchMm:maxMismatchMm,requiresEase,manufacturingApproved:false,
    warning:requiresEase?'Explicit easing requires physical stitch validation.':
      'Material intervals passed provisional preflight; stitch and production verification remains required.'}
}

/** Atomic one-to-many material-space sewing: targets are sewn in the supplied order. */
export function planNativeManySewing20261025(snapshot,{primary,targets,reverse=false,ease=false,expectedRevision}={}){
  try{
    if(!Array.isArray(targets)||!targets.length||targets.length>128)
      throw Error('Select one or more target boundaries (maximum 128)')
    const [first,...secondary]=validateOptions(snapshot,[primary,...targets],{reverse,ease,expectedRevision})
    if(secondary.some(ref=>same(ref,first)))throw Error('A target must be a different physical boundary')
    const lengths=secondary.map(ref=>length(snapshot,ref))
    if(lengths.some(x=>!Number.isFinite(x)||x<.0001))throw Error('Target material interval is shorter than 0.1 mm')
    const total=lengths.reduce((a,b)=>a+b,0)
    if(!(total>0))throw Error('Target cutline length is invalid')
    const span=first.range[1]-first.range[0]
    const boundaries=[first.range[0]]
    let cumulative=0
    for(let i=0;i<lengths.length-1;i++){
      cumulative+=lengths[i]
      boundaries.push(first.range[0]+span*cumulative/total)
    }
    boundaries.push(first.range[1])
    const requests=secondary.map((b,i)=>[
      {...first,range:[boundaries[i],boundaries[i+1]]},b])
    if(requests.some(([a])=>a.range[1]-a.range[0]<1e-9))
      throw Error('Primary material partition is too small to sew safely')
    return planPairs(snapshot,requests,{reverse,ease,expectedRevision},'SewMany')
  }catch(error){return rejected(error.message||String(error))}
}

function oppositeSuffix(name){
  const match=name.match(/^(.*?)(-left|-right)$/i)
  return match?match[1]+(match[2].toLowerCase()==='-left'?'-right':'-left'):null
}

function mirrorBoundary(ref,panels){
  const panel=panels.find(candidate=>candidate.id===ref.panel)
  if(!panel)throw Error(`Missing source panel ${ref.panel}`)
  const edgeMirror=oppositeSuffix(ref.edge)
  const panelMirror=oppositeSuffix(ref.panel)
  if(edgeMirror){
    if(!Array.isArray(panel.polygon?.edges)||!panel.polygon.edges.includes(edgeMirror))
      throw Error(`Missing mirrored edge ${ref.panel}/${edgeMirror}`)
    return {...ref,edge:edgeMirror}
  }
  if(panelMirror){
    const target=panels.find(candidate=>candidate.id===panelMirror)
    if(!target)throw Error(`Missing mirrored panel ${panelMirror}`)
    if(!Array.isArray(target.polygon?.edges)||!target.polygon.edges.includes(ref.edge))
      throw Error(`Missing mirrored edge ${panelMirror}/${ref.edge}`)
    return {...ref,panel:panelMirror}
  }
  throw Error(`Cannot identify explicit left/right mirror for ${ref.panel}/${ref.edge}`)
}

/** Mirror an explicit left/right edge on one panel, or a corresponding panel ID. */
export function planNativeSymmetricSewing20261025(snapshot,{a,b,reverse=false,ease=false,expectedRevision}={}){
  try{
    const [first,second]=validateOptions(snapshot,[a,b],{reverse,ease,expectedRevision})
    const panels=snapshot.template.panels
    if(new Set(panels.map(p=>p.id)).size!==panels.length)throw Error('Duplicate native panel IDs')
    const mirroredA=mirrorBoundary(first,panels)
    const mirroredB=mirrorBoundary(second,panels)
    if(same(first,second)||same(mirroredA,mirroredB))throw Error('Cannot sew a physical edge to itself')
    if([first,second].some(x=>[mirroredA,mirroredB].some(y=>overlaps(x,y))))
      throw Error('Original and mirrored material intervals overlap')
    return planPairs(snapshot,[[first,second],[mirroredA,mirroredB]],
      {reverse,ease,expectedRevision},'SewSymmetric')
  }catch(error){return rejected(error.message||String(error))}
}
