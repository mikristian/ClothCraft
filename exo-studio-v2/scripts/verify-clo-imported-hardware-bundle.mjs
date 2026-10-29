// Verify the complete private CLO hardware library accompanies the V2 release.
// Read-only: no changes to original installed CLO resources or saved projects.
import assert from 'node:assert/strict'
import {readFileSync,statSync,existsSync} from 'node:fs'
import {resolve,join,sep} from 'node:path'

const root=resolve(process.argv[2]||'dist')
const prefix=join(root,'clo-hardware-converted')
const source=join(prefix,'manifest.json')
assert(existsSync(source),`Missing converted CLO hardware manifest: ${source}`)
const manifest=JSON.parse(readFileSync(source,'utf8'))
assert(Array.isArray(manifest.items),'CLO hardware manifest must contain an items array')
assert(manifest.items.length>0,'Imported hardware manifest is empty')
const ids=new Set()
let converted=0,referenceOnly=0,thumbnails=0
for(const asset of manifest.items){
  assert(asset&&typeof asset.id==='string'&&asset.id.length>0, 'Every imported CLO entry must have a stable id')
  assert(!ids.has(asset.id),`Duplicate imported hardware id: ${asset.id}`)
  ids.add(asset.id)
  const check=(url,extension,label)=>{
    assert(typeof url==='string'&&url.startsWith('/clo-hardware-converted/')&&!url.includes('..'),
      `${asset.id}: invalid ${label} URL`)
    assert(url.toLowerCase().endsWith(extension),`${asset.id}: invalid ${label} format`)
    const file=resolve(root,'.'+url)
    assert(file.startsWith(prefix+sep),`${asset.id}: ${label} outside private CLO bundle`)
    assert(existsSync(file)&&statSync(file).isFile()&&statSync(file).size>20,
      `${asset.id}: ${label} missing or empty: ${file}`)
    return file
  }
  check(asset.thumbnail,'.png','thumbnail')
  thumbnails++
  if(asset.glb){
    const file=check(asset.glb,'.glb','3D mesh')
    assert(readFileSync(file).subarray(0,4).toString('ascii')==='glTF',`${asset.id}: malformed GLB header`)
    converted++
  }else referenceOnly++
}
assert(Number(manifest.sourceCount)===manifest.items.length,'Manifest source count differs from actual files')
assert(Number(manifest.convertedCount)===converted,'Manifest GLB count differs from asset files')
assert(converted>0&&referenceOnly>0,'Hardware library must retain both models and source-only definitions')
console.log(JSON.stringify({pass:true,bundle:root,files:manifest.items.length,glbModels:converted,sourceOnly:referenceOnly,thumbnails},null,2))
