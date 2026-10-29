import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createTeeTemplate} from '../data/templates.js'
import {projectToDxf} from './dxf.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {createSeamlyAamaExoDraft20261023 as convert} from './seamlyAamaToExoDraft20261023.js'
const wire=readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf',import.meta.url),'utf8')
const file={name:'male-shirt-aama.dxf',content:wire,sha256:'a'.repeat(64)}
const engine={engine:'Seamly2D',manufacturingApproved:false,inputSha256:'b'.repeat(64),measurementsSha256:'c'.repeat(64)}

test('one physical CUT per upstream source block; DRAW contours are metadata, not duplicate pieces',()=>{
  const project=createTeeTemplate()
  const before=JSON.stringify(project)
  const {project:converted,semantic}=convert(project,{file,engine,unit:'mm',editable:true})
  assert.equal(converted.pieces.length,17)
  assert.equal(semantic.pieces.length,17)
  assert(converted.pieces.every(p=>p.sourceLayer==='1'&&p.seamAllowance===0&&p.patternImportProvenance.referenceOnly))
  assert(converted.pieces.every(p=>p.seamlySourceGuides.sewingContourCandidate?.length>=3))
  assert.equal(converted.seams.length,0)
  assert.equal(converted.patternSource.factoryCertified,false)
  assert.equal(converted.patternSource.referenceOnly,true)
  assert.equal(JSON.stringify(project),before)
  assert.throws(()=>projectToDxf(converted),/DXF export refused/)
  assert.throws(()=>buildFactoryPackageFiles(converted),/Factory package refused/)
})

test('locked native source preview and explicit 1:1 scale keep metadata without automatic sewing',()=>{
  const result=convert(createTeeTemplate(),{file,engine,unit:'cm',editable:false})
  assert(result.project.pieces.every(p=>p.locked&&p.active3d===false))
  assert.match(result.project.patternSource.sourceScale,/cm\/unit/)
  assert.equal(result.semantic.manufacturingApproved,false)
  assert.throws(()=>convert(createTeeTemplate(),{file,engine,editable:true}),/Explicit source unit/)
  assert.throws(()=>convert(createTeeTemplate(),{file,engine:{...engine,manufacturingApproved:true},unit:'mm'}),/unapproved/)
})
