import assert from 'node:assert/strict'
import http from 'node:http'
import {spawn,spawnSync} from 'node:child_process'
import {once} from 'node:events'
const port=39000+Math.floor(Math.random()*15000)
const manifest='rust/exo_http_route_probe/Cargo.toml'
const cargo=process.env.CARGO||`${process.env.HOME}/.cargo/bin/cargo`
const build=spawnSync(cargo,['build','--manifest-path',manifest,'--offline'],{encoding:'utf8'})
assert.equal(build.status,0,build.stderr)
const binary='rust/exo_http_route_probe/target/debug/exo-http-route-probe'
const rust=spawn(binary,[],{env:{...process.env,EXO_PROBE_PORT:String(port)},stdio:'ignore'})
const allowed=new Set(['5173','5174','5188','5189','5416','5386','5284','5286'].flatMap(p=>[`http://localhost:${p}`,`http://127.0.0.1:${p}`]))
const send=(res,status,body,origin)=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
 if(allowed.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin'}
 res.writeHead(status,headers);res.end(JSON.stringify(body))
}
const node=http.createServer((req,res)=>{
 const origin=String(req.headers.origin||'')
 if(origin&&!allowed.has(origin))return send(res,403,{error:'Origin not allowed'},'')
 return send(res,404,{error:'Unknown integration operation'},origin)
})
await new Promise(resolve=>node.listen(0,'127.0.0.1',resolve))
const request=async(port,origin)=>{
 const response=await fetch(`http://127.0.0.1:${port}/does-not-exist`,{headers:origin?{Origin:origin}:{}})
 return {status:response.status,body:await response.json(),headers:Object.fromEntries(['content-type','cache-control','x-content-type-options','access-control-allow-origin','vary'].map(name=>[name,response.headers.get(name)]))}
}
try{
 let available=false
 for(let i=0;i<40;i++){if(rust.exitCode!==null)break;try{await request(port,'');available=true;break}catch{await new Promise(resolve=>setTimeout(resolve,25))}}
 assert(available,'Rust HTTP probe unavailable')
 let checks=0
 for(const origin of ['',...allowed,'http://localhost:5297','https://evil.test','null']){
   assert.deepStrictEqual(await request(port,origin),await request(node.address().port,origin));checks++
 }
 console.log(JSON.stringify({pass:true,checks,portKind:'temporary',rustBinary:binary}))
}finally{rust.kill();await new Promise(resolve=>node.close(resolve))}
