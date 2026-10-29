// Opt-in, transactional research adapter for independently certified material
// edge flips. Rebuilds the structural/bend graph and collision exclusions on
// a CLONE, never a live garment. No solver or physical-fit certification.
import {auditSingleMaterialEdgeFlip} from './materialRetriangulationResearch.js'

const pair=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const springK=s=>12000+488000*Math.pow(s,4)
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])

function topology(piece,faces){
  const edges=new Map()
  for(const face of faces){
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
       face.some(i=>!Number.isInteger(i)||i<0||i>=piece.particleIndices.length))
      throw new RangeError('Invalid research face topology')
    for(const [a,b,opposite] of [[face[0],face[1],face[2]],
      [face[1],face[2],face[0]],[face[2],face[0],face[1]]]){
      const id=pair(a,b)
      if(!edges.has(id))edges.set(id,{a,b,opposites:[]})
      edges.get(id).opposites.push(opposite)
      if(edges.get(id).opposites.length>2)
        throw new RangeError('Nonmanifold research constraint graph')
    }
  }
  const structural=new Map(),bend=new Map()
  for(const [id,entry] of edges){
    structural.set(pair(piece.particleIndices[entry.a],piece.particleIndices[entry.b]),
      {a:entry.a,b:entry.b,id})
    if(entry.opposites.length===2){
      const [a,b]=entry.opposites
      if(a===b)throw new RangeError('Degenerate bend opposites')
      // Two distinct hinges can share opposite particles. Preserve both
      // bend springs, keyed by the material hinge rather than its endpoints.
      bend.set(id,{a,b,id})
    }
  }
  return {structural,bend}
}

function directional(piece,a,b){
  const left=piece.flatVerticesM[a],right=piece.flatVerticesM[b]
  const dx=right[0]-left[0],dy=right[1]-left[1]
  const dist=Math.hypot(dx,dy)
  if(!Number.isFinite(dist)||dist<1e-12)throw new RangeError('Degenerate material spring')
  const theta=piece.grainAngleDeg*Math.PI/180
  const ux=dx/dist,uy=dy/dist
  const warp=Math.abs(ux*Math.sin(theta)+uy*Math.cos(theta))
  const weft=Math.abs(ux*Math.cos(theta)-uy*Math.sin(theta))
  const stretch=warp*warp*Math.max(0,piece.fabric.stretchWarp)+
    weft*weft*Math.max(0,piece.fabric.stretchWeft)
  return {dist,factor:1-stretch*.55}
}

function exclusions(payload){
  const result=new Set()
  for(const c of payload.constraints){
    if(!Number.isInteger(c.a)||!Number.isInteger(c.b)||c.a===c.b||
       c.a<0||c.b<0||c.a>=payload.particles.length||c.b>=payload.particles.length)
      throw new RangeError('Invalid native constraint endpoints')
    result.add(pair(c.a,c.b))
  }
  for(const seam of payload.virtualSeams||[]){
    for(const a of seam.sourceIndices)for(const b of seam.targetIndices){
      if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||
         a>=payload.particles.length||b>=payload.particles.length)
        throw new RangeError('Invalid virtual seam exclusion')
      if(a!==b)result.add(pair(a,b))
    }
  }
  const maxThickness=payload.settings?.maxThickness
  const margin=payload.settings?.selfCollisionMargin
  if(!Number.isFinite(maxThickness)||maxThickness<0||
     !Number.isFinite(margin)||margin<0)
    throw new RangeError('Missing collision-neighbor parameters')
  const neighbor=Math.max(.014,Math.max(.004,maxThickness*2+margin)*1.8)
  for(const piece of payload.pieces){
    const ids=piece.particleIndices,flat=piece.flatVerticesM
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)
      if(length(flat[i],flat[j])<=neighbor)result.add(pair(ids[i],ids[j]))
  }
  return result
}

export function rebuildNativeResearchFlipConstraintGraph(reference,flippedFacesByPiece,{
  protectedEdgesByPiece={},maxChangedPanels=2,
}={}){
  if(!Array.isArray(reference?.pieces)||!Array.isArray(reference?.particles)||
     !Array.isArray(reference?.constraints)||!Array.isArray(reference?.collisionExclusions)||
     !flippedFacesByPiece||typeof flippedFacesByPiece!=='object'||
     Array.isArray(flippedFacesByPiece)||!protectedEdgesByPiece||
     typeof protectedEdgesByPiece!=='object'||Array.isArray(protectedEdgesByPiece)||
     !Number.isInteger(maxChangedPanels)||maxChangedPanels<1||maxChangedPanels>4)
    throw new TypeError('Invalid research constraint rebuild inputs')
  const ids=Object.keys(flippedFacesByPiece)
  if(ids.length<1||ids.length>maxChangedPanels||new Set(ids).size!==ids.length)
    throw new RangeError('Invalid bounded changed-panel count')
  const known=new Set(reference.pieces.map(p=>p.id))
  if(ids.some(id=>!known.has(id))||Object.keys(protectedEdgesByPiece).some(id=>!known.has(id)))
    throw new RangeError('Unknown research panel')
  const oldExclusions=new Set(reference.collisionExclusions.map(e=>{
    if(!Array.isArray(e)||e.length!==2||e.some(i=>!Number.isInteger(i)))
      throw new RangeError('Malformed native collision exclusion')
    return pair(...e)
  }))
  const computed=exclusions(reference)
  if(oldExclusions.size!==computed.size||[...oldExclusions].some(e=>!computed.has(e)))
    throw new Error('Native collision exclusions do not match source graph')
  const originalStructural=new Map(),originalBend=new Map()
  for(const c of reference.constraints){
    if(!['structural','bend'].includes(c.type))continue
    const id=pair(c.a,c.b)
    if(c.type==='structural'&&originalStructural.has(id))
      throw new Error('Duplicate native structural spring')
    if(!Number.isFinite(c.rest)||c.rest<=0||
       !Number.isFinite(c.sourceStiffness)||c.sourceStiffness<=0||
       !Number.isFinite(c.stiffness)||c.stiffness<=0)
      throw new RangeError('Invalid native spring properties')
    if(c.type==='structural')originalStructural.set(id,c)
  }
  const next=structuredClone(reference),changed=[]
  const owned=new Set()
  for(const piece of reference.pieces){
    if(!Array.isArray(piece.particleIndices)||!Array.isArray(piece.flatVerticesM)||
       piece.particleIndices.length!==piece.flatVerticesM.length||
       !Number.isFinite(piece.grainAngleDeg)||
       !Number.isFinite(piece.fabric?.stretchWarp)||
       !Number.isFinite(piece.fabric?.stretchWeft)||
       piece.flatVerticesM.some(p=>!finite(p)||Math.abs(p[2])>1e-12))
      throw new RangeError('Invalid or nonplanar material coordinates')
    for(const i of piece.particleIndices){
      if(!Number.isInteger(i)||i<0||i>=reference.particles.length||owned.has(i))
        throw new RangeError('Shared or invalid native particle index')
      owned.add(i)
    }
  }
  if(owned.size!==reference.particles.length)
    throw new RangeError('Unowned native particle')
  const oldExpected={structural:new Set(),bend:new Set()}
  for(const piece of reference.pieces){
    const old=topology(piece,piece.faces)
    for(const id of old.structural.keys()){
      if(oldExpected.structural.has(id))throw new Error('Overlapping panel topology')
      oldExpected.structural.add(id)
    }
    const particles=new Set(piece.particleIndices)
    const actual=reference.constraints.filter(c=>c.type==='bend'&&
      particles.has(c.a)&&particles.has(c.b))
    const expected=[...old.bend]
    if(actual.length!==expected.length)
      throw new Error('Stale baseline bend constraint count')
    for(let i=0;i<expected.length;i++){
      const [hinge,edge]=expected[i],c=actual[i]
      if(pair(c.a,c.b)!==pair(piece.particleIndices[edge.a],piece.particleIndices[edge.b]))
        throw new Error('Stale baseline bend constraint order')
      originalBend.set(`${piece.id}/${hinge}`,c)
      oldExpected.bend.add(`${piece.id}/${hinge}`)
    }
  }
  if(originalStructural.size!==oldExpected.structural.size||
     [...originalStructural.keys()].some(id=>!oldExpected.structural.has(id)))
    throw new Error('Stale baseline structural constraint graph')
  for(const piece of reference.pieces){
    if(!ids.includes(piece.id))continue
    const replacement=flippedFacesByPiece[piece.id]
    const vertices=piece.flatVerticesM.map(p=>[p[0]*100,p[1]*100])
    const cert=auditSingleMaterialEdgeFlip({vertices,faces:piece.faces},
      {vertices,faces:replacement},{protectedEdges:protectedEdgesByPiece[piece.id]||[]})
    if(!cert.approved)throw new Error('Unapproved material edge flip')
    const old=topology(piece,piece.faces),fresh=topology(piece,replacement)
    let base=null,bendStiffness=null
    for(const [id,edge] of old.structural){
      const c=originalStructural.get(id),d=directional(piece,edge.a,edge.b)
      if(Math.abs(c.rest-d.dist)>1e-9||d.factor<=0)
        throw new Error('Non-isometric spring rest or unsupported material shrink')
      const inferred=c.sourceStiffness/d.factor
      if(base===null)base=inferred
      else if(Math.abs(base-inferred)>1e-7)
        throw new Error('Ambiguous directional spring stiffness')
      if(Math.abs(c.stiffness-springK(c.sourceStiffness))>1e-5)
        throw new Error('Native spring stiffness mapping mismatch')
    }
    for(const [id,edge] of old.bend){
      const c=originalBend.get(`${piece.id}/${id}`),
        d=length(piece.flatVerticesM[edge.a],piece.flatVerticesM[edge.b])
      if(Math.abs(c.rest-d)>1e-9)
        throw new Error('Non-isometric bend rest length')
      if(bendStiffness===null)bendStiffness=c.sourceStiffness
      else if(Math.abs(bendStiffness-c.sourceStiffness)>1e-9)
        throw new Error('Ambiguous bend stiffness')
      if(Math.abs(c.stiffness-springK(c.sourceStiffness))>1e-5)
        throw new Error('Native bend stiffness mapping mismatch')
    }
    if(base===null||bendStiffness===null)
      throw new Error('Insufficient spring calibration evidence')
    const global=new Set(piece.particleIndices)
    next.constraints=next.constraints.filter(c=>
      !(['structural','bend'].includes(c.type)&&global.has(c.a)&&global.has(c.b)))
    const add=(kind,entries,original)=>{
      for(const [id,edge] of entries){
        const previous=kind==='bend'?original.get(`${piece.id}/${id}`):original.get(id)
        if(previous&&pair(previous.a,previous.b)===
           pair(piece.particleIndices[edge.a],piece.particleIndices[edge.b])){
          next.constraints.push({...previous});continue
        }
        const rest=length(piece.flatVerticesM[edge.a],piece.flatVerticesM[edge.b])
        const normalized=kind==='structural'?
          Math.max(.001,Math.min(.9999,base*directional(piece,edge.a,edge.b).factor)):
          bendStiffness
        next.constraints.push({type:kind,a:piece.particleIndices[edge.a],
          b:piece.particleIndices[edge.b],rest,stiffness:springK(normalized),
          sourceStiffness:normalized,seamId:null})
      }
    }
    add('structural',fresh.structural,originalStructural)
    add('bend',fresh.bend,originalBend)
    next.pieces.find(p=>p.id===piece.id).faces=replacement.map(f=>f.slice())
    changed.push({panelId:piece.id,certificate:cert,
      removedStructural:[...old.structural.keys()].filter(k=>!fresh.structural.has(k)),
      addedStructural:[...fresh.structural.keys()].filter(k=>!old.structural.has(k)),
      changedBend:[...fresh.bend].filter(([k,e])=>{
        const prior=old.bend.get(k)
        return !prior||pair(prior.a,prior.b)!==pair(e.a,e.b)
      }).length})
  }
  const newExclusions=exclusions(next)
  next.collisionExclusions=[...newExclusions].map(id=>id.split(':').map(Number))
  // Verify the reconstructed graph independently from the actual new faces.
  const check=new Map(),bends=new Map()
  for(const c of next.constraints){
    const target=c.type==='structural'?check:c.type==='bend'?bends:null
    if(!target)continue
    const id=pair(c.a,c.b)
    if(c.type==='structural'&&target.has(id))throw new Error('Duplicate rebuilt structural spring')
    target.set(id,(target.get(id)||0)+1)
  }
  const expected={structural:new Map(),bend:new Map()}
  for(const piece of next.pieces){
    const topo=topology(piece,piece.faces)
    for(const [kind,entries] of Object.entries(topo))for(const edge of entries.values()){
      const id=pair(piece.particleIndices[edge.a],piece.particleIndices[edge.b])
      expected[kind].set(id,(expected[kind].get(id)||0)+1)
    }
  }
  for(const [kind,map] of [['structural',check],['bend',bends]])
    if(map.size!==expected[kind].size||[...map].some(([id,n])=>expected[kind].get(id)!==n))
      throw new Error(`Incomplete rebuilt ${kind} graph`)
  return {candidate:next,changed,constraintsRegenerated:true,
    collisionExclusionsRegenerated:true,sourceUnchanged:true,
    safeToAutoApply:false,fitCertified:false,sweptCollisionCertified:false}
}
