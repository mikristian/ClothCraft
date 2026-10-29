import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {getEdgeSeamAllowance} from './project.js'
import {inspectIndustrialDoubleNotches20261023} from './industrialDoubleNotchPreflight20261023.js'

const stations=[0,.001,.01,.05,.5,.95,.99,.999,1]
test('Foundation Tee: 6 sizes x 9 stations, preflight vs real factory DXF, distinguishing endpoint and geometry failures',()=>{
  const project=createTeeTemplate()
  assert.equal(project.grading.sizes.length,6)
  for (const piece of project.pieces) piece.notches=[]
  const piece=project.pieces.find(p=>Object.keys(p.curves||{}).some(k=>getEdgeSeamAllowance(p,+k)>.6))
  assert.ok(piece,'must exercise actual curved Foundation Tee edge')
  const edgeIndex=+Object.keys(piece.curves).find(k=>getEdgeSeamAllowance(piece,+k)>.6)
  const rows=[]
  for (const station of stations) {
    piece.notches=[{id:'differential-double',edgeIndex,t:station,type:'double',depthCm:.3}]
    const before=structuredClone(project)
    const report=inspectIndustrialDoubleNotches20261023(project)
    assert.deepEqual(project,before,'preflight must leave source unchanged')
    for (const size of project.grading.sizes) {
      const check=report.checks.find(row=>row.size===size&&row.notchId==='differential-double')
      const issue=report.issues.find(row=>row.size===size&&row.notchId==='differential-double'&&row.code==='DOUBLE_NOTCH_ENDPOINT_CLIPPING')
      let outcome='exported', detail=''
      try {
        const dxf=projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'})
        assert.ok(typeof dxf==='string'&&dxf.length>0)
      } catch (error) {
        detail=String(error?.message||error)
        outcome=/Unsafe manufacturing double-notch endpoint clearance/i.test(detail)?'endpoint_rejected':'other_geometry_failure'
      }
      const preflightPass=Boolean(check&&!check.endpointClipped&&!issue&&!report.issues.some(i=>i.size===size))
      rows.push({size,station,outcome,preflightPass,clipped:check?.endpointClipped??null,detail})
      assert.ok(!(preflightPass&&outcome!=='exported'),`FALSE NEGATIVE ${JSON.stringify(rows.at(-1))}`)
      if(outcome==='endpoint_rejected') assert.equal(check?.endpointClipped,true,`missed endpoint ${size} t=${station}`)
      if(outcome==='exported') assert.equal(check?.endpointClipped,false,`false positive ${size} t=${station}`)
    }
  }
  assert.equal(rows.length,54)
  const counts=Object.fromEntries(['exported','endpoint_rejected','other_geometry_failure'].map(k=>[k,rows.filter(r=>r.outcome===k).length]))
  console.log('DXF_DIFFERENTIAL_COUNTS',JSON.stringify(counts))
  console.log('DXF_DIFFERENTIAL_ROWS',JSON.stringify(rows.map(({detail,...row})=>row)))
  if(counts.other_geometry_failure) console.log('DXF_DIFFERENTIAL_UNRELATED_FAILURES',JSON.stringify(rows.filter(r=>r.outcome==='other_geometry_failure')))
  assert.equal(rows.filter(r=>r.preflightPass&&r.outcome!=='exported').length,0)
})
