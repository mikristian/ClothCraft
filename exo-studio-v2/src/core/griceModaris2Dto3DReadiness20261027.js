import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

// Read-only engineering readiness, aligned with the published Grice book TOC.
// Native boundary intervals are fractions of material arclength, not Bezier t.
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const id=x=>typeof x==='string'&&x.length>0
const validRange=r=>Array.isArray(r)&&r.length===2&&r.every(finite)&&r[0]>=0&&r[1]<=1&&r[1]-r[0]>=1e-9
const overlap=(a,b)=>Math.max(a[0],b[0])<Math.min(a[1],b[1])-1e-12
const properties=['warp','weft','shear','compression_ratio','compression_transition','bend_warp','bend_weft','density','thickness']

export function auditGrice2D3DPreparation20261027(snapshot,{seamToleranceMm=2,expectedRevision}={}){
  const blockers=[],warnings=[],seams=[]
  const stages={source:{status:'blocked',blockers:[]},industrial:{status:'blocked',blockers:[]},assembly:{status:'blocked',blockers:[]},drape:{status:'blocked',blockers:[]}}
  const block=(stage,message)=>{stages[stage].blockers.push(message);blockers.push(`${stage}: ${message}`)}
  const warn=message=>warnings.push(message)
  const template=snapshot?.template
  const panels=template?.panels,fabrics=template?.fabrics,joins=template?.seams
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)block('source','Missing valid native revision')
  if(expectedRevision!==undefined&&(!Number.isSafeInteger(expectedRevision)||snapshot?.revision!==expectedRevision))block('source','Stale native revision')
  if(!finite(seamToleranceMm)||seamToleranceMm<0||seamToleranceMm>5)block('assembly','Invalid seam tolerance')
  if(!Array.isArray(panels)||!panels.length||panels.length>128)block('source','Missing or oversized authored native panel inventory')
  if(!Array.isArray(fabrics)||!fabrics.length||fabrics.length>128)block('source','Missing native fabric identities')
  if(!Array.isArray(joins)||joins.length>256)block('assembly','Missing or oversized native sewing inventory')
  const panelMap=new Map(),fabricMap=new Map()
  for(const fabric of Array.isArray(fabrics)?fabrics.slice(0,129):[]){
    if(!id(fabric?.id)||fabricMap.has(fabric.id))block('source','Duplicate or invalid fabric identifier')
    else fabricMap.set(fabric.id,fabric)
  }
  for(const panel of Array.isArray(panels)?panels.slice(0,129):[]){
    if(!id(panel?.id)||panelMap.has(panel.id)){block('source','Duplicate or invalid authored panel identifier');continue}
    panelMap.set(panel.id,panel)
    if(!id(panel.fabric)||!fabricMap.has(panel.fabric))block('source',`${panel.id}: unbound fabric identity`)
    const p=panel.polygon
    if(!Array.isArray(p?.points)||p.points.length<3||!Array.isArray(p.edges)||p.edges.length!==p.points.length||
      !p.points.every(q=>Array.isArray(q)&&q.length===2&&q.every(finite))||new Set(p.edges).size!==p.edges.length)
      block('source',`${panel.id}: invalid native net polygon`)
    if(!finite(panel.grain_degrees))block('industrial',`${panel.id}: missing or invalid grain direction`)
    if(!p?.seam_allowances||typeof p.seam_allowances!=='object'||!Object.keys(p.seam_allowances).length){
      warn(`${panel.id}: seam allowances are undocumented; industrialization requires review`)
      stages.industrial.needsReview=true
    }else if(Array.isArray(p.edges)){
      // Grice ch. 4 (printed pp. 51–53) distinguishes the NET contour from
      // an explicit per-boundary stitched/CUT specification, including fold
      // or stepped-hem edges. A single annotated edge does not industrialize
      // all other edges. Zero-width seams must be authored explicitly; absent
      // entries remain a review, not an invented physical cut allowance.
      const undefinedEdges=p.edges.filter(edge=>!Object.hasOwn(p.seam_allowances,edge))
      if(undefinedEdges.length){
        warn(`${panel.id}: ${undefinedEdges.length} boundary edge(s) have no explicit seam allowance or fold declaration: ${undefinedEdges.slice(0,8).join(', ')}`)
        stages.industrial.needsReview=true
      }
    }
    if(!p?.notches||typeof p.notches!=='object'||!Object.keys(p.notches).length){
      warn(`${panel.id}: notches are undocumented; industrialization requires review`)
      stages.industrial.needsReview=true
    }
    for(const [edge,marks] of Object.entries(p?.notches??{})){
      if(!p?.edges?.includes(edge)||!Array.isArray(marks)||marks.some(mark=>!finite(mark?.t)||mark.t<=0||mark.t>=1))
        block('industrial',`${panel.id}/${edge}: invalid notch edge or t`)
    }
    for(const [edge,allowance] of Object.entries(p?.seam_allowances??{})){
      if(!p?.edges?.includes(edge)||!finite(allowance)||allowance<0)block('industrial',`${panel.id}/${edge}: invalid seam allowance`)
    }
  }
  warn('Factory seam allowances, notches, size charts and variant identities require separate human review; readiness is not production certification')
  const occupied=new Map(),seamIds=new Set()
  for(const seam of Array.isArray(joins)?joins.slice(0,257):[]){
    const name=id(seam?.id)?seam.id:'unnamed seam'
    if(!id(seam?.id)||seamIds.has(name))block('assembly',`${name}: missing or duplicate seam identity`)
    seamIds.add(name)
    const sides=[]
    for(const ref of [seam?.a,seam?.b]){
      if(!id(ref?.panel)||!id(ref?.edge)||!validRange(ref.range)){
        block('assembly',`${name}: invalid boundary reference or sewing interval`);continue
      }
      const panel=panelMap.get(ref.panel)
      if(!panel){block('assembly',`${name}: missing panel ${ref.panel}`);continue}
      const measured=nativeRustEdgeLength20261023(panel.polygon,ref.edge)
      if(!measured.ok||!finite(measured.totalLengthM)||measured.totalLengthM<=0){
        block('assembly',`${name}: unmeasurable ${ref.panel}/${ref.edge}: ${measured.reason??'unknown curve'}`);continue
      }
      const key=`${ref.panel}\0${ref.edge}`
      const previous=occupied.get(key)??[]
      if(previous.some(r=>overlap(r,ref.range)))block('assembly',`${name}: overlapping seam intervals at ${ref.panel}/${ref.edge}`)
      previous.push(ref.range);occupied.set(key,previous)
      const lengthMm=measured.totalLengthM*(ref.range[1]-ref.range[0])*1000
      if(!finite(lengthMm)||lengthMm<.1)block('assembly',`${name}: sewing interval too short or nonfinite`)
      sides.push({panel:ref.panel,edge:ref.edge,range:[...ref.range],fullLengthMm:measured.totalLengthM*1000,lengthMm})
    }
    if(sides.length!==2)continue
    if(sides[0].panel===sides[1].panel&&sides[0].edge===sides[1].edge)
      block('assembly',`${name}: self-joined identical boundary`)
    const mismatchMm=Math.abs(sides[0].lengthMm-sides[1].lengthMm)
    const ease=seam.allow_ease===true
    // Grice's Desk of Stitches workflow (full book, PDF pp. 104–108)
    // distinguishes physically aligned points/notches from two edges merely
    // having equal total lengths. Rust's compiled seam uses a monotone pair
    // of normalized *rest-arclength* stations, not point IDs or Bezier t.
    const pairs=seam.notches===undefined?[]:seam.notches
    const notchIntervals=[]
    let validNotches=Array.isArray(pairs)&&pairs.length<=128
    let previous=[0,0]
    const stations=validNotches?[...pairs,[1,1]]:[]
    if(validNotches)for(let index=0;index<stations.length;index++){
      const pair=stations[index],terminal=index===stations.length-1
      if(!Array.isArray(pair)||pair.length!==2||!pair.every(finite)||
         pair.some((v,i)=>v<=previous[i]+1e-9||v>1||(!terminal&&v>=1))){
        validNotches=false;break
      }
      const aMm=sides[0].lengthMm*(pair[0]-previous[0])
      const bMm=sides[1].lengthMm*(pair[1]-previous[1])
      notchIntervals.push({from:[...previous],to:[...pair],aMm,bMm,mismatchMm:Math.abs(aMm-bMm)})
      previous=pair
    }
    if(!validNotches)block('assembly',`${name}: invalid or nonmonotone facing-notch correspondence`)
    // Rust's native compiled stitch engine refuses local interval ease over
    // 0.01 mm unless the seam explicitly opts into unequal-length easing.
    const localMismatchMm=validNotches?Math.max(0,...notchIntervals.map(row=>row.mismatchMm)):null
    const notchMismatch=validNotches&&localMismatchMm>0.01
    const needsEase=mismatchMm>seamToleranceMm||notchMismatch
    const status=!validNotches?'blocked':needsEase?(ease?'review':'blocked'):'pass'
    if(status==='blocked'&&validNotches)block('assembly',mismatchMm>seamToleranceMm?
      `${name}: length mismatch ${mismatchMm.toFixed(2)} mm exceeds ${seamToleranceMm} mm`:
      `${name}: local facing-notch interval mismatch ${localMismatchMm?.toFixed(2)} mm requires explicit ease or matching station positions`)
    if(status==='review')warn(`${name}: explicit ease requires physical fullness and fit review (total ${mismatchMm.toFixed(2)} mm, worst notch interval ${localMismatchMm?.toFixed(2)} mm)`)
    seams.push({id:name,a:sides[0],b:sides[1],mismatchMm,allowEase:ease,
      notchIntervals,localNotchMismatchMm:localMismatchMm,status})
  }
  if(Array.isArray(joins)&&!joins.length)block('assembly','No authored sewing joins; assembled 3D preparation cannot be verified')
  if(Array.isArray(joins)&&joins.length&&(!Array.isArray(snapshot?.seams)||joins.some(j=>!snapshot.seams.some(s=>s.id===j.id))))
    block('drape','Missing compiled native 3D seam relationships')
  const positions=snapshot?.positions,uv=snapshot?.uv,triangles=snapshot?.triangles
  if(!Array.isArray(positions)||positions.length<3||!positions.every(p=>Array.isArray(p)&&p.length===3&&p.every(finite)))
    block('drape','Missing or nonfinite compiled 3D positions')
  if(!Array.isArray(uv)||uv.length!==positions?.length||!uv.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite)))
    block('drape','Missing or invalid compiled UV coordinates')
  if(!Array.isArray(triangles)||!triangles.length||!triangles.every(t=>Array.isArray(t)&&t.length===3&&new Set(t).size===3&&t.every(i=>Number.isSafeInteger(i)&&i>=0&&i<(positions?.length??0))))
    block('drape','Missing or invalid compiled mesh triangles')
  if(!Array.isArray(snapshot?.panels)||panelMap.size!==snapshot.panels.length||
     [...panelMap.keys()].some(k=>!snapshot.panels.some(p=>p.id===k)))block('drape','Compiled mesh panel identities do not match authored pattern')
  for(const fabric of fabricMap.values()){
    for(const key of properties)if(!finite(fabric.properties?.[key])||fabric.properties[key]<=0)
      block('drape',`${fabric.id}: missing, zero or nonfinite ${key} material property`)
  }
  for(const [key,stage] of Object.entries(stages)){
    stage.status=stage.blockers.length?'blocked':stage.needsReview||key==='assembly'&&seams.some(s=>s.status==='review')?'review':'pass'
    delete stage.needsReview
  }
  const status=Object.values(stages).some(s=>s.status==='blocked')?'blocked':
    Object.values(stages).some(s=>s.status==='review')?'review':'pass'
  // Grice ch. 4–6 additionally requires an explicit production/3D variant,
  // optional 3D substitutes, assembly phases and on-body positioning. EXO's
  // compiled mesh/seam snapshot has no authenticated representation of those
  // Modaris-specific authoring steps. Never conflate a native preliminary
  // 3D assembly preflight with a complete Modaris preparation workflow.
  return {status,readyFor3D:status==='pass',manufacturingApproved:false,
    modarisClassic3DWorkflowComplete:false,
    missingModarisWorkflowEvidence:['saved 3D variant piece selection and quantity',
      'source-linked 3D substitute and Set-as-3D line authoring',
      'named stitching phases, layer assignments and slip-on placement anchors'],
    sourceRevision:Number.isSafeInteger(snapshot?.revision)?snapshot.revision:null,
    seamToleranceMm,stages,blockers,warnings,seams}
}
