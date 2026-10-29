// Disposable verification of native manufacturing geometry in DXF and SVG.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseDxfPatterns} from '../../src/core/dxf.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar))
const dir=mkdtempSync(path.join(tmpdir(),'exo-pom-pair-'))
const child=spawn(binary,[avatar,path.join(dir,'fitting.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
child.stderr.on('data',x=>stderr+=x)
createInterface({input:child.stdout}).on('line',line=>{const next=pending;pending=null;next?.(JSON.parse(line))})
const rpc=input=>new Promise((resolve,reject)=>{
 assert(!pending)
 const timeout=setTimeout(()=>{pending=null;reject(Error('Rust timeout: '+stderr))},30000)
 pending=r=>{clearTimeout(timeout);r.ok?resolve(r.data):reject(Error(r.error))}
 child.stdin.write(JSON.stringify(input)+'\n')
})
const near=(a,b,t=.00001)=>assert(Math.abs(a-b)<=t,`${a} != ${b}`)
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const entityRows=dxf=>{
 const lines=dxf.trim().split(/\r?\n/),entries=[];assert.equal(lines.length%2,0)
 for(let i=0;i<lines.length;i+=2) {
  const code=Number(lines[i]);assert(Number.isInteger(code))
  if(code===0)entries.push({type:lines[i+1],fields:[]})
  else entries.at(-1)?.fields.push([code,lines[i+1]])
 }
 return entries
}
const val=(e,k)=>e.fields.find(([code])=>code===k)?.[1]
const xy=(e,a=10,b=20)=>[Number(val(e,a)),Number(val(e,b))]
const segment=e=>[xy(e),xy(e,11,21)]
const byLayer=(es,layer)=>es.filter(e=>val(e,8)===layer)
const parseSvgStitch=s=>[...s.matchAll(/<polyline\b[^>]*data-pattern-role="stitch"[^>]*points="([^"]+)"/g)].map(m=>m[1].split(' ').map(p=>p.split(',').map(Number)))
const between=(a,b)=>near(length(a,b),0,.00001)
const check=async()=>{
 let state=await rpc({op:'open',preset:'tshirt'})
 const edit=async command=>{state=await rpc({op:'edit',revision:state.revision,command});return state}
 await edit({kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric:state.template.fabrics[0].id})
 const panel=state.template.panels.at(-1),id=panel.id,edges=panel.polygon.edges
 for(const edge of edges)await edit({kind:'SeamAllowance',panel:id,edge,width_m:.01})
 const measurement={id:'POM-DXF-1',label:'Horizontal span',a:{edge:edges[0],t:.1},b:{edge:edges[0],t:.9}}
 await edit({kind:'SetMeasurement',panel:id,measurement})
 const beforePair=state.revision
 await edit({kind:'NotchPair',panel:id,edge:edges[0],center_t:.5,spacing_m:.006,depth_m:.004})
 assert.equal(state.revision,beforePair+1)
 const pairState=structuredClone(state.template.panels.find(p=>p.id===id).polygon)
 assert.equal(pairState.notches[edges[0]].length,2)
 const marks=pairState.notches[edges[0]]
 near(marks[0].t,.485);near(marks[1].t,.515)
 const result=await rpc({op:'production-cutlines',revision:state.revision,panel:id})
 assert.equal(result.generatedCount,1)
 const cut=result.panels[0],es=entityRows(cut.dxf),svg=cut.svg
 assert.equal(cut.units,'mm')
 assert.match(cut.dxf,/\$INSUNITS\n70\n4\n/)
 assert.match(svg,/width="240\.000000mm" height="140\.000000mm"/)
 assert.equal(byLayer(es,'CUT_EXO').length,1)
 assert.equal(byLayer(es,'STITCH_EXO').length,4)
 assert.equal(byLayer(es,'NOTCH_EXO').length,2)
 assert.equal(byLayer(es,'POM_EXO').length,1)
 assert.equal(byLayer(es,'POM_LABEL_EXO').length,1)
 assert.equal(byLayer(es,'LABEL_EXO').length,1)
 const label=byLayer(es,'LABEL_EXO')[0]
 assert.equal(label.type,'TEXT');assert.equal(val(label,1),panel.name)
 assert.match(svg,/data-pattern-role="piece-label"/)
 assert(svg.includes('>'+panel.name+'</text>'))
 const stitch=byLayer(es,'STITCH_EXO').map(segment),svgStitch=parseSvgStitch(svg)
 assert.equal(svgStitch.length,4)
 const expected=[[[0,0],[200,0]],[[200,0],[200,100]],[[200,100],[0,100]],[[0,100],[0,0]]]
 for(let i=0;i<4;i++){
  between(stitch[i][0],expected[i][0]);between(stitch[i][1],expected[i][1])
  between(svgStitch[i][0],expected[i][0]);between(svgStitch[i].at(-1),expected[i][1])
 }
 near(cut.areaMm2,26400);near(cut.perimeterMm,680)
 assert.equal(cut.pomMarksMm.length,1)
 const pom=cut.pomMarksMm[0],pomDxf=segment(byLayer(es,'POM_EXO')[0])
 assert.equal(pom.id,measurement.id)
 near(pom.lengthMm,160)
 for(const [a,b] of [[pomDxf[0],pom.startMm],[pomDxf[1],pom.endMm],[[20,0],pom.startMm],[[180,0],pom.endMm]])between(a,b)
 const pomLine=svg.match(/<line\b[^>]*data-pattern-role="pom"[^>]*>/)?.[0]
 assert(pomLine,'Missing SVG POM line')
 const attribute=(tag,key)=>Number(tag.match(new RegExp('\\b'+key+'="([^"]+)"'))?.[1])
 between([attribute(pomLine,'x1'),attribute(pomLine,'y1')],pom.startMm)
 between([attribute(pomLine,'x2'),attribute(pomLine,'y2')],pom.endMm)
 assert.equal(byLayer(es,'POM_LABEL_EXO')[0].type,'TEXT')
 assert.match(val(byLayer(es,'POM_LABEL_EXO')[0],1),/Horizontal span 160\.00 mm/)
 assert.match(svg,/Horizontal span 160\.00 mm/)
 assert.equal(cut.notchMarkCount,2)
 const notchSegments=byLayer(es,'NOTCH_EXO').map(segment)
 for(let i=0;i<2;i++){
  const notch=cut.notchMarksMm[i]
  near(notch.depthMm,4)
  between(notchSegments[i][0],notch.cutStartMm)
  between(notchSegments[i][1],notch.innerEndMm)
  near(length(...notchSegments[i]),4)
 }
 near(length(notchSegments[0][0],notchSegments[1][0]),6)
 assert.throws(()=>parseDxfPatterns(cut.dxf),/would double its seam allowance/)
 const parsed=parseDxfPatterns(cut.dxf,{manufacturingImport:'cut-reference'})
 assert.equal(parsed.factoryCertified,false)
 assert.equal(parsed.referenceSize,'BASE')
 assert.equal(parsed.referenceMode,'cut-reference')
 assert(parsed.pieces.every(piece=>piece.locked&&piece.seamAllowance===0))
 assert(parsed.pieces.every(piece=>piece.patternImportProvenance?.referenceOnly===true&&
   piece.patternImportProvenance?.gradedRuleRecovered===false))
 assert.throws(()=>parseDxfPatterns(cut.dxf,{manufacturingImport:'editable'}),/requires explicit cut-reference or stitch-reference/)
 const invalidStitch=cut.dxf.replace('8\nSTITCH_EXO\n','8\nSTITCH_BROKEN\n')
 assert.throws(()=>parseDxfPatterns(invalidStitch,{manufacturingImport:'cut-reference'}),
   /one closed CUT and one bounded segmented STITCH|broken, duplicate or branching sewn line loop/)
 const badUnits=cut.dxf.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n0')
 assert.throws(()=>parseDxfPatterns(badUnits,{manufacturingImport:'cut-reference'}),/Unsupported or unitless DXF INSUNITS/)
 assert.equal(parsed.pieces.length,1)
 const importedNotchCount=parsed.pieces[0].notches.length
 const points=parsed.pieces[0].points
 near(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),22)
 near(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)),12)
 state=await rpc({op:'undo',revision:state.revision})
 assert.equal(state.template.panels.find(p=>p.id===id).polygon.notches?.[edges[0]]?.length||0,0,'One undo must remove both notches')
 assert.equal(state.template.panels.find(p=>p.id===id).polygon.measurements.length,1)
 state=await rpc({op:'redo',revision:state.revision})
 assert.equal(state.template.panels.find(p=>p.id===id).polygon.notches[edges[0]].length,2)
 const saved=await rpc({op:'save'})
 state=await rpc({op:'open',project:saved.project})
 assert.deepEqual(state.template.panels.find(p=>p.id===id).polygon,pairState)
 let again=await rpc({op:'production-cutlines',revision:state.revision,panel:id})
 assert.equal(again.panels[0].pomMarksMm.length,1)
 assert.equal(again.panels[0].notchMarkCount,2)
 const prior=structuredClone(state.template.panels.find(p=>p.id===id).polygon),revision=state.revision
 await assert.rejects(()=>rpc({op:'edit',revision,command:{kind:'SetMeasurement',panel:id,measurement:{id:'POM-DXF-1',label:'Invalid',a:{edge:'missing',t:.1},b:{edge:edges[0],t:.9}}}}),/POM|boundary/i)
 const rollback=await rpc({op:'snapshot'})
 assert.equal(rollback.revision,revision)
 assert.deepEqual(rollback.template.panels.find(p=>p.id===id).polygon,prior)
 return {pass:importedNotchCount===2,script:'qa-dxf-manufacturing-pom-pair-20261020.mjs',cutMm:[220,120],sourceMm:[200,100],allowanceMm:10,stitchSegments:stitch.length,pomLengthMm:pom.lengthMm,pomDxfSvgParity:true,notches:2,importedNotches:importedNotchCount,notchSpacingMm:6,notchDepthMm:4,dxfPieces:parsed.pieces.length,undoRemovesPair:true,saveReopen:true,invalidRollback:true,factoryApproved:cut.factoryApproved}
}
try{const report=await check();console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1}
finally{child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM')}
