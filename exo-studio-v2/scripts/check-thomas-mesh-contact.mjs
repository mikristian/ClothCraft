import assert from 'node:assert/strict'
import * as THREE from 'three'
import { readFileSync } from 'node:fs'
import { createAvatarMeshCollider, correctMeshAvatarContacts, selectAvatarBodyMeshes } from '../src/core/meshAvatarContact.js'

// The Thomas GLB is large and contains clothing/trims that are not skin.
// Inspect the authoritative GLB JSON chunk without loading its textures.
const raw = readFileSync('public/avatars/clo-thomas.glb')
assert.equal(raw.toString('utf8',0,4),'glTF')
const jsonLength = raw.readUInt32LE(12)
const gltf = JSON.parse(raw.toString('utf8',20,20+jsonLength))
const bodyMeshIndex = gltf.meshes.findIndex(mesh => mesh.name === 'body_mesh')
assert.ok(bodyMeshIndex >= 0,'Thomas body mesh not found')
const bodyTriangles = gltf.meshes[bodyMeshIndex].primitives.reduce((sum, primitive) =>
  sum + gltf.accessors[primitive.indices].count / 3,0)
assert.equal(bodyTriangles,71410)
const scene = new THREE.Group()
const skin = new THREE.Mesh(new THREE.SphereGeometry(.2,12,8))
skin.name = 'body_mesh'
const accessory = new THREE.Mesh(new THREE.SphereGeometry(.5,12,8))
accessory.name = 'Cloth_mesh'
scene.add(skin,accessory)
const selection = selectAvatarBodyMeshes(scene,'clo-thomas')
assert.deepEqual(selection.names,['body_mesh'])
const included = new Set(selection.meshes)
const collider = createAvatarMeshCollider(scene,{ meshFilter: mesh => included.has(mesh) })
assert.ok(collider?.triangles > 0)
assert.ok(collider.bounds.max.x < .25,'Non-skin geometry contaminated collider')
const particle = {position:new THREE.Vector3(.199,0,0),previous:new THREE.Vector3(.199,0,0),invMass:1}
const simulation = {pieces:new Map([['front',{particles:[particle]}]])}
const contact = correctMeshAvatarContacts(simulation,collider)
assert.ok(contact.checked === 1)
assert.ok(Number.isFinite(contact.maximumIntrusionMm))
collider.dispose()
console.log(JSON.stringify({thomasBodyTriangles:bodyTriangles,excludedAccessories:true,contact},null,2))
