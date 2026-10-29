import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../src/data/templates.js'
import {gradeProject} from '../src/core/grading.js'
import {projectToDxf} from '../src/core/dxf.js'
import {getEdgeSeamAllowance} from '../src/core/project.js'

// Independent consumer of the actual DXF entities, in millimetres.
function entities(dxf) {
  const lines=dxf.trim().split(/\r?\n/)
  const pairs=[]
  for(let i=0;i+1<lines.length;i+=2)pairs.push([lines[i],lines[i+1]])
  const result=[]
  let active=null
  for(const [code,value] of pairs){
    if(code==='0'){
      if(value==='LINE'||value==='POLYLINE'){active={kind:value,layer:'',points:[]};result.push(active)}
      else if(value==='VERTEX'&&active?.kind==='POLYLINE'){active.points.push({})}
      else if(value==='SEQEND'||value==='ENDSEC'||value==='EOF'){active=null}
      else if(value!=='VERTEX'){active=null}
      continue
    }
    if(!active)continue
    if(code==='8'&&!active.layer)active.layer=value
    const coord=code==='10'?'x':code==='20'?'y':code==='11'?'x2':code==='21'?'y2':null
    if(coord){
      if(active.kind==='LINE')active[coord]=Number(value)
      else if(active.points.length)active.points.at(-1)[coord]=Number(value)
    }
  }
  return result
}

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
function onSegment(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy
  if(!den)return distance(p,a)
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den))
  return distance(p,{x:a.x+dx*t,y:a.y+dy*t})
}
function auditPhysicalNotches(dxf,expected){
  const rows=entities(dxf)
  const cuts=rows.filter(e=>e.kind==='POLYLINE'&&e.layer.startsWith('CUT_'))
  const notches=rows.filter(e=>e.kind==='LINE'&&e.layer.startsWith('NOTCH_'))
  const problems=[]
  if(notches.length!==expected)problems.push(`NOTCH_COUNT:${notches.length}:${expected}`)
  for(const n of notches){
    const start={x:n.x,y:n.y},end={x:n.x2,y:n.y2}
    if(![n.x,n.y,n.x2,n.y2].every(Number.isFinite))problems.push('NONFINITE_NOTCH')
    const d=distance(start,end)
    if(!(d>=2.99&&d<=3.01))problems.push(`NOTCH_LENGTH:${d}`)
    const closest=Math.min(...cuts.flatMap(c=>c.points.map((p,i)=>onSegment(start,p,c.points[(i+1)%c.points.length]))))
    if(!(closest<0.011))problems.push(`NOTCH_OFF_CUT:${closest}`)
  }
  for(let i=0;i<notches.length;i++)for(let j=i+1;j<notches.length;j++){
    if(notches[i].layer===notches[j].layer&&distance({x:notches[i].x,y:notches[i].y},{x:notches[j].x,y:notches[j].y})<0.1)
      problems.push('COLLAPSED_NOTCH_STATIONS')
  }
  return {problems,notches,cuts}
}

function fixture(type='single',t=.37){
  const project=createTeeTemplate()
  for(const p of project.pieces)p.notches=[]
  const piece=project.pieces.find(p=>p.points.some((_,i)=>getEdgeSeamAllowance(p,i)>.6))
  const edgeIndex=piece.points.findIndex((_,i)=>getEdgeSeamAllowance(piece,i)>.6)
  piece.notches=[{id:'physical-fixture',edgeIndex,t,type,depthCm:.3}]
  // Unrelated seam pairing should never add phantom factory cutter notches.
  return project
}

test('every graded factory CUT has one physical, cutter-anchored 3 mm single notch',()=>{
  const project=fixture()
  for(const size of project.grading.sizes){
    const output=projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'})
    assert.deepEqual(auditPhysicalNotches(output,1).problems,[],`size ${size}`)
  }
})

test('every graded double notch generates two distinct physical cuts, not a single mark',()=>{
  const project=fixture('double')
  for(const size of project.grading.sizes){
    const {problems,notches}=auditPhysicalNotches(projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'}),2)
    assert.deepEqual(problems,[],`size ${size}`)
    assert(distance({x:notches[0].x,y:notches[0].y},{x:notches[1].x,y:notches[1].y})>0.1,`size ${size} double notch collapsed`)
  }
})

test('no authored notch means no phantom physical NOTCH lines',()=>{
  const project=fixture()
  for(const piece of project.pieces)piece.notches=[]
  for(const size of project.grading.sizes){
    const output=projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'})
    assert.deepEqual(auditPhysicalNotches(output,0).problems,[],`size ${size}`)
  }
})

test('negative fixtures detect missing, duplicated, detached, wrong scale and collapsed cuts',()=>{
  const source=projectToDxf(gradeProject(fixture('double'),'M'),'M',{cutlineMode:'manufacturing'})
  const {notches}=auditPhysicalNotches(source,2)
  assert.equal(notches.length,2)
  assert(auditPhysicalNotches(source,1).problems.some(p=>p.startsWith('NOTCH_COUNT')))
  // Alter DXF entity in memory; these are consumer-level adversarial fixtures.
  const first=notches[0]
  const token=['0','LINE','8',first.layer,'10',String(first.x),'20',String(first.y),'30','0','11',String(first.x2),'21',String(first.y2),'31','0'].join('\n')
  const missing=source.replace(token,'')
  assert(auditPhysicalNotches(missing,2).problems.some(p=>p.startsWith('NOTCH_COUNT')))
  const translated=token.replace(`10\n${first.x}\n`,`10\n${first.x+1000}\n`)
  assert(auditPhysicalNotches(source.replace(token,translated),2).problems.some(p=>p.startsWith('NOTCH_OFF_CUT')))
  const scaled=token.replace(`11\n${first.x2}\n`,`11\n${first.x+10*(first.x2-first.x)}\n`).replace(`21\n${first.y2}\n`,`21\n${first.y+10*(first.y2-first.y)}\n`)
  assert(auditPhysicalNotches(source.replace(token,scaled),2).problems.some(p=>p.startsWith('NOTCH_LENGTH')))
  const duplicate=source.replace(token,token+'\n'+token)
  assert(auditPhysicalNotches(duplicate,2).problems.some(p=>p.startsWith('NOTCH_COUNT')))
  assert(auditPhysicalNotches(duplicate,3).problems.includes('COLLAPSED_NOTCH_STATIONS'))
})

test('unsafe notch allowance and invalid station reject a physical manufacturing DXF',()=>{
  const project=fixture()
  const notch=project.pieces.flatMap(p=>p.notches).find(n=>n.id==='physical-fixture')
  notch.depthCm=999
  assert.throws(()=>projectToDxf(project,'M',{cutlineMode:'manufacturing'}),/Unsafe manufacturing notch/)
  notch.depthCm=.3
  notch.t=Number.NaN
  assert.throws(()=>projectToDxf(project,'M',{cutlineMode:'manufacturing'}),/Invalid manufacturing DXF notch fraction/)
})
