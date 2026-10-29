import test from 'node:test'
import assert from 'node:assert/strict'
import { stagedPanelPositions } from '../staging.js'
import { inspectNativeAssemblyPose } from './nativeAssemblyPreflight.js'
import { assembleNativeSeams } from './seamAssembly.js'

// Two square, unwarped garment panels are staged 8 cm apart in depth.
// Their matching cutlines are represented by the same pairs consumed by the
// native solver. This tests the actual preview staging -> sewn-pose handoff.
function panel(id, z) {
  const vertices = [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}]
  const staged = stagedPanelPositions({
    piece: {id, arrangement3d:{wrap:'flat',z}}, flatVertices:vertices,
  }, {heightCm:180})
  return {vertices, staged}
}

function fixture() {
  const a = panel('front',0), b = panel('back',.08)
  return {
    particles:[...a.staged,...b.staged].map((point,id)=>({
      id,pieceId:id<4?'front':'back',position:point.toArray(),invMass:1,
    })),
    pieces:[a,b].map((piece,i)=>({id:i?'back':'front',
      particleIndices:[0,1,2,3].map(index=>index+4*i),
      flatVerticesM:piece.vertices.map(vertex=>[vertex.x*.01,vertex.y*.01,0]),
      faces:[[0,1,2],[0,2,3]],
    })),
    constraints:[{type:'seam',a:1,b:4,seamId:'side-seam'},
      {type:'seam',a:2,b:7,seamId:'side-seam'}],
  }
}

test('native assembly physically closes staged corresponding cutlines without excess mesh strain',()=>{
  const source=fixture()
  const before=inspectNativeAssemblyPose(source)
  assert.equal(before.initialSeamGapMaximumMm>100,true)
  const result=assembleNativeSeams(source,{iterations:350,positionStiffness:0,seamStiffness:.6,restStiffness:.85})
  const after=inspectNativeAssemblyPose(result)
  assert.ok(after.initialSeamGapMaximumMm<before.initialSeamGapMaximumMm*.15,
    `Expected >=85% seam closure; ${before.initialSeamGapMaximumMm} -> ${after.initialSeamGapMaximumMm} mm`)
  assert.ok(after.initialMeshPeakEdgeStrainPercent<12,
    `Expected under 12% max panel distortion, got ${after.initialMeshPeakEdgeStrainPercent}%`)
  assert.deepEqual(source,fixture(),'Assembly must preserve authored source and pre-sew staging')
  for(const particle of result.particles)
    assert.deepEqual(particle.previous,particle.position,'Handoff must have zero initial velocity')
})
