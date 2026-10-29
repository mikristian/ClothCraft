// Geometry-derived technical artwork for EXO native Techpack. Nothing here
// invents seam topology or approves a physical fit.
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const coordinates=(p,native)=>native?(Array.isArray(p)&&p.length>=2&&finite(p[0])&&finite(p[1])?[p[0],p[1]]:null):
  (p&&finite(p.x)&&finite(p.y)?[p.x,p.y]:null)

export function technicalPatternPieces(snapshot,project,native=true){
  const list=native?snapshot?.template?.panels||[]:project?.pieces||[]
  return list.map((p,i)=>({id:String(p.id||`piece-${i}`),name:String(p.name||p.id||`Pattern ${i+1}`),fabric:String(p.fabric||p.fabricId||''),
    points:(native?p.polygon?.points:p.points||[]).map(pt=>coordinates(pt,native)).filter(Boolean),
    edges:native?p.polygon?.edges||[]:[],notches:native?p.polygon?.notches||[]:p.notches||[],
    internalLines:native?p.polygon?.internalLines||p.internal_lines||[]:p.internalLines||[]}))
  .filter(p=>p.points.length>=3)
}

export function layoutTechnicalPatterns(pieces,width=980,options={}){
  const cols=options.columns?Math.max(1,Math.min(4,Number(options.columns)||1)):
    pieces.length<3?Math.max(pieces.length,1):Math.min(pieces.length,4)
  const tileW=width/cols, tileH=Math.max(150,Math.min(600,Number(options.tileHeight)||235))
  const margin=Math.max(16,Math.min(120,Number(options.margin)||34))
  return {width,height:Math.max(260,Math.ceil(pieces.length/cols)*tileH+18),pieces:pieces.map((p,i)=>{
    const x=i%cols*tileW,y=Math.floor(i/cols)*tileH
    const xs=p.points.map(v=>v[0]),ys=p.points.map(v=>v[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
    const scale=Math.min((tileW-2*margin)/Math.max(maxX-minX,1e-8),(tileH-72)/Math.max(maxY-minY,1e-8))
    const dx=x+tileW/2-(maxX-minX)*scale/2,dy=y+20+(tileH-72-(maxY-minY)*scale)/2
    const transform=([px,py])=>[dx+(px-minX)*scale,dy+(py-minY)*scale]
    const points=p.points.map(transform)
    const internalLines=p.internalLines.map(line=>{
      const raw=Array.isArray(line)?line:line?.points
      return Array.isArray(raw)?raw.filter(point=>Array.isArray(point)&&point.length>=2&&point.slice(0,2).every(finite)).map(transform):[]
    }).filter(line=>line.length>=2)
    const notches=p.notches.map(notch=>{
      const edge=Number(notch?.edgeIndex??p.edges.indexOf(notch?.edge))
      const fraction=Number(notch?.t??notch?.fraction??.5)
      if(!Number.isInteger(edge)||edge<0||edge>=points.length||!finite(fraction))return null
      const a=points[edge],b=points[(edge+1)%points.length],t=clamp(fraction,0,1)
      return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
    }).filter(Boolean)
    return {...p,points,center:[x+tileW/2,y+tileH-23],tile:[x,y,tileW,tileH],
      internalLines,notches,
      dimension:p.points.length?[(maxX-minX)*1000,(maxY-minY)*1000]:null,
      path:points.map(([px,py],j)=>`${j?'L':'M'}${px.toFixed(2)} ${py.toFixed(2)}`).join(' ')+' Z'}
  })}
}

export function projectTechnicalMesh(snapshot,view='front',width=300,height=350){
  const vertices=snapshot?.positions,faces=snapshot?.triangles
  if(!Array.isArray(vertices)||vertices.length<3||!Array.isArray(faces)||faces.length<1)return null
  const coords=vertices.map(p=>Array.isArray(p)&&p.length>=3&&p.every(finite)?p:null)
  const usable=coords.filter(Boolean)
  if(usable.length<3)return null
  const axis=view==='side'?2:0,flip=view==='back'?-1:1
  const xVals=usable.map(p=>p[axis]*flip),yVals=usable.map(p=>-p[1])
  const minX=Math.min(...xVals),maxX=Math.max(...xVals),minY=Math.min(...yVals),maxY=Math.max(...yVals)
  if(maxX-minX<.00001||maxY-minY<.00001)return null
  const scale=Math.min((width-36)/(maxX-minX),(height-35)/(maxY-minY))
  const tx=(width-(maxX-minX)*scale)/2,ty=(height-(maxY-minY)*scale)/2
  const projected=coords.map(p=>p?[tx+(p[axis]*flip-minX)*scale,ty+(-p[1]-minY)*scale]:null)
  const every=Math.max(1,Math.ceil(faces.length/1600));const fills=[]
  const boundaries=new Map()
  for(let i=0;i<faces.length;i++){
    const tri=faces[i]
    if(!Array.isArray(tri)||tri.length<3||!tri.slice(0,3).every(n=>Number.isInteger(n)&&n>=0&&n<coords.length&&coords[n]))continue
    const [a,b,c]=tri
    const e1=[coords[b][0]-coords[a][0],coords[b][1]-coords[a][1],coords[b][2]-coords[a][2]]
    const e2=[coords[c][0]-coords[a][0],coords[c][1]-coords[a][1],coords[c][2]-coords[a][2]]
    const normal=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]
    const facing=normal[axis===2?0:2]*(view==='back'?-1:1)>0
    if(i%every===0){fills.push({path:[a,b,c].map((n,j)=>`${j?'L':'M'}${projected[n][0].toFixed(1)} ${projected[n][1].toFixed(1)}`).join(' ')+' Z',depth:(coords[a][axis===2?0:2]+coords[b][axis===2?0:2]+coords[c][axis===2?0:2])/3,front:facing})}
    for(const [m,n] of [[a,b],[b,c],[c,a]]){
      const key=m<n?`${m}:${n}`:`${n}:${m}`
      const current=boundaries.get(key)
      if(current){current.count++;current.front=current.front||facing;current.back=current.back||!facing}
      else boundaries.set(key,{a:m,b:n,count:1,front:facing,back:!facing})
    }
  }
  // Boundary and silhouette edges carry linework. Do not draw the entire
  // triangulation: production drawings emphasize silhouettes and seam paths.
  const edges=[]
  for(const edge of boundaries.values())if(edge.count===1||edge.front&&edge.back){
    if(edges.length>=2500)break
    edges.push([projected[edge.a],projected[edge.b]])
  }
  return {view,width,height,filled:fills.sort((a,b)=>a.depth-b.depth).map(f=>f.path),edges,
    vertices:coords.length,faces:faces.length,kind:'mesh-projection'}
}

export function sourceSeamCallouts(seams=[],pieces=[],limit=8){
  const byId=new Map(pieces.map(p=>[p.id,p]))
  return seams.slice(0,limit).map((s,i)=>{
    const p=byId.get(s.first)||byId.get(s.second)
    const edgeRef=p?.id===s.first?s.from:s.to
    const edge=Number.isInteger(Number(edgeRef))&&String(edgeRef).trim()!==''?Number(edgeRef):p?.edges?.findIndex(id=>id===edgeRef)
    const located=Number.isInteger(edge)&&edge>=0&&edge<(p?.points?.length||0)
    let point=located?[(p.points[edge][0]+p.points[(edge+1)%p.points.length][0])/2,
      (p.points[edge][1]+p.points[(edge+1)%p.points.length][1])/2]:null
    return {id:s.id||`seam-${i+1}`,number:i+1,text:`${s.name||s.id||`Seam ${i+1}`}`,
      detail:[s.first,s.second].filter(Boolean).join(' / '),x:point?clamp(point[0],55,950):null,
      y:point?clamp(point[1],32,720):null,located,type:s.type||'Seam'}
  })
}
