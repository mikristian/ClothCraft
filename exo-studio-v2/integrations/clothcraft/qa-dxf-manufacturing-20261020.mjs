// Disposable independent DXF/SVG production-cutline check. No installed bridge writes.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDxfPatterns } from '../../src/core/dxf.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar),'Private Rust binary/avatar required')
const dir=mkdtempSync(path.join(tmpdir(),'exo-dxf-manufacturing-'))
const child=spawn(binary,[avatar,path.join(dir,'fitting.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
child.stderr.on('data',d=>stderr+=d)
createInterface({input:child.stdout}).on('line',line=>{const cb=pending;pending=null;cb?.(JSON.parse(line))})
function rpc(input){return new Promise((resolve,reject)=>{
 assert(!pending,'Only one private command at a time')
 const timeout=setTimeout(()=>{pending=null;reject(Error('Rust timeout '+stderr.slice(-500)))},30000)
 pending=res=>{clearTimeout(timeout);res.ok?resolve(res.data):reject(Error(res.error))}
 child.stdin.write(JSON.stringify(input)+'\n')
})}
const approx=(a,b,tolerance=.001)=>assert(Math.abs(a-b)<=tolerance,`${a} differs from ${b} (tol ${tolerance})`)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
function geometry(points){
 let area=0,perimeter=0
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length]
  area+=a[0]*b[1]-b[0]*a[1];perimeter+=distance(a,b)
 }
 return {area:Math.abs(area)/2,perimeter,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}
}
function entities(text){
 const rows=text.trim().split(/\r?\n/),items=[]
 assert.equal(rows.length%2,0,'DXF has complete group-code/value pairs')
 for(let i=0;i<rows.length;i+=2){
  const code=Number(rows[i]);assert(Number.isInteger(code),'DXF group code is numeric')
  if(code===0){items.push({type:rows[i+1],fields:[]})}else if(items.length){items.at(-1).fields.push([code,rows[i+1]])}
 }
 return items
}
const one=(entity,code)=>entity.fields.find(row=>row[0]===code)?.[1]
function dxfGeometry(text){
 const e=entities(text),poly=e.filter(x=>x.type==='LWPOLYLINE'),notches=e.filter(x=>x.type==='LINE'&&one(x,8)==='NOTCH_EXO')
 const contour=poly.find(x=>one(x,8)==='CUT_EXO')
 assert(contour,'Missing CUT_EXO contour')
 const points=[],fields=contour.fields
 for(let i=0;i<fields.length;i++)if(fields[i][0]===10){assert.equal(fields[i+1]?.[0],20);points.push([Number(fields[i][1]),Number(fields[i+1][1])])}
 assert.equal(Number(one(contour,90)),points.length)
 assert.equal(Number(one(contour,70))&1,1,'Contour is closed')
 return {items:e,points,notches:notches.map(x=>[[10,20],[11,21]].map(c=>c.map(k=>Number(one(x,k))))),layers:[...new Set(e.map(x=>one(x,8)).filter(Boolean))]}
}
function svgGeometry(svg){
 const p=[...svg.matchAll(/<path\b[^>]*d="([^"]+)"/g)].map(m=>m[1]);assert(p.length,'SVG path missing')
 const coords=[...p[0].matchAll(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[2])])
 return {points:coords,notches:p.slice(1).map(s=>[...s.matchAll(/(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[2])]))}
}
try{
 let state=await rpc({op:'open',preset:'tshirt'}),fabric=state.template.fabrics[0].id
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric}})
 const panel=state.template.panels.at(-1),edges=panel.polygon.edges
 for(const edge of edges)state=await rpc({op:'edit',revision:state.revision,command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.01}})
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Notch',panel:panel.id,edge:edges[0],t:.25,depth_m:.004}})
 const production=await rpc({op:'production-cutlines',revision:state.revision,panel:panel.id})
 assert.equal(production.generatedCount,1)
 const cut=production.panels[0],dxf=dxfGeometry(cut.dxf),svg=svgGeometry(cut.svg)
 assert.match(cut.dxf,/\$INSUNITS\n70\n4\n/)
 assert.match(cut.svg,/width="240\.000000mm" height="140\.000000mm"|width="240\.000000mm" height="140\.000000mm"/)
 assert.equal(dxf.points.length,cut.pointsMm.length)
 assert.equal(svg.points.length,cut.pointsMm.length)
 for(let i=0;i<cut.pointsMm.length;i++)for(const observed of [dxf.points[i],svg.points[i]])approx(distance(observed,cut.pointsMm[i]),0,.00001)
 const calculated=geometry(dxf.points)
 approx(calculated.area,cut.areaMm2,.001)
 approx(calculated.perimeter,cut.perimeterMm,.001)
 approx(calculated.area,26400,.001)
 approx(calculated.perimeter,680,.001)
 assert.deepEqual(calculated.bounds.map(v=>Math.round(v)),[-10,-10,210,110])
 assert.equal(dxf.notches.length,1)
 assert.equal(svg.notches.length,1)
 assert.equal(dxf.notches[0].length,2)
 for(let i=0;i<2;i++){
  approx(distance(dxf.notches[0][i],svg.notches[0][i]),0,.00001)
  approx(distance(dxf.notches[0][i],i?cut.notchMarksMm[0].innerEndMm:cut.notchMarksMm[0].cutStartMm),0,.00001)
 }
 approx(distance(...dxf.notches[0]),4,.00001)
 assert.throws(()=>parseDxfPatterns(cut.dxf),/would double its seam allowance/)
 const parsed=parseDxfPatterns(cut.dxf,{manufacturingImport:'cut-reference'})
 assert(parsed.pieces.every(piece=>piece.seamAllowance===0&&piece.locked))
 assert.equal(parsed.pieces.length,1)
 assert.equal(parsed.pieces[0].notches.length,1)
 const restored=parsed.pieces[0].points.map(p=>[p.x*10,p.y*10])
 const restoredGeom=geometry(restored)
 approx(restoredGeom.area,calculated.area,.001)
 approx(restoredGeom.perimeter,calculated.perimeter,.001)
 approx(restoredGeom.bounds[2]-restoredGeom.bounds[0],220,.001)
 approx(restoredGeom.bounds[3]-restoredGeom.bounds[1],120,.001)
 const gaps={sewContourLayer:!dxf.layers.some(x=>/SEW|STITCH/.test(x)),dxfPieceLabel:!dxf.items.some(x=>x.type==='TEXT'||x.type==='MTEXT'),svgPieceLabel:!/<text\b/.test(cut.svg),dxfPOM:!dxf.layers.some(x=>/POM|MEASURE/.test(x)),factoryApproved:cut.factoryApproved}
 console.log(JSON.stringify({pass:true,privateFixture:dir,contourMm:calculated,allowanceMm:10,notchMm:4,notchStation:.25,svgDxfCoordinateParity:true,dxfReaderRoundtrip:true,format:production.format,exportLayers:dxf.layers,confirmedGaps:gaps},null,2))
}finally{child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM')}
