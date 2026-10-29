import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createTemplateProject,GARMENT_TEMPLATES} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'
import {initializeRustExportContourKernel,rustExportContourStatus} from '../src/core/rustExportContourKernel.js'

// Frozen, self-contained reference of JS contour normalization preceding Rust ABI1.
function reference(project,{minimumEdgeCm=.01}={}){
 if(!(minimumEdgeCm>0)||!Number.isFinite(minimumEdgeCm))throw Error('Invalid minimum export edge length')
 const document=structuredClone(project),mappings=new Map(),removed=[],reversed=[]
 for(const piece of document.pieces||[]){
  const original=piece.points;if(!Array.isArray(original)||original.length<3)continue
  const n=original.length,retained=[]
  for(let i=0;i<n;i++)if(Math.hypot(original[i].x-original[(i+1)%n].x,original[i].y-original[(i+1)%n].y)>=minimumEdgeCm)retained.push(i)
  if(retained.length<3)throw Error(`Panel ${piece.id} has fewer than three usable edges`)
  const oldToNew=new Map(retained.map((old,index)=>[old,index])),kept=new Set(retained)
  for(let i=0;i<n;i++)if(!kept.has(i))removed.push({pieceId:piece.id,edgeIndex:i})
  let points=retained.map(i=>original[i]);const area=points.reduce((sum,p,i)=>{const next=points[(i+1)%points.length];return sum+p.x*next.y-next.x*p.y},0)/2
  const reverse=area<0;if(reverse){points=points.slice().reverse();reversed.push(piece.id)}
  const m=points.length,newCurves={}
  for(const [key,value] of Object.entries(piece.curves||{})){
   const old=Number(key);if(!oldToNew.has(old)||!kept.has((old+1)%n))continue
   const idx=oldToNew.get(old);newCurves[reverse?(m-2-idx+m)%m:idx]=structuredClone(value)
  }
  piece.points=points;if(piece.curves)piece.curves=newCurves
  mappings.set(piece.id,{oldToNew,reverse,count:m})
  for(const key of ['notches','topstitches','edgeSeamAllowances']){
   if(!Array.isArray(piece[key]))continue
   piece[key]=piece[key].filter(item=>!Number.isInteger(item.edgeIndex)||oldToNew.has(item.edgeIndex)).map(item=>{
    if(!Number.isInteger(item.edgeIndex))return item
    const idx=oldToNew.get(item.edgeIndex);item.edgeIndex=reverse?(m-2-idx+m)%m:idx
    if(reverse&&Number.isFinite(item.t))item.t=1-item.t
    return item
   })
  }
 }
 document.seams=(document.seams||[]).filter(seam=>[seam.a,seam.b].every(side=>{const m=mappings.get(side?.pieceId);return !m||m.oldToNew.has(side.edgeIndex)})).map(seam=>{
  let changed=0
  for(const side of [seam.a,seam.b]){
   const map=mappings.get(side?.pieceId);if(!map)continue
   const idx=map.oldToNew.get(side.edgeIndex);side.edgeIndex=map.reverse?(map.count-2-idx+map.count)%map.count:idx
   if(map.reverse){const start=side.startT??0,end=side.endT??1;if('startT'in side||'endT'in side){side.startT=1-end;side.endT=1-start}changed++}
  }
  if(changed%2)seam.reverseB=!Boolean(seam.reverseB)
  return seam
 })
 return {document,report:{reversed,removed,removedSeams:(project.seams?.length||0)-document.seams.length}}
}
const fixtures=GARMENT_TEMPLATES.slice(0,10).map(({id})=>[id,createTemplateProject(id),{}])
const reversed=createTemplateProject('pants');reversed.pieces[0].points.reverse();const target=reversed.seams.find(s=>s.a?.pieceId===reversed.pieces[0].id);if(target){target.a.edgeIndex=1;target.a.startT=.2;target.a.endT=.7}fixtures.push(['reversed-partial-seam',reversed,{}])
const micro=createTemplateProject('tee');micro.pieces[0].points.splice(1,0,{...micro.pieces[0].points[0],x:micro.pieces[0].points[0].x+1e-7});fixtures.push(['micro-edge',micro,{}])
const curve=createTemplateProject('pants');const cp=curve.pieces[0];cp.notches=[{edgeIndex:0,t:.22,type:'double',depthCm:.4}];cp.curves={...cp.curves,0:{cp1:{x:1,y:2},cp2:{x:3,y:4}}};cp.points.reverse();fixtures.push(['curved-notch-reversed',curve,{}])
for(const min of [0,-1,NaN,Infinity])fixtures.push(['invalid-min-'+String(min),createTemplateProject('tee'),{minimumEdgeCm:min}])
for(let n=0;n<80;n++){const p=createTemplateProject('tee');const piece=p.pieces[0];const offset=(n%2?1:-1)*(.001+n*.00001);piece.points[1]={...piece.points[0],x:piece.points[0].x+offset};if(n%3===0)piece.points.reverse();fixtures.push(['seed-'+n,p,{minimumEdgeCm:.01}])}
let assertions=0
function capture(fn){try{return {ok:true,result:fn()}}catch(error){return {ok:false,error:String(error.message)}}}
function compare(stage){for(const [name,project,options] of fixtures){const snapshot=structuredClone(project);const a=capture(()=>reference(project,options)),b=capture(()=>prepareNativePatternExport(project,options));assert.deepStrictEqual(b,a,stage+':'+name);assert.deepStrictEqual(project,snapshot,stage+':immutable:'+name);assertions+=2}}
assert.equal(rustExportContourStatus().backend,'javascript-fallback');compare('JS fallback')
const wasm=new URL('../public/wasm/exo_export_contour_kernel.wasm',import.meta.url);assert(existsSync(wasm),'Rust export kernel binary required for loaded parity')
assert.equal(await initializeRustExportContourKernel({bytes:readFileSync(wasm)}),true);assert.equal(rustExportContourStatus().backend,'rust-wasm');compare('WASM')
console.log(JSON.stringify({pass:true,fixtures:fixtures.length,assertions,wasmLoaded:true,originalProjectImmutable:true}))
