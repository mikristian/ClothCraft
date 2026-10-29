import {test} from 'node:test'
import assert from 'node:assert/strict'
import {viewportHardwarePlacements} from './hardwareViewportSelection.js'
import {applyCloDraftProperty} from './cloPropertyCommands.js'
import {writeSavedProject,readSavedProject} from './projectRestore.js'

test('saved button edits select either imported 3D asset or procedural mesh, and removal clears both',()=>{
 const project={pieces:[{id:'front',points:[{x:0,y:0},{x:15,y:0},{x:15,y:15},{x:0,y:15}],buttons:[
   {id:'library-button',x:4,y:4,diameterCm:1.2},
   {id:'asset-button',x:8,y:8,glbUrl:'data:model/gltf-binary;base64,AAAA',importedAssetId:'asset-1',diameterCm:1.4}
 ]}],seams:[],fabrics:{},simulation:{}}
 const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}
 writeSavedProject(storage,'project','backup',project)
 const reopened=readSavedProject(storage,'project','backup').project
 const selection={source:'draft',type:'button',pieceId:'front',itemId:'asset-button'}
 assert.equal(applyCloDraftProperty(reopened,selection,'diameterCm',1.8).ok,true)
 const displayed=viewportHardwarePlacements(reopened.pieces[0])
 assert.deepEqual(displayed.proceduralButtons.map(item=>item.id),['library-button'])
 assert.deepEqual(displayed.imported.map(item=>item.id),['asset-button'])
 assert.equal(displayed.imported[0].diameterCm,1.8)
 writeSavedProject(storage,'project','backup',reopened)
 const reloaded=readSavedProject(storage,'project','backup').project
 assert.deepEqual(viewportHardwarePlacements(reloaded.pieces[0]).imported.map(item=>item.id),['asset-button'])
 reloaded.pieces[0].buttons=reloaded.pieces[0].buttons.filter(item=>item.id!=='asset-button')
 assert.equal(viewportHardwarePlacements(reloaded.pieces[0]).imported.length,0)
})

test('hidden imported placements and GLB references without usable URLs do not render twice',()=>{
 const piece={buttons:[{id:'missing-url',importedAssetId:'asset-no-url'},{id:'hidden',glbUrl:'file.glb',visible:false}],
   importedHardwarePlacements:[{id:'placed',glb:'hardware.glb'},{id:'hidden-import',glbUrl:'hardware.glb',visible:false}]}
 const selected=viewportHardwarePlacements(piece)
 assert.deepEqual(selected.proceduralButtons.map(item=>item.id),['missing-url'])
 assert.deepEqual(selected.imported.map(item=>item.id),['placed'])
})

test('legacy and current hardware collections persist a single imported mesh per placement ID',()=>{
 const asset={id:'snap-01',glbUrl:'data:model/gltf-binary;base64,AAAA',panel:'front',x:4,y:6}
 const piece={importedHardwarePlacements:[asset],importedHardware:[{...asset}],buttons:[
   {...asset,diameterCm:1.5},
   {id:'button-2',glbUrl:asset.glbUrl,x:7,y:8},
   {id:'ordinary-button',x:10,y:10},
 ]}
 const project={pieces:[{...piece,id:'front',points:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]}],seams:[],fabrics:{},simulation:{}}
 const store=new Map(),storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}
 writeSavedProject(storage,'save','backup',project)
 const reopened=readSavedProject(storage,'save','backup').project
 const selection=viewportHardwarePlacements(reopened.pieces[0])
 assert.deepEqual(selection.imported.map(item=>item.id),['snap-01','button-2'])
 assert.deepEqual(selection.proceduralButtons.map(item=>item.id),['ordinary-button'])
 assert.equal(viewportHardwarePlacements(piece).imported.length,2)
})

test('editable imported button wins over older mirrored GLB placement after edit and save',()=>{
 const mirrored={id:'snap-01',glbUrl:'before.glb',x:1,y:2,rotationDeg:0}
 const piece={buttons:[{...mirrored,glbUrl:'updated.glb',x:8,rotationDeg:45}],
   importedHardwarePlacements:[mirrored],importedHardware:[{...mirrored}]}
 const before=viewportHardwarePlacements(piece)
 assert.equal(before.imported.length,1)
 assert.equal(before.imported[0].glbUrl,'updated.glb')
 assert.equal(before.imported[0].x,8)
 assert.equal(before.imported[0].rotationDeg,45)
 const restored=structuredClone(piece)
 assert.deepEqual(viewportHardwarePlacements(restored).imported,before.imported)
})
