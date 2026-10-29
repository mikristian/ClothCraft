import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {unzipSync,zipSync, strFromU8,strToU8} from 'fflate'
import {createDefaultProject} from '../data/defaultProject.js'
import {createTeeTemplate,createTemplateProject} from '../data/templates.js'
import {buildFactoryPackageZip} from './factoryPackage.js'
import {recoverFactorySourceFromZip} from './factorySourceRecovery.js'
import {sha256Bytes} from './sha256Bytes.js'
import {gradeProject} from './grading.js'

const source=createTeeTemplate()
const packed=buildFactoryPackageZip(source)
const edit=(bytes,fn)=>{
 const files=unzipSync(bytes)
 fn(files)
 return zipSync(files,{level:6})
}
const decoded=file=>JSON.parse(strFromU8(file))

test('SHA256 byte digests equal crypto SHA256 for standard known messages and non-ASCII data',()=>{
 for(const phrase of ['','abc','hello world','ʔ≡天衣无缝','The quick brown fox jumps over the lazy dog']){
  const data=new TextEncoder().encode(phrase)
  assert.equal(sha256Bytes(data),createHash('sha256').update(data).digest('hex'))
 }
 assert.throws(()=>sha256Bytes('unsafe string'),/Uint8Array/)
})

test('source recovers with byte-exact source metadata, curves, per-size grades, and complete immutable file digests',()=>{
 for(const p of [createDefaultProject(),source,createTemplateProject('hoodie')]){
  const original=structuredClone(p)
  const zip=buildFactoryPackageZip(p)
  const recovery=recoverFactorySourceFromZip(zip)
  assert.deepEqual(recovery.project,JSON.parse(JSON.stringify(p)))
  assert.deepEqual(recovery.verifiedSizes,p.grading.sizes)
  assert.equal(recovery.factoryCertified,false)
  assert.equal(recovery.verifiedFiles,recovery.manifest.files.length)
  assert.deepEqual(recovery.project.pieces.map(piece=>piece.curves),JSON.parse(JSON.stringify(p)).pieces.map(piece=>piece.curves))
  for(const size of p.grading.sizes)assert.deepEqual(JSON.parse(JSON.stringify(gradeProject(recovery.project,size))),JSON.parse(JSON.stringify(gradeProject(p,size))))
  assert.deepEqual(p,original,'generation/recovery must not alter active source')
 }
})

test('tampered source or grade-size JSON is rejected before any project state can be recovered',()=>{
 const modifiedSource=edit(packed,files=>{
  const project=decoded(files['garment-source.json'])
  project.pieces[0].points[0].x+=12
  files['garment-source.json']=strToU8(JSON.stringify(project))
 })
 assert.throws(()=>recoverFactorySourceFromZip(modifiedSource),/digest mismatch for garment-source.json/)
 const modifiedSize=edit(packed,files=>{
  const graded=decoded(files['size-run.json'])
  graded.XS.pieces[0].points[0].x+=17
  files['size-run.json']=strToU8(JSON.stringify(graded))
 })
 assert.throws(()=>recoverFactorySourceFromZip(modifiedSize),/digest mismatch for size-run.json/)
})

test('rehashed but inconsistent source and graded contents still reject',()=>{
 const forged=edit(packed,files=>{
  const manifest=decoded(files['manifest.json'])
  const project=decoded(files['garment-source.json'])
  project.pieces[0].points[0].x+=2
  files['garment-source.json']=strToU8(JSON.stringify(project))
  manifest.sha256['garment-source.json']=sha256Bytes(files['garment-source.json'])
  files['manifest.json']=strToU8(JSON.stringify(manifest))
 })
 assert.throws(()=>recoverFactorySourceFromZip(forged),/graded size-run differs/)
 const stale=edit(packed,files=>{
  const manifest=decoded(files['manifest.json'])
  manifest.project.revision+=1
  files['manifest.json']=strToU8(JSON.stringify(manifest))
 })
 assert.throws(()=>recoverFactorySourceFromZip(stale),/project ID, name, units or revision differs/)
})

test('rehashed invalid curve controls and notch edge references cannot be recovered',()=>{
 const change=(mutate)=>edit(packed,files=>{
  const manifest=decoded(files['manifest.json'])
  const project=decoded(files['garment-source.json'])
  mutate(project)
  files['garment-source.json']=strToU8(JSON.stringify(project))
  manifest.sha256['garment-source.json']=sha256Bytes(files['garment-source.json'])
  files['manifest.json']=strToU8(JSON.stringify(manifest))
 })
 assert.throws(()=>recoverFactorySourceFromZip(change(project=>{
   const piece=project.pieces.find(p=>Object.keys(p.curves||{}).length)
   const key=Object.keys(piece.curves)[0]
   piece.curves[key].cx=null
 })),/nonfinite curve control/)
 assert.throws(()=>recoverFactorySourceFromZip(change(project=>{project.pieces[0].notches[0].edgeIndex=999})),/invalid sewing notch geometry/)
})

test('missing, extra, reordered or unsafe archive paths fail closed',()=>{
 assert.throws(()=>recoverFactorySourceFromZip(edit(packed,files=>{delete files['size-run.json']})),/missing manifest, editable source or graded size-run/)
 assert.throws(()=>recoverFactorySourceFromZip(edit(packed,files=>{files['unexpected.txt']=strToU8('unused')})),/manifest inventory does not exactly match/)
 assert.throws(()=>recoverFactorySourceFromZip(edit(packed,files=>{files['../escaped.json']=strToU8('{}')})),/invalid or repeated archive path/)
 assert.throws(()=>recoverFactorySourceFromZip(edit(packed,files=>{files['garment-source.json']=strToU8('{bad')})),/invalid required JSON/)
})

test('legacy ZIP v1 cannot claim checksum-verified factory source recovery',()=>{
 const old=edit(packed,files=>{
  const manifest=decoded(files['manifest.json'])
  manifest.version=1
  delete manifest.sha256
  files['manifest.json']=strToU8(JSON.stringify(manifest))
 })
 assert.throws(()=>recoverFactorySourceFromZip(old),/legacy or unsupported manifest version/)
})

test('decompression size and entry count are checked before unzipping a possible ZIP bomb',()=>{
 const compressed=zipSync({'garment-source.json':new Uint8Array(9*1024*1024)}, {level:9})
 assert(compressed.length<50*1024)
 assert.throws(()=>recoverFactorySourceFromZip(compressed),/file too large/)
 const huge=new Uint8Array(20*1024*1024+1)
 assert.throws(()=>recoverFactorySourceFromZip(huge),/20 MB compressed/)
})
