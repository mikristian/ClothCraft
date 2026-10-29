// Reproducible independent numeric oracle for a quadratic garment seam curve.
// No source modules are edited; this compares the current algorithm concept
// to numerical integration of its actual curve derivative.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const quadraticDerivative=(a,c,b,t)=>({x:2*(1-t)*(c.x-a.x)+2*t*(b.x-c.x),y:2*(1-t)*(c.y-a.y)+2*t*(b.y-c.y)})
const length=(a,c,b,u,v)=>{const steps=32768,dt=(v-u)/steps;let sum=0;for(let i=0;i<=steps;i++){const t=u+i*dt,d=quadraticDerivative(a,c,b,t);sum+=(i===0||i===steps?1:i%2?4:2)*Math.hypot(d.x,d.y)}return sum*dt/3}
const fixtures=[
 {name:'straight',a:{x:0,y:0},c:{x:50,y:0},b:{x:100,y:0}},
 {name:'unequal-control',a:{x:0,y:0},c:{x:2,y:50},b:{x:100,y:0}},
 {name:'strong-hook',a:{x:0,y:0},c:{x:-45,y:180},b:{x:100,y:0}},
 {name:'low-curvature',a:{x:0,y:0},c:{x:15,y:8},b:{x:100,y:0}},
]
const out=fixtures.map(({name,a,c,b})=>{const total=length(a,c,b,0,1),actual=length(a,c,b,0,.5),estimated=total*.5;return {name,totalCm:total,actualFirstHalfCm:actual,linearApproxFirstHalfCm:estimated,errorMm:(estimated-actual)*10,relativeErrorPct:100*(estimated-actual)/total}})
assert(out[0].errorMm<1e-7)
assert(out.some(x=>Math.abs(x.errorMm)>5))
fs.writeFileSync(new URL('./arc_length_counterexample.json',import.meta.url),JSON.stringify({source:'src/core/project.js:edgeRangeLength',method:'Simpson 32768 steps over quadratic derivative',results:out},null,2))
console.log(JSON.stringify(out,null,2))
