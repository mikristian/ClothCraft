import test from 'node:test'
import assert from 'node:assert/strict'
import {editPatternBezierHandle} from './vectorPatternBezier.js'

test('mirrors side and hem handles across adjacent edges, including wraparound',()=>{
  const base={points:[[0,0],[2,0],[2,3],[0,3]],edges:['top','right','bottom','left'],curves:{right:[[2,1],[2,2]]}}
  for(const [edge,index,peerEdge,peerIndex] of [['right',1,'bottom',0],['right',0,'top',1],['top',0,'left',1]]){
    const polygon=structuredClone(base)
    if(!polygon.curves[edge])polygon.curves[edge]=[[.5,0],[1.5,0]]
    const result=editPatternBezierHandle(polygon,edge,index,[.2,.4],{mirrorTangents:true})
    assert.ok(result,`${edge}:${index}`)
    const anchor=result.points[index===0?result.edges.indexOf(edge):(result.edges.indexOf(edge)+1)%4]
    const moved=result.curves[edge][index],peer=result.curves[peerEdge][peerIndex]
    const cross=(moved[0]-anchor[0])*(peer[1]-anchor[1])-(moved[1]-anchor[1])*(peer[0]-anchor[0])
    assert.ok(Math.abs(cross)<1e-8,`${edge} opposing tangent collinear`)
    assert.ok((moved[0]-anchor[0])*(peer[0]-anchor[0])+(moved[1]-anchor[1])*(peer[1]-anchor[1])<0)
    assert.deepEqual(polygon,edge==='right'?base:polygon,'input untouched')
  }
})
