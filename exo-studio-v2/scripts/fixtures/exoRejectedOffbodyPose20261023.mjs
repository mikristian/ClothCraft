// QA ONLY: reproduce the previous rest-isometric off-body pose for inspection
// after the strengthened finite-thickness gate correctly rejects it. This
// never grants approval, updates a garment, or changes the live initializer.
export function rejectedOffbodyDiagnosticPose(reference,offsetM=.35){
  const pose=structuredClone(reference)
  const average=(points,k)=>points.reduce((sum,p)=>sum+p[k],0)/points.length
  for(const piece of pose.pieces){
    const flat=piece.flatVerticesM,ids=piece.particleIndices
    const world=ids.map(id=>reference.particles[id].position)
    const centerFlat=[average(flat,0),average(flat,1)]
    const centerWorld=[0,1,2].map(k=>average(world,k))
    ids.forEach((id,i)=>{
      const point=[centerWorld[0]+flat[i][0]-centerFlat[0],
        centerWorld[1]+flat[i][1]-centerFlat[1],
        centerWorld[2]+offsetM]
      pose.particles[id].position=point
      pose.particles[id].previous=[...point]
    })
  }
  return pose
}
