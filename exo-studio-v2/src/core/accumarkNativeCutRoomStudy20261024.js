// Turn original Rust native physical CUTLINE PROOF into an isolated, read-only
// BASE-size study project. This never mutates the signed native garment and is
// not a graded, approved or vendor CAD-ready cutting model.
const fail=reason=>({ok:false,reason,factoryApproved:false})
const valid=n=>typeof n==='number'&&Number.isFinite(n)
export function convertNativeCutlineStudy20261024(snapshot,proof){
 if(!snapshot?.template||!Array.isArray(snapshot.template.panels)||
   !proof||proof.format!=='exo-native-cutline-proof.v1'||proof.factoryApproved!==false||
   proof.revision!==snapshot.revision||proof.units!=='mm'||!Array.isArray(proof.panels)||
   proof.panels.length!==snapshot.template.panels.length||!proof.panels.length)
   return fail('Refresh the current Rust physical CUT proof; source revision, units or panel inventory differ.')
 if(proof.blockedCount!==0||proof.generatedCount!==proof.panels.length)
   return fail('Rust blocked one or more physical cutlines; fix all seam allowances, topology and marking geometry first.')
 const ids=new Set()
 const pieces=[]
 for(const row of proof.panels) {
  const panel=snapshot.template.panels.find(p=>p.id===row.panelId)
  if(!row.ok||!panel||ids.has(panel.id)||!Array.isArray(row.pointsMm)||row.pointsMm.length<3||row.pointsMm.length>2000||
    row.pointsMm.some(pt=>!Array.isArray(pt)||pt.length!==2||!pt.every(valid)))
    return fail('Unverified or duplicate native physical CUT, or unsupported geometry.')
  ids.add(panel.id)
  if(panel.polygon?.holes?.length||panel.polygon?.notches?.some?.(mark=>mark.unresolved))
    return fail('Native holes or unresolved manufacturing marks cannot be flattened into a marker preview.')
  // CUTLINE proof is already the independent physically offset cut contour.
  // Neither a second seam allowance nor a fictitious sewing boundary is added.
  const points=row.pointsMm.map(([x,y])=>({x:x/10,y:y/10}))
  const grain=panel.grain_degrees
  pieces.push({id:panel.id,name:panel.name,points,curves:{},notches:[],internalLines:[],
    seamAllowance:0,cutQuantity:1,grainAngleDeg:valid(grain)?grain:undefined,
    fabricId:panel.fabric,marker:{nap:'none'},locked:true,
    patternImportProvenance:{source:'native-rust-physical-cutline-study',referenceOnly:true,
      verifiedPhysicalCut:true,sewingAndGradingRulesImported:false,factoryApproved:false}})
 }
 return {ok:true,project:{
  id:'native-cut-study-revision-'+snapshot.revision,name:snapshot.template.name+' · Rust CUT study',
  pieces,grading:{sizes:['BASE'],baseSize:'BASE',widthPerSizeCm:0,lengthPerSizeCm:0},
  patternSource:{referenceOnly:true,source:'Rust production-cutlines proof',revision:snapshot.revision,factoryApproved:false}},
  sourceRevision:snapshot.revision,factoryApproved:false}
}
