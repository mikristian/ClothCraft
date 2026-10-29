import test from 'node:test'
import assert from 'node:assert/strict'
import {buildMarker,buildFabricMarkers} from './marker.js'
import {markerToSvg,markerToPdf} from './markerArtifacts.js'
import {expandAccuMarkMarkerDemand,validateAccuMarkMarkerProduction} from './accumarkMarkerProduction20261023.js'

const piece=(id,{width=12,height=8,cutQuantity=1,grainAngleDeg=0,fabricId='main',marker={}}={})=>({
  id,name:id,cutQuantity,grainAngleDeg,fabricId,marker,
  points:[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}],
  seamAllowance:0,
})
const project=(pieces=[piece('front')])=>({pieces,
  grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  markerSettings:{fabricWidthsCm:{main:40,lining:20}},
})

test('simple current marker produces full cut quantity and bounded non-overlap at usable width',()=>{
 const source=project([piece('front',{cutQuantity:2}),piece('back',{cutQuantity:2})])
 const copy=structuredClone(source)
 const marker=buildMarker(source,40,1)
 assert.equal(marker.requestedPieces,4)
 assert.equal(marker.unplaced.length,0)
 assert.equal(marker.placements.length,4)
 for(const placement of marker.placements){
  assert(placement.x>=0&&placement.x+placement.width<=40+1e-6)
  assert.equal(placement.crossGrain,false)
 }
 for(let i=0;i<marker.placements.length;i++)for(let j=i+1;j<marker.placements.length;j++){
  const a=marker.placements[i],b=marker.placements[j]
  assert(a.x+a.width+1<=b.x+1e-6||b.x+b.width+1<=a.x+1e-6||
    a.y+a.height+1<=b.y+1e-6||b.y+b.height+1<=a.y+1e-6)
 }
 assert.deepEqual(source,copy)
})

test('separate fabric width is honored, too-wide pieces are reported and not silently counted',()=>{
 const source=project([piece('main',{fabricId:'main'}),piece('lining',{fabricId:'lining',width:24})])
 const markers=buildFabricMarkers(source,150,1.5)
 assert.equal(markers.main.width,40)
 assert.equal(markers.lining.width,20)
 assert.equal(markers.main.unusedPieces,0)
 assert.equal(markers.lining.unusedPieces,1)
 assert.deepEqual(markers.lining.unplaced.map(v=>v.reason),['too-wide'])
})

test('explicit cross-grain permission is required; normal marker offers no 180-degree nap reversal',()=>{
 const source=project([piece('front',{grainAngleDeg:30})])
 const baseline=buildMarker(source,40)
 assert.equal(baseline.placements.length,1)
 assert(Math.abs(baseline.placements[0].rotationDeg+30)<1e-6)
 assert.equal(baseline.placements[0].crossGrain,false)
 const cross=project([piece('front',{grainAngleDeg:30,marker:{allowCrossGrain:true}})])
 const placed=buildMarker(cross,12)
 assert(placed.placements.length===1||placed.unplaced.length===1)
 for(const position of placed.placements){
  const aligned=((position.rotationDeg+30)%360+360)%360
  assert([0,90].some(angle=>Math.abs(aligned-angle)<1e-6))
 }
 const grade=validateAccuMarkMarkerProduction(source,{
  quantitiesBySize:{S:1,M:0},fabricWidthCm:40,nap:true,
  placements:[{size:'S',pieceId:'front',instance:0,x:0,y:0,rotationDeg:150}],
 })
 assert.equal(grade.ok,false)
 assert(grade.issues.some(issue=>issue.code==='INVALID_ROTATION_OR_NAP'))
})

test('missing explicit cut quantity is normalized by basic marker but blocked by production demand API',()=>{
 const source=project([piece('front')])
 delete source.pieces[0].cutQuantity
 assert.equal(buildMarker(source,40).requestedPieces,1)
 assert.throws(()=>expandAccuMarkMarkerDemand(source,{S:1,M:0}),/MISSING_OR_INVALID_CUT_QUANTITY/)
})

test('fold metadata has no proven enforcement: never certify fold acceptance from these APIs',()=>{
 const source=project([piece('front')])
 source.pieces[0].marker={onFold:true}
 const marker=buildMarker(source,40)
 assert.equal(marker.placements.length,1)
 assert.equal('foldVerified' in marker,false)
 const validation=validateAccuMarkMarkerProduction(source,{
  quantitiesBySize:{S:1,M:0},fabricWidthCm:40,
  placements:[{size:'S',pieceId:'front',instance:0,x:4,y:0,rotationDeg:0}],
 })
 assert.equal(validation.cuttingAuthorized,false)
 assert.equal('foldVerified' in validation,false)
})

test('marker plot artifacts remain plot previews and do not imply a cutter profile',()=>{
 const source=project([piece('front')]),marker=buildMarker(source,40)
 const svg=markerToSvg(marker,{project:source,calibration:true})
 assert.match(svg,/id="cut-lines"/)
 assert.match(svg,/100 mm SCALE CHECK/)
 assert.doesNotMatch(svg,/cutterProfile=/)
 const pdf=markerToPdf(marker,{project:source,calibration:true})
 assert(pdf.byteLength>100)
 assert.equal('factoryAccepted' in marker,false)
})
