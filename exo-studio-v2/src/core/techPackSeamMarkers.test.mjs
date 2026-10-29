import test from 'node:test';import assert from 'node:assert/strict';import {techPackSeamMarkers} from './techPackSeamMarkers.js';
const fixture=()=>({positions:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]],panels:[{id:'front',triangles:[0,1],boundaries:{side:[0,1]}}],template:{seams:[{id:'side-seam',a:{panel:'front',edge:'side'},b:{panel:'back',edge:'side'}}]}});
test('native seam callout attaches to a real boundary vertex and is idempotent',()=>{const s=fixture(),before=structuredClone(s),m=techPackSeamMarkers(s);assert.equal(m.length,1);assert.deepEqual(m[0].anchor.weights,[1,0,0]);assert.equal(m[0].verified,false);assert.equal(techPackSeamMarkers(s,m).length,1);assert.deepEqual(s,before)});
test('manual graphic notes preserved; missing seam geometry is not fabricated',()=>{const m=[{id:'manual-logo',label:'Logo',detail:'Chest graphic'}],s=fixture();s.panels=[];assert.deepEqual(techPackSeamMarkers(s,m),m);assert.deepEqual(techPackSeamMarkers(null),[])});
test('native seam markers never attach to adjacent panel faces sharing a boundary vertex',()=>{
 const s=fixture();s.positions.push([1,1,0]);s.triangles=[[0,2,3],[0,1,2]];s.panels[0].triangles=[1,2];
 const [marker]=techPackSeamMarkers(s);assert.equal(marker.anchor.triangleIndex,1)
 s.panels[0].triangles=[0,1];assert.equal(techPackSeamMarkers(s)[0].anchor.triangleIndex,0)
 s.panels[0].triangles=[1,2];s.triangles[1]=[1,2,3];assert.deepEqual(techPackSeamMarkers(s),[])
})
