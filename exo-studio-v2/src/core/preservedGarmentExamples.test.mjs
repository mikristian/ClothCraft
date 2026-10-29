import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {PRESERVED_DENIM_LIBRARY_ID,PRESERVED_TSHIRT_LIBRARY_ID,PRESERVED_GARMENTS,ensurePreservedGarmentsInLibrary,readPreservedGarment} from './preservedGarmentExamples.js'

const fetchFile=async url=>{
  const file=new URL(`../../public${url}`,import.meta.url)
  const data=await fs.readFile(file)
  return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}
}

test('archived jeans and prior T-shirt are real independent native snapshots with fixed checksums',async()=>{
  const denim=await readPreservedGarment(PRESERVED_GARMENTS[0],fetchFile)
  const tee=await readPreservedGarment(PRESERVED_GARMENTS[1],fetchFile)
  assert.equal(denim.template.panels.length,24)
  assert.equal(tee.template.panels.length,2)
  assert.match(denim.template.name,/501/)
  assert.match(tee.template.name,/tshirt/i)
  assert.notDeepEqual(denim.template,tee.template)
})

test('first library import creates records once without overwriting saved user edits',async()=>{
  const store=new Map(),writes=[]
  const args={fetcher:fetchFile,get:async id=>store.get(id),save:async value=>{
    writes.push(value.id)
    store.set(value.id,value)
    return value
  }}
  const first=await ensurePreservedGarmentsInLibrary(args)
  assert.deepEqual(writes,[PRESERVED_DENIM_LIBRARY_ID,PRESERVED_TSHIRT_LIBRARY_ID])
  assert(first.every(r=>r.added))
  assert.match(store.get(PRESERVED_DENIM_LIBRARY_ID).previewUrl,/^data:image\/svg\+xml/)
  store.get(PRESERVED_DENIM_LIBRARY_ID).description='Edited by user'
  const second=await ensurePreservedGarmentsInLibrary(args)
  assert(second.every(r=>!r.added))
  assert.equal(writes.length,2)
  assert.equal(store.get(PRESERVED_DENIM_LIBRARY_ID).description,'Edited by user')
})

test('corrupted archive fails closed before any project import',async()=>{
  const bytes=await fs.readFile(new URL('../../public/saved-garments/'+PRESERVED_GARMENTS[0].file,import.meta.url))
  const damaged=Buffer.from(bytes);damaged[100]=damaged[100]===65?66:65
  await assert.rejects(()=>readPreservedGarment(PRESERVED_GARMENTS[0],async()=>({ok:true,arrayBuffer:async()=>damaged.buffer.slice(damaged.byteOffset,damaged.byteOffset+damaged.byteLength)})),/checksum mismatch/)
})
