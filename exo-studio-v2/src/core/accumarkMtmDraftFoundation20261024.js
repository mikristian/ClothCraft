import {polygonArea} from './project.js'

const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>0
const fail=(code,reason)=>({ok:false,code,reason,manufacturingApproved:false})
const compact=s=>typeof s==='string'&&/^[A-Za-z0-9_.-]{1,48}$/.test(s)
const valid=(n,min,max)=>good(n)&&n>=min&&n<=max
const round=n=>Math.round(n*1e4)/1e4
const p=(x,y)=>({x:round(x),y:round(y)})
function createPanel(id,measure,bustWidth,waistWidth,hemWidth,neckDrop){
 const length=measure.bodyLengthCm
 const neckWidth=Math.min(bustWidth*.4,measure.neckCm/6)
 const shoulder=Math.max(neckWidth+1,Math.min(bustWidth-.6,measure.shoulderWidthCm/2))
 const armhole=Math.max(6,Math.min(length*.45,measure.armholeDepthCm))
 const points=[p(0,neckDrop),p(neckWidth,0),p(shoulder,2),p(bustWidth,armhole),
   p(waistWidth,length*.7),p(hemWidth,length),p(0,length)]
 if(!Number.isFinite(polygonArea(points))||polygonArea(points)<=1)throw Error('Invalid measured polygon')
 return{id,name:id==='mtm_front'?'Measured front block':'Measured back block',
   points,curves:{},notches:[],internalLines:[],seamAllowance:0,cutQuantity:1,
   fabricId:measure.fabricId,grainAngleDeg:0,marker:{nap:'one-way'},
   patternSource:{method:'MTM_REFERENCE_TORSO_BLOCK',referenceOnly:true,measurementsCm:structuredClone(measure),
    verifiedSewline:false,verifiedArmhole:false,gradeRulesCommitted:false,manufacturingApproved:false}}
}
/** Parametric editable front/back reference blocks, not industrial fitted
 * patterns. All measurements are explicit centimeters, no implicit sizes.
 */
export function createAccuMarkMtmDraft20261024({
 chestCm,waistCm,hipCm,bodyLengthCm,shoulderWidthCm,neckCm,armholeDepthCm,
 easeChestCm=8,easeWaistCm=6,easeHipCm=6,frontNeckDropCm=7,
 size='CUSTOM',fabricId='main'
}={}){
 try{
  const measure={chestCm,waistCm,hipCm,bodyLengthCm,shoulderWidthCm,neckCm,armholeDepthCm,
    easeChestCm,easeWaistCm,easeHipCm,frontNeckDropCm,fabricId}
  const ranges={chestCm:[40,220],waistCm:[35,225],hipCm:[40,240],bodyLengthCm:[30,125],
    shoulderWidthCm:[20,85],neckCm:[20,70],armholeDepthCm:[10,65],frontNeckDropCm:[0,25]}
  for(const [key,[min,max]] of Object.entries(ranges))
    if(!valid(measure[key],min,max)&&!(key==='frontNeckDropCm'&&measure[key]===0))
      return fail('INVALID_MEASUREMENTS',key+' must be within '+min+'–'+max+' cm')
  for(const key of ['easeChestCm','easeWaistCm','easeHipCm'])
    if(!Number.isFinite(measure[key])||measure[key]<0||measure[key]>40)
      return fail('INVALID_EASE',key+' must be between 0 and 40 cm')
  if(!compact(size)||!compact(fabricId))return fail('INVALID_IDENTIFIERS','Valid ASCII size and fabric ID required')
  const bustWidth=(chestCm+easeChestCm)/4,waistWidth=(waistCm+easeWaistCm)/4,
    hemWidth=(hipCm+easeHipCm)/4
  if(Math.min(bustWidth,waistWidth,hemWidth)<5||frontNeckDropCm>=bodyLengthCm*.5)
    return fail('BLOCK_GEOMETRY','Measurements cannot form a valid torso reference')
  const pieces=[createPanel('mtm_front',measure,bustWidth,waistWidth,hemWidth,frontNeckDropCm),
    createPanel('mtm_back',measure,bustWidth,waistWidth,hemWidth,Math.min(3,frontNeckDropCm*.35))]
  const project={id:'mtm-'+size,name:'MTM '+size+' · engineering draft',pieces,
    grading:{baseSize:size,sizes:[size],widthPerSizeCm:0,lengthPerSizeCm:0},
    patternSource:{referenceOnly:true,method:'MEASUREMENT_DRAFTED_REFERENCE',
      measurementsCm:measure,notEquivalentToIndustrialPattern:true,manufacturingApproved:false}}
  return {ok:true,project,measurementsCm:measure,
    actualBustCircumferenceCm:round(bustWidth*4),waistCircumferenceCm:round(waistWidth*4),
    hipCircumferenceCm:round(hemWidth*4),fitApprovalRequired:true,manufacturingApproved:false,
    warning:'Two editable measured blocks. Fitted armholes, sewn lines and grade rules require human patternmaking and sample QA.'}
 }catch(e){return fail('INVALID_DRAFT',e.message)}
}
/** Repeatable bounded reference-drafting macro: all-or-nothing independent
 * measured drafts, not guessed multi-dimensional grading rules.
 */
export function runAccuMarkMtmBatch20261024(rows=[]){
 if(!Array.isArray(rows)||rows.length<1||rows.length>20)
   return fail('INVALID_BATCH','Provide 1–20 complete measurement profiles')
 const projects=[],labels=new Set()
 for(const row of rows){
  const name=String(row?.size||'')
  if(labels.has(name.toLowerCase()))return fail('DUPLICATE_SIZE','Measurement size labels collide')
  labels.add(name.toLowerCase())
  const output=createAccuMarkMtmDraft20261024(row)
  if(!output.ok)return fail(output.code,'Size '+name+': '+output.reason)
  projects.push({size:name,project:output.project,measurementsCm:output.measurementsCm})
 }
 return {ok:true,macro:'MTM_TORSO_REFERENCE_BATCH_V1',projects,
   count:projects.length,manufacturingApproved:false,gradeRulesCommitted:false}
}
