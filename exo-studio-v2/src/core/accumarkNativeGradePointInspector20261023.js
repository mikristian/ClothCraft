const valid=n=>typeof n==='number'&&Number.isFinite(n)
const reject=reason=>({ok:false,reason})

/** Show the native snapshot's REAL source coordinate and independent affine
 * size proposal point positions. Never commits a point rule to Rust. */
export function inspectAccuMarkNativeGradePoint20261023(panelProposal,{pointIndex=0}={}){
 if(!panelProposal?.ok||panelProposal.source!=='AFFINE_PROPOSAL_NOT_COMMITTED_GRADING')
  return reject('Named industrial grade rule table is not committed for this native panel')
 const {panelId,sizes,sizeRun,baseSize,selectedSize,basePolygon}=panelProposal
 if(typeof panelId!=='string'||!panelId||!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
  sizes.some(s=>typeof s!=='string'||!s.trim())||new Set(sizes).size!==sizes.length||
  !sizes.includes(baseSize)||!sizes.includes(selectedSize))return reject('Invalid named proposal size line')
 if(!Array.isArray(basePolygon?.points)||basePolygon.points.length<3||
  basePolygon.points.length>4096||!Number.isSafeInteger(pointIndex)||pointIndex<0||
  pointIndex>=basePolygon.points.length)return reject('Invalid native point or topology')
 const toPoint=(p)=>{
  if(!Array.isArray(p)||p.length!==2||!p.every(valid))throw Error('Nonfinite native graded material coordinate')
  return {xMm:p[0]*1000,yMm:p[1]*1000}
 }
 try{
  const base=toPoint(basePolygon.points[pointIndex])
  const rows=sizes.map(size=>{
   const record=sizeRun?.[size]
   if(record?.panelId!==panelId||record?.units!=='m'||record.polygon?.points?.length!==basePolygon.points.length)
    throw Error('Missing or mismatched size proposal '+size)
   const absolute=toPoint(record.polygon.points[pointIndex])
   return {size,...absolute,dxMm:absolute.xMm-base.xMm,dyMm:absolute.yMm-base.yMm}
  })
  if(rows.find(row=>row.size===baseSize)?.dxMm!==0||rows.find(row=>row.size===baseSize)?.dyMm!==0)
   throw Error('Base proposal point changed')
  return {ok:true,panelId,pointIndex,baseSize,selectedSize,sizes:[...sizes],base,rows,
   accuracy:panelProposal.accuracy,source:panelProposal.source,units:'mm',editable:false,manufacturingApproved:false}
 }catch(error){return reject(error.message||String(error))}
}
