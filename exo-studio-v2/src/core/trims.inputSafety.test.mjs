import test from 'node:test'
import assert from 'node:assert/strict'
import {offsetEdgePath,topstitchPaths,zipperPaths,trimSummary,pieceCenter} from './trims.js'

const piece={points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]}

test('invalid trim measurements fall back to finite geometry',()=>{
 const shifted=offsetEdgePath(piece,0,NaN)
 assert.deepEqual(shifted,piece.points.slice(0,2))
 const stitches=topstitchPaths(piece,{edgeIndex:0,rows:Infinity,offsetCm:'broken',rowGapCm:NaN})
 assert.equal(stitches.length,1)
 assert(stitches.flat().every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)))
 const zipper=zipperPaths(piece,{edgeIndex:0,widthCm:-40,offsetCm:Infinity})
 assert.deepEqual(zipper[0],zipper[1])
})

test('trim count agrees with bounded stitch paths',()=>{
 const project={pieces:[{...piece,topstitches:[{edgeIndex:0,rows:1.9},{edgeIndex:1,rows:999},{edgeIndex:2,rows:NaN}],zippers:[{}],buttons:[{}],buttonholes:[{}]}]}
 assert.equal(trimSummary(project).topstitchRows,10)
 assert.equal(trimSummary(project).topstitchRows,project.pieces[0].topstitches.reduce((sum,stitch)=>sum+topstitchPaths(piece,stitch).length,0))
})

test('invalid trim edge indices and broken curves cannot emit nonfinite paths',()=>{
 assert.deepEqual(offsetEdgePath(piece,-1,0),[])
 assert.deepEqual(offsetEdgePath(piece,4,0),[])
 assert.deepEqual(offsetEdgePath(piece,NaN,0),[])
 const broken={...piece,curves:{0:{cx:Infinity,cy:5}}}
 assert.deepEqual(offsetEdgePath(broken,0,1),[])
 assert.deepEqual(zipperPaths(broken,{edgeIndex:0,widthCm:2}),[[],[]])
 assert.deepEqual(offsetEdgePath({...piece,curves:{0:{cx:5,cy:5}}},0,1,Infinity).length,29)
})

test('trim center ignores corrupt vertices while retaining valid points',()=>{
 assert.deepEqual(pieceCenter({points:[{x:2,y:4},{x:Infinity,y:10},{x:6,y:8}]}),{x:4,y:6})
 assert.deepEqual(pieceCenter({points:[{x:NaN,y:2}]}),{x:0,y:0})
})

test('trim geometry refuses overflowed shifted coordinates and accepts absent options',()=>{
 assert.deepEqual(offsetEdgePath({points:[{x:1e308,y:10},{x:1e308,y:0}]},0,1e308),[])
 assert.equal(topstitchPaths(piece).length,1)
 assert.equal(zipperPaths(piece).length,2)
 assert.deepEqual(trimSummary(null),{topstitchRows:0,zippers:0,buttons:0,buttonholes:0})
})
