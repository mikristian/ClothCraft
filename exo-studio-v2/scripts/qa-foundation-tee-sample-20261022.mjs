#!/usr/bin/env node
/** Independent-development acceptance, never a factory pass.
 * Generates a small, revision-pinned, UNAPPROVED Foundation Tee sample ZIP
 * only after all strict XS–XXL sewing, notch and generic DXF checks pass.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname,join,resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {createTeeTemplate} from '../src/data/templates.js'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {buildFactoryPackageZip} from '../src/core/factoryPackage.js'
import {gradeProject} from '../src/core/grading.js'
import {inspectIndustrialPatterns} from '../src/core/industrialPatternQA.js'
import {inspectGradedNotchPairs} from '../src/core/industrialNotchQA.js'
import {inspectGradedCutlines} from '../src/core/industrialCutlineQA.js'
import {inspectProduction} from '../src/core/productionPreflight.js'
import {createTeeNeckbandSampleSet} from '../src/core/teeNeckbandSample.js'
import {unzipSync,strFromU8} from 'fflate'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const python=process.env.EZDXF_PYTHON||'/tmp/exo-ezdxf-qa-20261022/bin/python'
const receiver=join(root,'integrations/industrial-cad/ezdxf/validate_export.py')
const independentCutReader=join(root,'integrations/industrial-cad/ezdxf/qa-cut-stitch.py')
const apparelProfile=join(root,'integrations/industrial-cad/apparel-dxf/audit.py')
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice('--output='.length)
const temp=mkdtempSync(join(tmpdir(),'exo-foundation-tee-'))

function digest(data){return createHash('sha256').update(data).digest('hex')}
function independentDxf(content,{size,pieces,label}) {
 const path=join(temp,`${label}-${size}.dxf`)
 writeFileSync(path,content)
 const p=spawnSync(python,[receiver,path,'--expected-cuts',String(pieces),'--expected-size',size],{
  encoding:'utf8',timeout:12000,maxBuffer:1e6,
 })
 assert.equal(p.status,0,`${label} ${size} third-party CAD parse failed: ${p.stderr||p.stdout||p.error?.message}`)
 const result=JSON.parse(p.stdout)
 assert.equal(result.grain_count,pieces)
 assert.equal(result.insunits,4)
 assert(result.cuts.every(cut=>cut.vertices>=3&&cut.area_mm2>1))
 return {status:'PASS',format:'standard-dxf-not-apparel-astm-aama',cutCount:result.cut_count,grainlines:result.grain_count,
  areasMm2:result.cuts.map(x=>x.area_mm2),sha256:digest(content),independentParser:`ezdxf ${result.version}`}
}

try{
 const project=createTeeTemplate(),unchanged=structuredClone(project)
 const legacy=createDefaultProject()
 const sizes=['XS','S','M','L','XL','XXL']
 assert.deepEqual(project.grading.sizes,sizes)
 assert.equal(inspectIndustrialPatterns(legacy).blockers,44,'Legacy mismatches must remain detectable')
 const all=inspectIndustrialPatterns(project)
 assert.equal(all.blockers,0,JSON.stringify(all.issues.slice(0,3)))
 assert.equal(all.seamReports.length,84)
 assert(all.seamReports.every(row=>row.pass))
 const notches=inspectGradedNotchPairs(project)
 assert.equal(notches.status,'pass',JSON.stringify(notches.issues.slice(0,3)))
 assert.equal(notches.checks.length,24)
 const worstNotchCm=Math.max(...notches.checks.map(row=>row.offsetCm))
 assert(worstNotchCm<0.01,`Notch physical mismatch must stay under 0.1 mm: ${worstNotchCm} cm`)
 const cutlineQA=inspectGradedCutlines(project)
 assert.equal(cutlineQA.blockers,0,JSON.stringify(cutlineQA.issues))
 assert.equal(cutlineQA.checks.length,24)
 const preflight=inspectProduction(project)
 assert.equal(preflight.blockers,0)
 assert.equal(preflight.warnings,0)
 const band=createTeeNeckbandSampleSet(project)
 assert.equal(band.rows.length,6)
 assert.equal(band.factoryCertified,false)
 const zip=buildFactoryPackageZip(project),files=unzipSync(zip)
 const manifest=JSON.parse(strFromU8(files['manifest.json']))
 assert.equal(manifest.files.length,Object.keys(files).length)
 assert(!manifest.files.includes('approved-receiver-import.json'))
 const qa=JSON.parse(strFromU8(files['industrial-pattern-qa.json']))
 assert.equal(qa.blockers,0)
 const notchFileQa=JSON.parse(strFromU8(files['industrial-notch-qa.json']))
 assert.equal(notchFileQa.blockers,0)
 assert.equal(notchFileQa.checks.length,24)
 assert.equal(strFromU8(files['industrial-notch-walk.csv']).split('\n').length,25)
 const cutlineFile=JSON.parse(strFromU8(files['industrial-cutline-qa.json']))
 assert.equal(cutlineFile.blockers,0)
 assert.equal(cutlineFile.checks.length,24)
 assert.equal(strFromU8(files['industrial-cutline-areas.csv']).split('\n').length,25)
 const sampleApproval=JSON.parse(strFromU8(files['factory-sample-approval-gate.json']))
 assert.equal(sampleApproval.status,'blocked','A software pass cannot substitute real factory sampling')
 assert.equal(sampleApproval.factoryCertified,false)
 const records=[]
 let astmReadiness=null
 for(const size of sizes){
  const grade=gradeProject(project,size)
  assert.equal(grade.pieces.length,4)
  const garmentName=manifest.files.find(name=>name.startsWith('patterns/')&&name.endsWith(`-${size.toLowerCase()}.dxf`))
  const bandName=`tee-development/neckband-proposal-${size.toLowerCase()}.dxf`
  assert(garmentName,`Missing ${size} graded garment DXF`)
  assert(files[bandName],`Missing ${size} neckband proposal DXF`)
  const garmentDxf=strFromU8(files[garmentName]),bandDxf=strFromU8(files[bandName])
  const garment=independentDxf(garmentDxf,{size,pieces:4,label:'graded-shirt'})
  const independentPath=join(temp,`graded-shirt-${size}.dxf`)
  const verifyCut=spawnSync(python,[independentCutReader,independentPath,'--size',size,'--pieces','4'],{
    encoding:'utf8',timeout:12000,maxBuffer:1e6,
  })
  assert.equal(verifyCut.status,0,`Independent physical cut/stitch QA failed for ${size}: ${verifyCut.stdout||verifyCut.stderr}`)
  const cutResult=JSON.parse(verifyCut.stdout)
  assert.equal(cutResult.status,'PASS')
  assert.equal(cutResult.cuts,4)
  assert.equal(cutResult.stitch_lines,4)
  for(const cutPiece of cutResult.pieces){
    const identifier=grade.pieces.find(x=>x.name.replace(/[^a-zA-Z0-9_-]/g,'_').toUpperCase()===cutPiece.piece)?.id
    assert(identifier,`Unknown independently imported CUT piece: ${cutPiece.piece}`)
    const expected=cutlineQA.checks.find(row=>row.size===size&&row.pieceId===identifier)
    assert(expected)
    assert(Math.abs(cutPiece.cut_area_mm2-expected.cutAreaCm2*100)<.06,`${size} ${identifier} physical cut area mismatch`)
    assert(Math.abs(cutPiece.stitch_area_mm2-expected.stitchAreaCm2*100)<.06,`${size} ${identifier} stitch area mismatch`)
  }
  const neckband=independentDxf(bandDxf,{size,pieces:1,label:'unapproved-rib-proposal'})
  if(size==='M'){
   const file=join(temp,'graded-shirt-M.dxf')
   const gate=spawnSync(python,[apparelProfile,file,'--profile','astm-d6673-readiness','--expected-cuts','4'],{
    encoding:'utf8',timeout:12000,maxBuffer:1e6,
   })
   assert.equal(gate.status,2,'Current flattened Standard DXF must NOT pass ASTM apparel-native profile')
   const evaluation=JSON.parse(gate.stdout)
   assert.equal(evaluation.result,'FAIL')
   assert.equal(evaluation.dxf_version,'AC1009')
   assert(evaluation.failures.some(x=>x.includes('AutoCAD R13')))
   assert(evaluation.failures.some(x=>x.includes('grade rule table')))
   astmReadiness={size,profile:evaluation.profile,result:'EXPECTED_FAIL',dxfVersion:evaluation.dxf_version,
    unresolved:evaluation.failures,certification:'NOT_CERTIFIED'}
  }
  const proposal=band.rows.find(row=>row.size===size)
  const expectedArea=proposal.proposedCutLengthCm*proposal.proposedCutWidthCm*100
  assert(Math.abs(neckband.areasMm2[0]-expectedArea)<0.04,
   `${size}: independent area did not match proposed neckband rectangle in mm²`)
  records.push({size,garment,independentPhysicalCut:cutResult,neckband,neckbandCutLengthCm:proposal.proposedCutLengthCm})
 }
 const report={schema:'exo-tee-sample-independent-qa.v1',generatedAt:new Date().toISOString(),
  projectId:project.id,projectRevision:project.revision,projectName:project.name,
  strictSeamChecks:all.seamReports.length,strictSeamBlockers:all.blockers,
  notchChecks:notches.checks.length,notchBlockers:notches.blockers,maxNotchMismatchMm:worstNotchCm*10,
  physicallyDistinctGradedCutlines:cutlineQA.checks.length,physicalCutlineBlockers:cutlineQA.blockers,
  originalEssentialShellBlockers:44,
  astmReadiness,
  factoryCertified:false,recipientImportVerified:false,physicalSampleVerified:false,
  xray:'12 generic DXFs parsed by independent ezdxf; six garment DXFs independently verified physical CUT, STITCH and boundary-anchored notches. This is not Gerber/Lectra/AAMA/ASTM receiver evidence.',
  artifactSha256:digest(zip),files:manifest.files.length,records,
  blockingReleaseConditions:[
   'No actual Gerber AccuMark / Lectra Modaris / CLO receiver import-save-export evidence',
   'No independent AAMA/ASTM native grading semantics verification',
   'Unapproved rib neckband fit, material stretch, shrinkage and finished construction',
   'No physical cut/sew/wash/fit sample and named manufacturer sign-off',
  ]}
 assert.deepEqual(project,unchanged,'QA must not change source project')
 if(output){
  const zipFile=resolve(output)
  mkdirSync(dirname(zipFile),{recursive:true})
  writeFileSync(zipFile,zip)
  writeFileSync(zipFile.replace(/\.zip$/i,'.qa.json'),JSON.stringify(report,null,2)+'\n')
 }
 console.log(JSON.stringify(report,null,2))
}finally{rmSync(temp,{recursive:true,force:true})}
