// Ordered, revision-checked garment pre-assembly planner.
// Source CUTs are never resized or implicitly eased to force a simulated fit.
const finite = n => typeof n === 'number' && Number.isFinite(n)
const validVec = (v,n,limit=10) => Array.isArray(v) && v.length===n && v.every(x=>finite(x)&&Math.abs(x)<=limit)
const panelBounds = panel => {
  const pts=panel?.polygon?.points
  if(!Array.isArray(pts)||pts.length<3||pts.some(p=>!validVec(p,2)))return null
  return {width:Math.max(...pts.map(p=>p[0]))-Math.min(...pts.map(p=>p[0])),height:Math.max(...pts.map(p=>p[1]))-Math.min(...pts.map(p=>p[1]))}
}
const edgeLength = (panel,edge) => {
  const index=panel?.polygon?.edges?.indexOf(edge)
  const pts=panel?.polygon?.points
  if(index==null||index<0||!Array.isArray(pts)||index>=pts.length)return null
  const a=pts[index],b=pts[(index+1)%pts.length]
  return Math.hypot(a[0]-b[0],a[1]-b[1])
}
const overlaps=(a,b)=>a.panel===b.panel&&a.edge===b.edge&&Math.max(a.range[0],b.range[0])<Math.min(a.range[1],b.range[1])-1e-12
export function planOrderedAssembly(snapshot, proposal){
  if(!Array.isArray(snapshot?.template?.panels)||snapshot.template.panels.length>128||!Array.isArray(snapshot.template.seams||[])||!Number.isSafeInteger(snapshot.revision)||!proposal||typeof proposal!=='object'||Array.isArray(proposal)||
    Object.keys(proposal).some(x=>!['placements','pairs','maxMismatchMm'].includes(x)))return {ok:false,reason:'INVALID_PROPOSAL'}
  const placements=proposal.placements||[],pairs=proposal.pairs||[],limit=proposal.maxMismatchMm??5
  if(!Array.isArray(placements)||placements.length>128||!Array.isArray(pairs)||pairs.length>128||!finite(limit)||limit<0||limit>100)return {ok:false,reason:'INVALID_COUNT_OR_TOLERANCE'}
  const sourcePanels=snapshot.template.panels
  if(sourcePanels.some(panel=>typeof panel?.id!=='string'||!panel.id||
    !Array.isArray(panel.polygon?.points)||!Array.isArray(panel.polygon?.edges)||
    panel.polygon.points.length!==panel.polygon.edges.length||
    !panelBounds(panel)||panel.polygon.edges.some(edge=>typeof edge!=='string'||!edge)||
    new Set(panel.polygon.edges).size!==panel.polygon.edges.length)||
    new Set(sourcePanels.map(panel=>panel.id)).size!==sourcePanels.length)
    return {ok:false,reason:'INVALID_SOURCE_PANELS'}
  const panels=new Map(sourcePanels.map(p=>[p.id,p])),seams=[...(snapshot.template.seams||[])],seen=new Set(),commands=[],warnings=[]
  for(const item of placements){
    if(!item||Object.keys(item).some(x=>!['panel','placement'].includes(x))||typeof item.panel!=='string'||seen.has(item.panel)||!panels.has(item.panel)||
      !validVec(item.placement?.translation,3)||!validVec(item.placement?.rotation_degrees,3,360)||Object.keys(item.placement).some(x=>!['translation','rotation_degrees'].includes(x)))return {ok:false,reason:'INVALID_PLACEMENT',panel:item?.panel}
    seen.add(item.panel)
    commands.push({kind:'Place',panel:item.panel,placement:item.placement})
  }
  const refs=[]
  for(const seam of seams)refs.push(seam.a,seam.b)
  for(const item of pairs){
    if(!item||Object.keys(item).some(k=>!['a','b','reverse','ease'].includes(k))||typeof item.reverse!=='boolean'||typeof item.ease!=='boolean')return {ok:false,reason:'INVALID_SEAM_PAIR'}
    const validated=[]
    for(const ref of [item.a,item.b]){
      const keys=Object.keys(ref||{})
      if(keys.some(k=>!['panel','side','edge','range'].includes(k))||!panels.has(ref?.panel)||typeof ref.edge!=='string'||
        !panels.get(ref.panel).polygon?.edges?.includes(ref.edge)||!['top','left','right','bottom'].includes(ref.side)||
        !Array.isArray(ref.range)||ref.range.length!==2||!ref.range.every(finite)||ref.range[0]<0||ref.range[1]>1||ref.range[0]>=ref.range[1])return {ok:false,reason:'INVALID_BOUNDARY'}
      if(refs.some(other=>overlaps(other,ref)))return {ok:false,reason:'BOUNDARY_ALREADY_SEWN',panel:ref.panel,edge:ref.edge}
      validated.push({panel:ref.panel,side:ref.side,edge:ref.edge,range:[...ref.range]})
    }
    if(overlaps(validated[0],validated[1]))return {ok:false,reason:'SAME_BOUNDARY'}
    // Both endpoints of this proposal belong to the occupied-boundary inventory.
    // Prevent later pairs in the same batch from reusing either cutline interval.
    if(refs.some(other=>overlaps(other,validated[0])||overlaps(other,validated[1])))
      return {ok:false,reason:'BOUNDARY_ALREADY_SEWN'}
    const lengths=validated.map(r=>edgeLength(panels.get(r.panel),r.edge)*(r.range[1]-r.range[0]))
    if(lengths.some(length=>!finite(length)||length<=1e-9))return {ok:false,reason:'INVALID_BOUNDARY_LENGTH'}
    const mismatchMm=1000*Math.abs(lengths[0]-lengths[1])
    if(mismatchMm>limit&&!item.ease)return {ok:false,reason:'SEAM_LENGTH_MISMATCH',mismatchMm}
    if(mismatchMm>limit)warnings.push({type:'SEAM_EASE_REQUIRES_REVIEW',panels:validated.map(r=>r.panel),mismatchMm})
    refs.push(...validated)
    commands.push({kind:'Sew',a:validated[0],b:validated[1],reverse:item.reverse,ease:item.ease})
  }
  return {ok:true,commands,warnings,expectedRevision:snapshot.revision,placementCount:placements.length,seamCount:pairs.length,
    requiresFitValidation:true,simulationApproved:false,panels:placements.map(x=>({id:x.panel,dimensions:panelBounds(panels.get(x.panel))}))}
}
