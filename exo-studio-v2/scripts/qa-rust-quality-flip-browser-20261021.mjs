// RUST-025 isolated Chrome source acceptance; no saved project or authored mesh writes.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const actual=await page.evaluate(async()=>{
    const bridge=await import('/src/core/rustQualityFlipKernel.js')
    const {optimizeTriangleQuality}=await import('/src/core/physics/qualityTriangulation.js')
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    const quality=(a,b,c)=>{
      const area=Math.abs(cross(a,b,c))
      const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
      return area>1e-11?longest*longest/area:Infinity
    }
    const convex=(a,b,c,d)=>!(cross(a,b,c)*cross(a,b,d)>=-1e-10||cross(c,d,a)*cross(c,d,b)>=-1e-10)
    const better=(a,b,c,d,min)=>Math.max(quality(c,d,a),quality(d,c,b))<Math.max(quality(a,b,c),quality(b,a,d))*(1-min)
    const candidates=[
      [[0,0],[5,3],[5,0],[0,3]],
      [[0,0],[6,6],[6,0],[0,6]],
      [[0,0],[4,0],[2,3],[2,1]],
      [[0,0],[3,0],[1,0],[0,4]],
      [[0,0],[1e-6,0],[1e-6,1e-6],[0,1e-6]],
      [[NaN,0],[5,3],[5,0],[0,3]],
      [[Infinity,0],[5,3],[5,0],[0,3]],
    ]
    let seed=0x25f1aabb
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
    for(let i=0;i<120;i++){
      const a=[(random()-.5)*20,(random()-.5)*20]
      const b=[(random()-.5)*20,(random()-.5)*20]
      const c=[(random()-.5)*20,(random()-.5)*20]
      const d=[(random()-.5)*20,(random()-.5)*20]
      candidates.push([a,b,c,d])
    }
    const loaded=await bridge.initializeRustQualityFlipKernel()
    const predicates=[]
    for(const [a,b,c,d] of candidates)for(const min of [0,0.01,0.1]){
      predicates.push({actualConvex:bridge.rustConvexQuad(a,b,c,d),expectedConvex:convex(a,b,c,d),
        actualBetter:bridge.rustQualityFlipBetter(a,b,c,d,min),expectedBetter:better(a,b,c,d,min)})
    }
    const meshes=[
      {name:'convex',vertices:[{x:0,y:0,id:'a',gradeRule:'a'},{x:7,y:0,id:'b'},
        {x:5,y:1,id:'c',notches:['single']},{x:0,y:5,id:'d'}],faces:[[0,1,2],[0,2,3]]},
      {name:'concave',vertices:[[0,0],[6,0],[2,2],[6,6],[0,6]],faces:[[0,1,2],[0,2,4],[2,3,4]]},
      {name:'nonmanifold',vertices:[[0,0],[4,0],[2,3],[2,-3],[2,1]],faces:[[0,1,2],[1,0,3],[0,1,4]]},
    ]
    const boundary=faces=>{
      const edges=new Map()
      for(const face of faces)for(let i=0;i<3;i++){
        const a=face[i],b=face[(i+1)%3],k=[Math.min(a,b),Math.max(a,b)].join(':')
        edges.set(k,(edges.get(k)||0)+1)
      }
      return [...edges].filter(([,count])=>count===1).map(([key])=>key).sort()
    }
    const reports=meshes.map(mesh=>{
      const before=JSON.stringify(mesh)
      const first=optimizeTriangleQuality(mesh,{passes:8})
      const repeat=optimizeTriangleQuality(mesh,{passes:8})
      return {name:mesh.name,first,repeat,unchanged:before===JSON.stringify(mesh),
        boundaryBefore:boundary(mesh.faces),boundaryAfter:boundary(first.faces),
        metadataRetained:JSON.stringify(first.vertices)===JSON.stringify(mesh.vertices),
        sameVertices:first.vertices===mesh.vertices}
    })
    return {loaded,status:bridge.rustQualityFlipStatus(),predicates,reports}
  })
  assert.equal(actual.loaded,true,JSON.stringify(actual.status))
  assert.equal(actual.status.backend,'rust-wasm')
  assert.equal(actual.predicates.length,381)
  for(const [i,row] of actual.predicates.entries()){
    assert.equal(row.actualConvex,row.expectedConvex,`convex fixture ${i}`)
    assert.equal(row.actualBetter,row.expectedBetter,`quality fixture ${i}`)
  }
  for(const row of actual.reports){
    assert.equal(row.unchanged,true,`${row.name} mutated authored garment`)
    assert.equal(row.metadataRetained,true,`${row.name} lost vertex metadata`)
    assert.equal(row.sameVertices,true,`${row.name} copied vertex array`)
    assert.deepEqual(row.first,row.repeat,`${row.name} not deterministic`)
    assert.deepEqual(row.boundaryBefore,row.boundaryAfter,`${row.name} changed boundary`)
  }
  const fallbackPage=await browser.newPage()
  await fallbackPage.route('**/wasm/exo_quality_flip_kernel.wasm',route=>route.fulfill({status:404,body:'missing'}))
  await fallbackPage.goto(url,{waitUntil:'domcontentloaded'})
  const fallback=await fallbackPage.evaluate(async()=>{
    const bridge=await import('/src/core/rustQualityFlipKernel.js')
    const loaded=await bridge.initializeRustQualityFlipKernel()
    const points=[[0,0],[5,3],[5,0],[0,3]]
    return {loaded,status:bridge.rustQualityFlipStatus(),convex:bridge.rustConvexQuad(...points)}
  })
  assert.equal(fallback.loaded,false)
  assert.equal(fallback.status.backend,'javascript-fallback')
  assert.equal(fallback.convex,true)
  console.log(JSON.stringify({pass:true,url,abiBackend:actual.status.backend,
    predicateComparisons:actual.predicates.length,meshCases:actual.reports.length,
    boundariesPreserved:true,metadataPreserved:true,deterministic:true,authoredMutation:false}))
} finally {await browser.close()}
