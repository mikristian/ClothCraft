import test from 'node:test'
import assert from 'node:assert/strict'
import {printPieces20261025,nestPrintPieces20261025,computePrintRollLength20261025,auditPrintSourceCompleteness20261025,auditPrintLayout20261025,planPrintPages20261025,renderPrintPageSvg20261025,createPrintPdf20261025,printPngDimensions20261025} from './printLayout20261025.js'

const legacy={pieces:[
  {id:'front',name:'Front',fabricId:'cotton',points:[{x:0,y:0},{x:50,y:0},{x:50,y:70},{x:0,y:70}]},
  {id:'back',name:'Back',fabricId:'cotton',points:[{x:0,y:0},{x:50,y:0},{x:50,y:70},{x:0,y:70}]},
]}
test('legacy centimeter panels retain physical bounds and area',()=>{
  const pieces=printPieces20261025(legacy)
  assert.equal(pieces.length,2)
  assert.deepEqual([pieces[0].widthCm,pieces[0].heightCm,pieces[0].areaCm2],[50,70,3500])
})
test('native meter panels convert to centimeters without editing source',()=>{
  const snapshot={template:{panels:[{id:'n',name:'Native',fabric:'main',polygon:{points:[[0,0],[.5,0],[.5,.7],[0,.7]],edges:['a','b','c','d'],curves:{}}}]}}
  const before=structuredClone(snapshot)
  const pieces=printPieces20261025(snapshot,{native:true})
  assert.equal(pieces[0].widthCm,50)
  assert.equal(pieces[0].heightCm,70)
  assert.deepEqual(snapshot,before)
})
test('shelf packing stays within roll and detects overlap and missing parts',()=>{
  const pieces=printPieces20261025(legacy)
  const nested=nestPrintPieces20261025(pieces,110,2)
  assert.equal(nested.unplaced.length,0)
  assert.deepEqual(auditPrintLayout20261025(pieces,nested.placements,110),[])
  const overlap={front:{x:2,y:2},back:{x:4,y:3}}
  assert(auditPrintLayout20261025(pieces,overlap,110).some(message=>message.includes('overlaps')))
  assert(auditPrintLayout20261025(pieces,{front:{x:2,y:2}},110).some(message=>message.includes('unplaced')))
})
test('roll too narrow never silently rotates grain direction',()=>{
  const pieces=printPieces20261025(legacy)
  const plan=nestPrintPieces20261025(pieces,40,1)
  assert.deepEqual(plan.unplaced,['front','back'])
  assert.throws(()=>nestPrintPieces20261025(pieces,-1),/Invalid roll width/)
})
test('curved outlines are sampled for print preview',()=>{
  const source={pieces:[{id:'curve',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],curves:{0:{cx:5,cy:-4}}}]}
  const [p]=printPieces20261025(source)
  assert(p.points.length>4)
  assert(p.heightCm>10)
})
test('A4 tile plan preserves actual paper size, printable margins and physical coordinates',()=>{
  const plan=planPrintPages20261025({widthCm:40,heightCm:70,paper:'A4',marginCm:.5})
  assert.equal(plan.sheetWidthCm,21)
  assert.equal(plan.printableWidthCm,20)
  assert.deepEqual([plan.cols,plan.rows,plan.pages.length],[2,3,6])
  assert.equal(plan.pages[5].col,1)
  assert.equal(plan.pages[5].row,2)
  const half=planPrintPages20261025({widthCm:40,heightCm:70,paper:'A4',marginCm:.5,scale:50})
  assert.deepEqual([half.cols,half.rows],[1,2])
})
test('landscape custom dimensions, zero margins and strict printable bounds',()=>{
  const plan=planPrintPages20261025({widthCm:10,heightCm:10,paper:'Custom',customWidthCm:21,customHeightCm:30,orientation:'landscape',marginCm:0})
  assert.deepEqual([plan.sheetWidthCm,plan.sheetHeightCm],[30,21])
  assert.throws(()=>planPrintPages20261025({widthCm:50,heightCm:50,marginCm:11}),/Invalid printable margins/)
  assert.throws(()=>planPrintPages20261025({widthCm:1000,heightCm:1000}),/requires .* pages/)
  assert.throws(()=>planPrintPages20261025({widthCm:10,heightCm:10,scale:0}),/Print scale/)
})
test('print page SVG has centimeter-sized page, physical clip and escaped labels',()=>{
  const pieces=printPieces20261025(legacy)
  const plan=planPrintPages20261025({widthCm:110,heightCm:85,paper:'A3',marginCm:.5})
  const page=renderPrintPageSvg20261025({pieces,placements:{front:{x:2,y:2},back:{x:56,y:2}},plan,page:plan.pages[1],fabricId:'A&B',revision:'<draft>'})
  assert.match(page,/width="29.7cm" height="42cm"/)
  assert.match(page,/clip-path="url\(#printable\)"/)
  assert.match(page,/A&amp;B/)
  assert.match(page,/&lt;draft&gt;/)
  assert.match(page,/calibration/)
  assert.match(page,/translate\(-28\.2 0\.5\)/)
  assert.throws(()=>renderPrintPageSvg20261025({pieces,placements:{},plan,page:{number:999,row:0,col:0}}),/Invalid print page/)
})
test('direct PDF has real page MediaBoxes, vector clips, byte correct cross references, and escaped labels',()=>{
  const pieces=printPieces20261025(legacy)
  const plan=planPrintPages20261025({widthCm:40,heightCm:70,paper:'A4',marginCm:.5})
  const bytes=createPrintPdf20261025({pieces,placements:{front:{x:1,y:1},back:{x:52,y:2}},plan,fabricId:'bad)\\ (hack',revision:'mémoire'})
  const pdf=new TextDecoder().decode(bytes)
  assert(pdf.startsWith('%PDF-1.4\n'))
  assert.equal((pdf.match(/\/Type \/Page \/Parent/g)||[]).length,6)
  assert.equal((pdf.match(/\/MediaBox \[0 0 595\.27559 841\.88976\]/g)||[]).length,6)
  assert.equal((pdf.match(/ re W n/g)||[]).length,6)
  assert(pdf.includes('me?moire'))
  assert(pdf.includes('bad\\)\\\\ \\(hack'))
  const xref=Number(pdf.match(/startxref\n(\d+)\n%%EOF/)[1])
  assert.equal(pdf.slice(xref,xref+5),'xref\n')
  const offsets=[...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map(m=>Number(m[1]))
  assert(offsets.length>10)
  for(let i=0;i<offsets.length;i++)assert(pdf.slice(offsets[i]).startsWith(`${i+1} 0 obj\n`))
  assert.deepEqual(createPrintPdf20261025({pieces,placements:{front:{x:1,y:1},back:{x:52,y:2}},plan,fabricId:'bad)\\ (hack',revision:'mémoire'}),bytes)
  assert.throws(()=>createPrintPdf20261025({pieces:[{id:'bad',points:[[0,0],[NaN,2],[2,0]]}],placements:{bad:{x:0,y:0}},plan}),/Invalid pattern geometry/)
})
test('PNG sizes use exact requested DPI and reject oversized pages without resizing',()=>{
  const plan=planPrintPages20261025({widthCm:15,heightCm:20,paper:'A4'})
  assert.deepEqual(printPngDimensions20261025(plan,300),{width:2480,height:3508,dpi:300,pixels:2480*3508,widthCm:21,heightCm:29.7})
  assert.deepEqual([printPngDimensions20261025(plan,150).width,printPngDimensions20261025(plan,150).height],[1240,1754])
  assert.throws(()=>printPngDimensions20261025({sheetWidthCm:100,sheetHeightCm:100},300),/safety limit/)
  assert.throws(()=>printPngDimensions20261025(plan,72),/150 or 300/)
})
test('native garment includes all T-shirt panels, fabrics and explicit construction cut counts',()=>{
  const panel=(id,fabric,cutQuantity=1)=>({id,name:id,fabric,cutQuantity,polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],curves:{}}})
  const source={template:{panels:[panel('front','body'),panel('back','body'),panel('sleeve','body',2),panel('collar','rib',2)]}}
  const before=structuredClone(source)
  const pieces=printPieces20261025(source,{native:true})
  assert.equal(pieces.length,6)
  assert.deepEqual(pieces.filter(p=>p.fabricId==='body').map(p=>p.id),['front','back','sleeve::cut-1','sleeve::cut-2'])
  assert.deepEqual(pieces.filter(p=>p.fabricId==='rib').map(p=>p.id),['collar::cut-1','collar::cut-2'])
  assert.deepEqual(source,before)
  const body=pieces.filter(p=>p.fabricId==='body')
  const nested=nestPrintPieces20261025(body,120,2)
  assert.equal(nested.unplaced.length,0)
  assert.deepEqual(auditPrintLayout20261025(body,nested.placements,120),[])
  const length=computePrintRollLength20261025(body,nested.placements,2)
  const plan=planPrintPages20261025({widthCm:120,heightCm:length,paper:'A0'})
  const svg=renderPrintPageSvg20261025({pieces:body,placements:nested.placements,plan,page:plan.pages[0]})
  const pdf=new TextDecoder().decode(createPrintPdf20261025({pieces:body,placements:nested.placements,plan}))
  assert.equal((svg.match(/<polygon /g)||[]).length,4)
  assert.equal((pdf.match(/h S/g)||[]).length,plan.pages.length*4)
})
test('arbitrary garment preserves individual native panels and expands dragged roll height',()=>{
  const item=(id,count)=>({id,name:id,fabricId:'woven',cutQuantity:count,points:[{x:0,y:0},{x:12,y:0},{x:12,y:18},{x:0,y:18}]})
  const pieces=printPieces20261025({pieces:[item('pocket',2),item('flap',1),item('belt',3)]})
  assert.equal(pieces.length,6)
  assert.equal(new Set(pieces.map(p=>p.id)).size,6)
  const nested=nestPrintPieces20261025(pieces,60,1)
  assert.equal(nested.unplaced.length,0)
  const last=pieces.at(-1)
  nested.placements[last.id]={x:2,y:425}
  assert.equal(computePrintRollLength20261025(pieces,nested.placements,1),444)
  const pagePlan=planPrintPages20261025({widthCm:60,heightCm:444,paper:'A0'})
  assert(pagePlan.rows>1)
  const pdf=new TextDecoder().decode(createPrintPdf20261025({pieces,placements:nested.placements,plan:pagePlan}))
  assert.equal((pdf.match(/h S/g)||[]).length,pagePlan.pages.length*pieces.length)
})
test('completeness audits missing native sewing panels and invalid printable outlines without mutating source',()=>{
  const panel=(id,points)=>({id,name:id,polygon:{points,edges:['a','b','c','d'],curves:{}}})
  const valid=[[0,0],[.2,0],[.2,.3],[0,.3]]
  const source={template:{name:'T-shirt',panels:[panel('front',valid),panel('back',valid),panel('pocket',[[0,0],[0,0],[0,0]])],seams:[{id:'join',a:{panel:'front',edge:'a'},b:{panel:'missing',edge:'b'}},{id:'detail',a:{panel:'pocket',edge:'a'},b:{panel:'back',edge:'c'}}]}}
  const before=structuredClone(source)
  const issues=auditPrintSourceCompleteness20261025(source,{native:true})
  assert(issues.some(issue=>issue.includes('missing sewn panel missing')))
  assert(issues.some(issue=>issue.includes('pocket: invalid source print geometry')))
  assert(issues.some(issue=>issue.includes('sewn panel pocket has no printable geometry')))
  assert(!issues.some(issue=>issue.includes('missing front')||issue.includes('missing back')))
  assert.deepEqual(source,before)
  source.template.panels=source.template.panels.filter(p=>p.id!=='back')
  assert(auditPrintSourceCompleteness20261025(source,{native:true}).some(issue=>issue.includes('T-shirt source missing back panel')))
})
test('non T-shirt variants require only authored valid panels and permit integrated sleeves',()=>{
  const panel=(id)=>({id,name:id,polygon:{points:[[0,0],[.5,0],[.5,.7],[0,.7]],edges:['a','b','c','d'],curves:{}}})
  const tee={template:{name:'T-shirt',panels:[panel('front'),panel('back')],seams:[{id:'side',a:{panel:'front',edge:'a'},b:{panel:'back',edge:'b'}}]}}
  assert.deepEqual(auditPrintSourceCompleteness20261025(tee,{native:true}),[])
  const shirt={template:{name:'Dress',panels:[panel('bodice')],seams:[]}}
  assert.deepEqual(auditPrintSourceCompleteness20261025(shirt,{native:true}),[])
  assert.deepEqual(auditPrintSourceCompleteness20261025(legacy),[])
})
