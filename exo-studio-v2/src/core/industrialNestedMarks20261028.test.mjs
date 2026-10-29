import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {inspectNestedManufacturingMarks20261028 as transfer} from './industrialNestedMarks20261028.mjs'
const setup=()=>{const source=createTeeTemplate();for(const piece of source.pieces){piece.marker={nap:'one-way'};piece.cutQuantity??=1;piece.notches=[]}
 source.pieces[0].notches=[{id:'n',edgeIndex:0,t:.5,type:'single',depthCm:.2}]
 const graded=gradeProject(source,'M'),nest=nestPolygons(graded,{fabricWidth:150,gap:1.5,maxCandidates:50000,placementOrder:'largest-first'});return {graded,nest}}
test('nested notch remains tied to the physical CUT and is not a machine command',()=>{const {graded,nest}=setup(),before=JSON.stringify([graded,nest]);assert.equal(nest.ok,true);const result=transfer(graded,nest);assert.equal(result.ok,true,JSON.stringify(result.issues));assert.equal(result.notchCount,1);assert.equal(result.machineReady,false);assert.equal(result.cuttingAuthorized,false);assert.equal(JSON.stringify([graded,nest]),before)})
test('forged notch placement and unverified drill machinery remain rejected',()=>{const {graded,nest}=setup();nest.placements[0].outline=nest.placements[0].outline.map(p=>({...p,x:p.x+3}));assert.equal(transfer(graded,nest).ok,false);const f=setup();f.graded.pieces[0].drills=[{x:2,y:3}];assert.equal(transfer(f.graded,f.nest).issues[0].code,'DRILL_OR_CUTOUT_PROTOCOL_UNVERIFIED')})
