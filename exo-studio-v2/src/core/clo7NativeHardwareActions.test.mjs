import test from 'node:test'
import assert from 'node:assert/strict'
import {applyDraftHardwareAction,constructDraftHardware} from './clo7NativeHardwareActions.js'

const project=()=>({pieces:[{id:'front',points:[{x:0,y:0},{x:20,y:0},{x:20,y:30},{x:0,y:30}]}]})

test('preset identities persist through editable annotations and JSON export',()=>{
  const fixture=project()
  for(const [kind,presetId,edgeIndex] of [['button','four-hole-shirt-button'],['buttonhole','keyhole-buttonhole'],['zipper','coil-zipper-5',1]]){
    const {project:next,collection}=constructDraftHardware(fixture,{kind,pieceId:'front',edgeIndex,hardwarePresetId:presetId})
    assert.equal(next.pieces[0][collection][0].hardwarePresetId,presetId)
    assert.equal(JSON.parse(JSON.stringify(next)).pieces[0][collection][0].hardwarePresetId,presetId)
    assert.equal(fixture.pieces[0][collection],undefined)
  }
})

test('invalid preset, colors, zipper state and malformed geometry reject atomically',()=>{
  for(const command of [
    {kind:'button',hardwarePresetId:'zipper-does-not-exist'},
    {kind:'button',hardwarePresetId:'coil-zipper-5'},
    {kind:'buttonhole',hardwarePresetId:'four-hole-shirt-button'},
    {kind:'zipper',hardwarePresetId:'four-hole-shirt-button',edgeIndex:0},
    {kind:'zipper',edgeIndex:0,fastened:'false'},
    {kind:'zipper',edgeIndex:0,twoWay:1},
    {kind:'binding',edgeIndex:0,color:42},
    {kind:'topstitch',edgeIndex:0,color:'#bad'},
    {kind:'buttonhole',color:{}},
  ]){
    const fixture=project()
    const before=structuredClone(fixture)
    assert.throws(()=>applyDraftHardwareAction(fixture,{pieceId:'front',...command}),JSON.stringify(command))
    assert.deepEqual(fixture,before)
  }
  for(const badPoint of [{x:NaN,y:2},{x:1,y:Infinity},{x:0,y:'0'}]){
    const fixture=project()
    fixture.pieces[0].points[2]=badPoint
    assert.throws(()=>applyDraftHardwareAction(fixture,{kind:'zipper',pieceId:'front',edgeIndex:0}))
    assert.equal(fixture.pieces[0].zippers,undefined)
  }
  const curved=project()
  curved.pieces[0].curves=[{cx:Infinity,cy:12}]
  assert.throws(()=>applyDraftHardwareAction(curved,{kind:'zipper',pieceId:'front',edgeIndex:0}))
  assert.equal(curved.pieces[0].zippers,undefined)
})

test('valid draft zipper and binding remain serializable after validation',()=>{
  const fixture=project()
  const zipper=applyDraftHardwareAction(fixture,{kind:'zipper',pieceId:'front',edgeIndex:1,twoWay:true,fastened:false})
  const binding=applyDraftHardwareAction(fixture,{kind:'binding',pieceId:'front',edgeIndex:1,widthCm:2})
  assert.equal(zipper.item.twoWay,true)
  assert.equal(zipper.item.fastened,false)
  assert.equal(binding.item.widthCm,2)
  assert.deepEqual(JSON.parse(JSON.stringify(fixture)).pieces[0].zippers,fixture.pieces[0].zippers)
})

test('hardware points are attached to selected pattern including boundary, not empty or exterior space',()=>{
  const fixture=project()
  assert.equal(applyDraftHardwareAction(fixture,{kind:'button',pieceId:'front',x:0,y:12}).item.x,0)
  const before=structuredClone(fixture)
  assert.throws(()=>applyDraftHardwareAction(fixture,{kind:'button',pieceId:'front',x:50,y:12}),/attachment/)
  assert.deepEqual(fixture,before)
  const concave=project()
  concave.pieces[0].points=[{x:0,y:0},{x:20,y:0},{x:20,y:8},{x:8,y:8},{x:8,y:30},{x:0,y:30}]
  assert.throws(()=>applyDraftHardwareAction(concave,{kind:'buttonhole',pieceId:'front',x:15,y:15}),/attachment/)
  assert.equal(applyDraftHardwareAction(concave,{kind:'buttonhole',pieceId:'front',x:5,y:15}).ok,true)
})

test('edit and removal keep stable IDs and survive JSON export and reimport',()=>{
  const fixture=project()
  const first=applyDraftHardwareAction(fixture,{kind:'button',pieceId:'front',x:2,y:2,hardwarePresetId:'four-hole-shirt-button'})
  const before=structuredClone(fixture)
  assert.throws(()=>applyDraftHardwareAction(fixture,{operation:'update',kind:'button',pieceId:'front',itemId:first.id,x:100}),/attachment/)
  assert.deepEqual(fixture,before)
  const update=applyDraftHardwareAction(fixture,{operation:'update',kind:'button',pieceId:'front',itemId:first.id,x:3,diameterCm:1.4})
  assert.equal(update.item.id,first.id)
  assert.equal(update.item.y,2)
  assert.equal(update.item.hardwarePresetId,'four-hole-shirt-button')
  const roundtrip=JSON.parse(JSON.stringify(fixture))
  const removed=applyDraftHardwareAction(roundtrip,{operation:'remove',kind:'button',pieceId:'front',itemId:first.id})
  assert.equal(removed.id,first.id)
  assert.equal(roundtrip.pieces[0].buttons.length,0)
  assert.equal(fixture.pieces[0].buttons.length,1)
  assert.throws(()=>applyDraftHardwareAction(roundtrip,{operation:'update',kind:'button',pieceId:'front',itemId:first.id,x:4}),/ID required/)
})

test('edge trim updates validate the target edge and never mutate malformed collections',()=>{
  const fixture=project()
  const zipper=applyDraftHardwareAction(fixture,{kind:'zipper',pieceId:'front',edgeIndex:1,hardwarePresetId:'coil-zipper-5'})
  const binding=applyDraftHardwareAction(fixture,{kind:'binding',pieceId:'front',edgeIndex:2})
  const before=structuredClone(fixture)
  assert.throws(()=>applyDraftHardwareAction(fixture,{operation:'update',kind:'zipper',pieceId:'front',itemId:zipper.id,edgeIndex:500}),/pattern edge/)
  assert.throws(()=>applyDraftHardwareAction(fixture,{operation:'update',kind:'binding',pieceId:'front',itemId:binding.id,edgeIndex:500}),/pattern edge/)
  assert.deepEqual(fixture,before)
  assert.equal(applyDraftHardwareAction(fixture,{operation:'update',kind:'zipper',pieceId:'front',itemId:zipper.id,sliderFraction:0.25}).item.edgeIndex,1)
  const malformed=project()
  malformed.pieces[0].zippers={id:'corrupt'}
  assert.throws(()=>applyDraftHardwareAction(malformed,{kind:'zipper',pieceId:'front',edgeIndex:0}),/must be an array/)
  assert.deepEqual(malformed.pieces[0].zippers,{id:'corrupt'})
})

test('removing a paired button or buttonhole clears dangling references without changing unrelated items',()=>{
  const fixture=project()
  const button=applyDraftHardwareAction(fixture,{kind:'button',pieceId:'front',x:5,y:5})
  const hole=applyDraftHardwareAction(fixture,{kind:'buttonhole',pieceId:'front',x:5,y:5})
  const other=applyDraftHardwareAction(fixture,{kind:'button',pieceId:'front',x:10,y:10})
  fixture.pieces[0].buttons[0].pairedButtonholeId=hole.id
  fixture.pieces[0].buttonholes[0].pairedButtonId=button.id
  const initial=structuredClone(fixture)
  const roundtrip=JSON.parse(JSON.stringify(fixture))
  applyDraftHardwareAction(roundtrip,{operation:'remove',kind:'button',pieceId:'front',itemId:button.id})
  assert.equal(roundtrip.pieces[0].buttonholes[0].pairedButtonId,null)
  assert.equal(roundtrip.pieces[0].buttons[0].id,other.id)
  assert.deepEqual(fixture,initial)
  applyDraftHardwareAction(roundtrip,{operation:'remove',kind:'buttonhole',pieceId:'front',itemId:hole.id})
  assert.deepEqual(roundtrip.pieces[0].buttonholes,[])
  assert.equal(roundtrip.pieces[0].buttons[0].id,other.id)
})

test('property-editor button placement survives save/reopen and validated browser removal clears its mate',async()=>{
  const {applyCloDraftProperty,resolveCloDraftTarget}=await import('./cloPropertyCommands.js')
  const {readSavedProject,writeSavedProject}=await import('./projectRestore.js')
  const initial=project()
  initial.seams=[];initial.fabrics={main:{id:'main'}};initial.simulation={}
  const button=applyDraftHardwareAction(initial,{kind:'button',pieceId:'front',x:6,y:8,hardwarePresetId:'four-hole-shirt-button'})
  const hole=applyDraftHardwareAction(initial,{kind:'buttonhole',pieceId:'front',x:6,y:8,hardwarePresetId:'keyhole-buttonhole'})
  const buttonSelection={source:'draft',type:'button',pieceId:'front',itemId:button.id}
  const holeSelection={source:'draft',type:'buttonhole',pieceId:'front',itemId:hole.id}
  assert.equal(applyCloDraftProperty(initial,buttonSelection,'diameterCm',1.6).ok,true)
  assert.equal(applyCloDraftProperty(initial,holeSelection,'orientationDeg',90).ok,true)
  initial.pieces[0].buttons[0].pairedButtonholeId=hole.id
  initial.pieces[0].buttonholes[0].pairedButtonId=button.id
  const values=new Map()
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}
  writeSavedProject(storage,'garment','garment-backup',initial)
  const recovered=readSavedProject(storage,'garment','garment-backup')
  assert.equal(recovered.status,'primary')
  const reopened=recovered.project
  assert.equal(resolveCloDraftTarget(reopened,buttonSelection).diameterCm,1.6)
  assert.equal(resolveCloDraftTarget(reopened,holeSelection).orientationDeg,90)
  assert.equal(resolveCloDraftTarget(reopened,buttonSelection).hardwarePresetId,'four-hole-shirt-button')
  applyDraftHardwareAction(reopened,{kind:'button',pieceId:'front',operation:'remove',itemId:button.id})
  assert.equal(resolveCloDraftTarget(reopened,buttonSelection),null)
  assert.equal(resolveCloDraftTarget(reopened,holeSelection).pairedButtonId,null)
  assert.equal(initial.pieces[0].buttonholes[0].pairedButtonId,button.id)
})
