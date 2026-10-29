const bad=(code,reason)=>({ok:false,code,reason,manufacturingApproved:false})
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_.-]{1,64}$/.test(v)
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000
const escapeCsv=v=>{
 const s=String(v??'')
 return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s
}
const readCsv=csv=>{
 const rows=[];let row=[],field='',quoted=false
 for(let i=0;i<csv.length;i++){
  const c=csv[i]
  if(c==='"'){
   if(quoted&&csv[i+1]==='"'){field+='"';i++}
   else quoted=!quoted
  }else if(c===','&&!quoted){row.push(field);field=''}
  else if((c==='\r'||c==='\n')&&!quoted){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(field);field='';rows.push(row);row=[]}
  else field+=c
 }
 if(quoted)throw Error('Unclosed CSV quoted field')
 if(field!==''||row.length){row.push(field);rows.push(row)}
 return rows
}

/** Data-first AccuMark Explorer model/order foundation. Creates immutable,
 * inventory-linked BOM and garment cut demand records from actual EXO source
 * pattern pieces and selected grade sizes. Does not claim PLM authorization.
 */
export function buildAccuMarkExplorerOrder20261024(project,{
 styleId='EXO-STYLE',orderId='EXO-ORDER',variantId='DEFAULT',colorway='BASE',
 quantitiesBySize,stockByFabric,
}={}){
 if(![styleId,orderId,variantId,colorway].every(id))
  return bad('INVALID_IDENTIFIERS','Style, order, variant and colorway must be safe unique identifiers')
 if(!Array.isArray(project?.pieces)||!project.pieces.length||project.pieces.length>2000)
  return bad('INVALID_PIECES','Project must contain 1–2000 source pattern pieces')
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||!sizes.length||sizes.length>100||
   sizes.some(x=>!id(x))||new Set(sizes.map(x=>x.toLowerCase())).size!==sizes.length)
   return bad('INVALID_SIZES','Case-distinct unique grade sizes required')
 if(!quantitiesBySize||typeof quantitiesBySize!=='object'||Array.isArray(quantitiesBySize)||
  Object.keys(quantitiesBySize).length!==sizes.length||sizes.some(size=>!count(quantitiesBySize[size]))||
  !sizes.some(size=>quantitiesBySize[size]>0))
   return bad('INVALID_ORDER','Complete per-size nonnegative order counts required')
 const pieces=[],pieceIds=new Set(),fabrics=new Set()
 for(const piece of project.pieces){
  if(!id(piece?.id)||pieceIds.has(piece.id.toLowerCase()))
    return bad('DUPLICATE_PIECE','Every pattern piece requires a unique case-insensitive ID')
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))
    return bad('INVALID_CUT','Source piece requires finite physical geometry')
  if(!Number.isSafeInteger(piece.cutQuantity)||piece.cutQuantity<1||piece.cutQuantity>99)
    return bad('INVALID_CUT_QUANTITY','Piece cut quantity must be 1–99')
  const fabricId=piece.fabricId||'main'
  if(!id(fabricId))return bad('INVALID_FABRIC_ID','Each piece needs a known fabric')
  pieceIds.add(piece.id.toLowerCase());fabrics.add(fabricId)
  pieces.push({pieceId:piece.id,description:piece.name||piece.id,
    fabricId,cutQuantity:piece.cutQuantity,baseVertices:piece.points.length,
    referenceOnly:piece.patternSource?.referenceOnly===true})
 }
 const totalGarments=sizes.reduce((s,k)=>s+quantitiesBySize[k],0)
 let totalPieces=0
 const demand=[]
 for(const size of sizes)for(const piece of pieces){
  const required=quantitiesBySize[size]*piece.cutQuantity
  if(!Number.isSafeInteger(required)||required>1e9)return bad('QUANTITY_OVERFLOW','Cut quantities exceed safe bounds')
  if(required){demand.push({orderId,styleId,variantId,colorway,size,
    pieceId:piece.pieceId,fabricId:piece.fabricId,perGarment:piece.cutQuantity,required})}
  totalPieces+=required
 }
 const stock={}
 if(stockByFabric!==undefined){
  if(!stockByFabric||typeof stockByFabric!=='object'||Array.isArray(stockByFabric)||
    Object.keys(stockByFabric).some(key=>!fabrics.has(key)))return bad('INVALID_STOCK','Only known model fabric IDs may be stocked')
  for(const key of fabrics){
   if(!count(stockByFabric[key]))return bad('INVALID_STOCK','Every fabric needs an explicit nonnegative piece capacity')
   const requested=demand.filter(row=>row.fabricId===key).reduce((sum,row)=>sum+row.required,0)
   stock[key]={availablePieceCapacity:stockByFabric[key],requiredPieceCapacity:requested,
     sufficient:stockByFabric[key]>=requested}
  }
 }
 const blockers=Object.entries(stock).filter(([,v])=>!v.sufficient).map(([fabric])=>'INSUFFICIENT_STOCK:'+fabric)
 const model={schema:'exo.accumark-explorer-model.v1',styleId,variantId,colorway,
  sourceProjectId:project.id||null,gradeSizes:[...sizes],pieces}
 const order={orderId,styleId,variantId,colorway,quantitiesBySize:{...quantitiesBySize},
  totalGarments,totalPieces,stock,demand,blockers,status:blockers.length?'STOCK_BLOCKED':'DRAFT',
  productionApproved:false,factoryApproved:false}
 return{ok:blockers.length===0,model,order,
  blockers,manufacturingApproved:false,cuttingAuthorized:false,
  code:blockers.length?'STOCK_SHORTAGE':undefined}
}

export function exportAccuMarkExplorerOrderCsv20261024(output){
 if(!output?.model||!output.order||!Array.isArray(output.order.demand))
  throw Error('Validated Explorer output required')
 const columns=['orderId','styleId','variantId','colorway','size','pieceId','fabricId','perGarment','required','productionApproved']
 const rows=output.order.demand.map(row=>columns.map(k=>k==='productionApproved'?'false':escapeCsv(row[k])).join(','))
 return [columns.join(','),...rows].join('\r\n')+'\r\n'
}

export function auditAccuMarkExplorerOrderCsv20261024(csv,output){
 try{
  if(typeof csv!=='string'||csv.length>5e6)return bad('INVALID_CSV','Bounded CSV text required')
  const rows=readCsv(csv)
  if(rows[0]?.join(',')!=='orderId,styleId,variantId,colorway,size,pieceId,fabricId,perGarment,required,productionApproved')
   return bad('UNKNOWN_SCHEMA','Unsupported EXO order CSV fields')
  const expected=readCsv(exportAccuMarkExplorerOrderCsv20261024(output))
  if(JSON.stringify(rows)!==JSON.stringify(expected))
   return bad('CSV_MISMATCH','CSV differs from the validated source order; import is blocked')
  return{ok:true,rows:rows.length-1,validatedOrderId:output.order.orderId,
   manufacturingApproved:false,cuttingAuthorized:false}
 }catch(e){return bad('INVALID_CSV',e.message||String(e))}
}
