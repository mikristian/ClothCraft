#!/usr/bin/env node
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import * as THREE from 'three'
import {createTemplateProject,GARMENT_TEMPLATES} from '../src/data/templates.js'
import {buildCloGarmentSourcePreview,positionCloGarmentSourcePanels} from '../src/core/cloGarmentSourcePreview.js'

const fixture=JSON.parse(await readFile(new URL('../public/garment-previews/clo-male-tshirt.v1.json',import.meta.url),'utf8'))
const project=createTemplateProject('clo-male-tshirt')
assert.ok(GARMENT_TEMPLATES.some(t=>t.id==='clo-male-tshirt'))
assert.equal(fixture.groups.length,7)
assert.equal(fixture.sourceVertices,3661)
assert.equal(fixture.triangleCount,6876)
assert.equal(fixture.sewingPairs.length,23)
assert.equal(fixture.sewingPairs.reduce((sum,p)=>sum+p.paths[0].length,0),182)
assert.equal(project.pieces.length,7)
assert.equal(project.seams.length,0,'Do not invent certified physical sewing constraints from the CLO reference')
assert.equal(project.cloReference.sewnFitCertified,false)
assert.equal(project.cloReference.previewAsset,'/garment-previews/clo-male-tshirt.v1.json')
assert.deepEqual(project.pieces.map(p=>p.points.length),[302,276,151,151,4,6,4])

const resources=[]
const root=new THREE.Group()
const fabric=new THREE.MeshStandardMaterial({color:0xd0d0d0,side:THREE.DoubleSide})
const result=buildCloGarmentSourcePreview(root,fixture,project,fabric,resources)
assert.equal(result.meshCount,7)
assert.equal(result.triangleCount,6876)
assert.equal(result.sourceVertexCount,3661)
assert.equal(result.sewingPathCount,46)
assert.ok(result.edgeCount>100)
assert.deepEqual([...result.byPieceTriangles.keys()].sort(),project.pieces.map(p=>p.id).sort())
const surfaces=[]
root.traverse(node=>{if(node.userData?.isSurface)surfaces.push(node)})
assert.equal(surfaces.length,7)
assert.equal(new Set(surfaces.map(s=>s.userData.sourcePieceId)).size,7,'Must display one unique panel for every authored source cut')
positionCloGarmentSourcePanels(root,'separated')
assert.ok(root.children.filter(node=>node.userData?.sourcePieceId).every(node=>node.position.length()>0))
positionCloGarmentSourcePanels(root,'assembled')
assert.ok(root.children.filter(node=>node.userData?.sourcePieceId).every(node=>node.position.length()<1e-9),'Assembled must restore actual CLO source placements')
for (const surface of surfaces) {
  assert.equal(surface.userData.presentationOnly,true)
  assert.equal(surface.userData.sourceGeometry,'official-clo-obj')
  assert.ok(surface.geometry.getAttribute('normal').count>0)
  assert.ok(surface.geometry.getAttribute('uv').count>0)
  const z=surface.geometry.attributes.position.array.filter((_,i)=>i%3===2)
  if(['clo-front','clo-back','clo-right-sleeve','clo-left-sleeve'].includes(surface.userData.sourcePieceId))
    assert.ok(Math.max(...z)-Math.min(...z)>.10,`${surface.userData.sourcePieceId} must retain CLO 3D curvature`)
}
const bounds=new THREE.Box3().setFromObject(root)
const dims=bounds.getSize(new THREE.Vector3())
assert.ok([dims.x,dims.y,dims.z].every(n=>Number.isFinite(n)&&n>.05))
assert.ok(Math.abs(dims.y-2.1)<.02)
const changed=createTemplateProject('clo-male-tshirt')
changed.pieces[0].points[0].x+=100
assert.notEqual(changed.pieces[0].points[0].x,createTemplateProject('clo-male-tshirt').pieces[0].points[0].x,'Templates must be independent editable copies')
resources.forEach(resource=>resource.dispose())
fabric.dispose()
console.log(`PASS: CLO source preview 7 distinct panels / 3,661 authentic 3D vertices / 6,876 faces / 23 seam groups / 182 ordered correspondence samples; curved 3D mesh, 7 editable unsown 2D cuts and source-only provenance verified.`)
