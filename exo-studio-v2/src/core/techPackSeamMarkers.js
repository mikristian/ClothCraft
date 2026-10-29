// Derive callouts only from native boundary vertices; never invent positions.
export function techPackSeamMarkers(snapshot,existing=[]){
 const triangles=snapshot?.triangles||[],positions=snapshot?.positions||[]
 const markers=[...existing],ids=new Set(existing.map(m=>m.id))
 for(const seam of snapshot?.template?.seams||[]){
  const id=`native-seam:${seam.id}`
  if(ids.has(id))continue
  const panel=snapshot?.panels?.find(p=>p.id===seam.a?.panel)
  const boundary=panel?.boundaries?.[seam.a?.edge]
  if(!Array.isArray(boundary)||!boundary.length)continue
  const vertex=boundary[Math.floor((boundary.length-1)/2)]
  if(!Array.isArray(positions[vertex])||!positions[vertex].every(Number.isFinite))continue
  // Only a face from the seam's own panel can establish its 3D position.
  // A shared boundary vertex can belong to several independently sewn panels.
  const span=panel?.triangles
  if(!Array.isArray(span)||span.length!==2||!span.every(Number.isInteger)||span[0]<0||span[1]>triangles.length||span[1]<=span[0])continue
  const index=triangles.findIndex((t,i)=>i>=span[0]&&i<span[1]&&Array.isArray(t)&&t.length===3&&t.includes(vertex)&&new Set(t).size===3&&t.every(n=>Number.isInteger(n)&&n>=0&&Array.isArray(positions[n])&&positions[n].length>=3&&positions[n].slice(0,3).every(Number.isFinite)))
  if(index<0)continue
  const triangle=triangles[index]
  if(new Set(triangle).size!==3||!triangle.every(i=>Number.isInteger(i)&&i>=0&&Array.isArray(positions[i])&&positions[i].length>=3&&positions[i].slice(0,3).every(Number.isFinite)))continue
  markers.push({id,label:String(markers.length+1),title:`Seam · ${seam.id}`,
   detail:`${seam.a.panel} / ${seam.a.edge} → ${seam.b?.panel||''} / ${seam.b?.edge||''}. Native seam reference; verify the manufacturing instruction.`,
   panelId:seam.a.panel,source:'garment',verified:false,
   anchor:{source:'garment',triangleIndex:index,vertices:[...triangle],weights:triangle.map(v=>v===vertex?1:0),panelId:seam.a.panel}})
  ids.add(id)
 }
 return markers
}
