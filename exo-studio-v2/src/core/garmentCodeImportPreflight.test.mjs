import test from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {createTemplateProject} from '../data/templates.js'
import {projectToGarmentCode,garmentCodeToProject} from './garmentCode.js'
import {inspectGarmentCodeImport,assertGarmentCodeImportable} from './garmentCodeImportPreflight.js'

const external=()=>({pattern:{panels:{front:{vertices:[[0,0],[20,0],[20,30],[0,30]],edges:[{endpoints:[0,1]},{endpoints:[1,2]},{endpoints:[2,3]},{endpoints:[3,0]}],translation:[0,0,0],rotation:[0,0,0]},back:{vertices:[[0,0],[20,0],[20,30],[0,30]],edges:[{endpoints:[0,1]},{endpoints:[1,2]},{endpoints:[2,3]},{endpoints:[3,0]}]}},stitches:[[{panel:'front',edge:1},{panel:'back',edge:3}]]},properties:{units_in_meter:100,curvature_coords:'relative'}})
const report=spec=>inspectGarmentCodeImport(spec)
const clone=value=>structuredClone(value)
const invalid=(base,change,code)=>{
 const spec=clone(base);change(spec)
 assert.equal(report(spec).ok,false,JSON.stringify(report(spec)))
 assert.ok(report(spec).issues.some(item=>item.code===code),`${code} missing`)
 assert.throws(()=>assertGarmentCodeImportable(spec),/import blocked/i)
}
test('accepts valid upstream-format closed panel and actual EXO four-piece garment + 10-piece templates',()=>{
 const all=[external(),projectToGarmentCode(createDefaultProject()),projectToGarmentCode(createTemplateProject('hoodie'))]
 for(const spec of all){const before=clone(spec);assert.equal(report(spec).ok,true,JSON.stringify(report(spec).issues));assert.equal(report(spec).factoryCertified,false);assert.doesNotThrow(()=>assertGarmentCodeImportable(spec));assert.deepEqual(spec,before);assert.equal(garmentCodeToProject(spec,createDefaultProject()).pieces.length,report(spec).panelCount)}
})
test('blocks unsupported units, normalization and absolute control coordinates before importing',()=>{
 const base=external()
 invalid(base,s=>s.properties.units_in_meter=1000,'UNSUPPORTED_UNITS')
 invalid(base,s=>s.properties.curvature_coords='absolute','UNSUPPORTED_CURVE_COORDS')
 invalid(base,s=>s.properties.normalize_panel_translation=true,'UNSUPPORTED_TRANSLATION_NORMALIZATION')
})
test('rejects a missing seam panel, invalid edge, malformed seam tuple and self-sewing',()=>{
 const base=external()
 invalid(base,s=>s.pattern.stitches[0][0].panel='nope','DANGLING_SEWING_EDGE')
 invalid(base,s=>s.pattern.stitches[0][1].edge=999,'DANGLING_SEWING_EDGE')
 invalid(base,s=>s.pattern.stitches[0]=[{panel:'front',edge:1}],'INVALID_STITCH_PAIR')
 invalid(base,s=>s.pattern.stitches[0][1]={panel:'front',edge:1},'SELF_SEWING_EDGE')
})
test('rejects disconnected duplicate and branched edge loops instead of silently dropping geometry',()=>{
 const base=external()
 invalid(base,s=>s.pattern.panels.front.edges[2]={endpoints:[0,1]},'DUPLICATE_EDGE')
 invalid(base,s=>s.pattern.panels.front.edges[2]={endpoints:[0,2]},'OPEN_OR_BRANCHING_LOOP')
 invalid(base,s=>s.pattern.panels.front.edges[1].endpoints=[0,99],'EDGE_ENDPOINT')
 invalid(base,s=>s.pattern.panels.front.edges[3].endpoints=[1,1],'EDGE_ENDPOINT')
})
test('blocks cubic contours rather than silently making them straight and NaN controls',()=>{
 const base=external()
 invalid(base,s=>s.pattern.panels.front.edges[0].curvature={type:'cubic',params:[[0.3,0.4],[0.6,0.4]]},'UNSUPPORTED_CURVE')
 invalid(base,s=>s.pattern.panels.front.edges[0].curvature={type:'quadratic',params:[[NaN,0]]},'UNSUPPORTED_CURVE')
})
