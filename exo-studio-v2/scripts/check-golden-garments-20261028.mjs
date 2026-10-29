import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {gradeProject} from '../src/core/grading.js'
import {seamAllowanceBoundary} from '../src/core/project.js'
import {projectToDxf} from '../src/core/dxf.js'
import {parseAccuMarkGradedDxfWire20261023} from '../src/core/accumarkGradedDxfRoundtripAudit20261023.js'
const root=process.env.EXO_GOLDEN_LIBRARY_DIR?path.resolve(process.env.EXO_GOLDEN_LIBRARY_DIR):path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../benchmarks/golden-garments/v1')
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
const failures=[],results=[]
const hash=str=>crypto.createHash('sha256').update(str).digest('hex')
const fail=(id,kind,detail)=>failures.push({id,kind,detail})
const expectedCategories=new Set(['T-shirt','Trouser','Jacket','Dress','Complex curved'])
if(manifest.schema!=='exo.golden-garments.v1'||manifest.fixtures?.length!==25||new Set(manifest.fixtures.map(f=>f.id)).size!==25||new Set(manifest.fixtures.map(f=>f.category)).size!==5||!manifest.fixtures.every(f=>expectedCategories.has(f.category)))fail('manifest','INVENTORY','Expected unique frozen 25-case set and five categories')
const checkedSizeCount=manifest.fixtures.reduce((n,f)=>n+f.sizes.length,0)
for(const row of manifest.fixtures){
 const location=path.join(root,row.file)
 if(!/^[a-z0-9-]+\.json$/.test(row.file)||!fs.existsSync(location)){fail(row.id,'MISSING_FILE',row.file);continue}
 const text=fs.readFileSync(location,'utf8')
 if(hash(text)!==row.sha256){fail(row.id,'GOLDEN_HASH_DRIFT','Immutable reference changed; use an explicitly reviewed new golden version');continue}
 const f=JSON.parse(text)
 if(f.id!==row.id||f.category!==row.category||f.schema!=='exo.golden-garment.v1'||f.productionApproval?.receivingCAD!==false||f.productionApproval?.cutter!==false)fail(row.id,'METADATA','Fixture identity or approval assertion changed')
 if(f.pieces.length!==f.expected.pieceCount||f.seams.length!==f.expected.seamCount||f.expected.sizes.length!==row.sizes.length)fail(row.id,'INVENTORY','Count drift')
 if(new Set(f.pieces.map(p=>p.id)).size!==f.pieces.length||f.pieces.some(p=>!p.points?.length||p.points.length<3||!Number.isFinite(p.grainAngleDeg)||p.cutQuantity<1))fail(row.id,'PATTERN_IDENTITY','Missing physical geometry, grain or cut quantities')
 for(const seam of f.seams){const a=f.pieces.find(p=>p.id===seam.a?.pieceId),b=f.pieces.find(p=>p.id===seam.b?.pieceId);if(!a||!b||!Number.isInteger(seam.a.edgeIndex)||!Number.isInteger(seam.b.edgeIndex)||seam.a.edgeIndex<0||seam.b.edgeIndex<0||seam.a.edgeIndex>=a.points.length||seam.b.edgeIndex>=b.points.length)fail(row.id,'SEAM_IDENTITY',seam.id)}
 let passes=0
 for(const expected of f.expected.sizes){
  try{
   const graded=gradeProject(f,expected.size)
   if(graded.previewSize!==expected.size||graded.pieces.length!==expected.pieces.length)throw Error('Grade size identity changed')
   for(const golden of expected.pieces){const p=graded.pieces.find(p=>p.id===golden.id);if(!p||p.points.length!==golden.vertices||Object.keys(p.curves||{}).length!==golden.curves||p.notches.reduce((n,m)=>n+(m.type==='double'?2:1),0)!==golden.notches)throw Error(`Graded topology/notches changed for ${golden.id}`)
    const outline=seamAllowanceBoundary(p,12);const area=Math.round(Math.abs(outline.reduce((a,v,i,ar)=>a+v.x*ar[(i+1)%ar.length].y-ar[(i+1)%ar.length].x*v.y,0))/2*1000)/1000
    if(!Number.isFinite(area)||Math.abs(area-golden.cutAreaCm2)>0.002)throw Error(`Physical CUT area changed: ${golden.id} ${area} versus ${golden.cutAreaCm2}`)
   }
   // DXF interchange may legitimately refuse difficult synthetic patterns.
   // A failed DXF is recorded as an explicit capability gap; valid exporter
   // output must have correct units, CUT layers and a correctly labeled size.
   const wire=projectToDxf(graded,expected.size,{cutlineMode:'manufacturing',requireGradedGeometry:true})
   const parsed=parseAccuMarkGradedDxfWire20261023(wire)
   if(!parsed.ok||parsed.units!=='4'||!wire.includes(`GARMENT_STUDIO_SIZE ${expected.size}`))throw Error('DXF receiver wire invalid')
   passes++
  }catch(error){fail(row.id,`SIZE_${expected.size}`,String(error.message||error))}
 }
 results.push({id:row.id,category:row.category,passedSizes:passes,totalSizes:f.expected.sizes.length,pieces:f.pieces.length,seams:f.seams.length,notches:f.expected.totalNotches})
}
const summary={ok:failures.length===0,libraryVersion:'v1',fixtureCount:manifest.fixtures.length,expectedFixtureCount:25,sizeChecks:checkedSizeCount,passedSizeChecks:results.reduce((n,r)=>n+r.passedSizes,0),categories:Object.fromEntries([...expectedCategories].map(c=>[c,manifest.fixtures.filter(f=>f.category===c).length])),failures:failures.slice(0,150),results,receivingCadApproved:false,cuttingAuthorized:false}
if(process.argv.includes('--json'))console.log(JSON.stringify(summary,null,2));else{console.log(`GOLDEN GARMENTS ${summary.ok?'PASS':'FAIL'}: ${summary.passedSizeChecks}/${summary.sizeChecks} graded size checks, ${summary.fixtureCount}/25 fixtures`);for(const x of failures.slice(0,24))console.log('BLOCKER',x.id,x.kind,x.detail)}
if(!summary.ok)process.exitCode=1
