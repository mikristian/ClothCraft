import * as THREE from 'three'

/**
 * Build an editable-garment *reference* from an official CLO OBJ/XML export.
 * Faces retain CLO's sampled curved 3D pose; no sewing or cloth solve runs.
 * The same source fixture format works for tees, hoodies and other garments.
 */
export function buildCloGarmentSourcePreview(root, fixture, project, surfaceMaterial, resources) {
  if (fixture?.format !== 'exo.clo-garment-source-preview.v1') throw new Error('Invalid CLO garment preview fixture')
  if (!Array.isArray(fixture.groups) || !fixture.groups.length) throw new Error('No CLO source panels')
  const min=fixture.boundsMm?.min, max=fixture.boundsMm?.max
  if (!min?.every(Number.isFinite) || !max?.every(Number.isFinite) || max[1]<=min[1]) throw new Error('Invalid CLO scene bounds')
  const center=min.map((v,axis)=>(v+max[axis])*.5)
  const scale=2.1/(max[1]-min[1])
  const positionOf=(v)=>new THREE.Vector3((v[0]-center[0])*scale,(v[1]-center[1])*scale,(v[2]-center[2])*scale)
  const idToPosition=new Map()
  const sourceVertexOwner=new Map()
  const panelContainers=new Map()
  const pieceByGroup=new Map((project.pieces||[]).map(p=>[(p.sourceCloBlock||'').replace(/_M$/,''),p.id]))
  const byPieceTriangles=new Map()
  let meshCount=0,edgeCount=0,triangleCount=0
  const edgeMaterial=new THREE.LineBasicMaterial({color:'#8e9da8',transparent:true,opacity:.85,depthWrite:false})
  const sewingMaterial=new THREE.LineBasicMaterial({color:'#b4a3d6',transparent:true,opacity:.9,depthWrite:false})
  resources.push(edgeMaterial,sewingMaterial)
  for(const source of fixture.groups){
    const vertexCount=source.vertices?.length/3
    if(!Number.isInteger(vertexCount)||!vertexCount||source.uv?.length!==vertexCount*2 || source.sourceVertexIds?.length!==vertexCount)
      throw new Error(`Malformed CLO source panel ${source.name}`)
    if(!source.indices?.length || source.indices.length%3 || source.indices.some(i=>!Number.isInteger(i)||i<0||i>=vertexCount))
      throw new Error(`Invalid CLO indices for ${source.name}`)
    const geometry=new THREE.BufferGeometry()
    const verts=[]
    for(let i=0;i<vertexCount;i++){
      const original=source.vertices.slice(i*3,i*3+3)
      const positioned=positionOf(original)
      verts.push(...positioned.toArray())
      idToPosition.set(source.sourceVertexIds[i],positioned)
    }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3))
    // CLO UV values are real pattern millimetres; divide by a stable textile
    // repeat scale without changing the authored vertices or triangle indices.
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(source.uv.map(n=>n/55),2))
    geometry.setIndex(source.indices)
    geometry.computeVertexNormals()
    resources.push(geometry)
    const pieceId=pieceByGroup.get(source.name)||source.name
    const container=new THREE.Group()
    container.name=`clo-source-piece-${pieceId}`
    container.userData.sourcePieceId=pieceId
    container.userData.originalCloGroup=source.name
    panelContainers.set(pieceId,container)
    for(const id of source.sourceVertexIds)sourceVertexOwner.set(id,pieceId)
    const surface=new THREE.Mesh(geometry,surfaceMaterial)
    surface.name=`${pieceId}-clo-source-curved-mesh`
    surface.userData={sourcePieceId:pieceId,isSurface:true,presentationOnly:true,sourceGeometry:'official-clo-obj'}
    container.add(surface)
    const boundaries=new Map()
    const indices=source.indices
    for(let i=0;i<indices.length;i+=3){
      for(const [a,b] of [[indices[i],indices[i+1]],[indices[i+1],indices[i+2]],[indices[i+2],indices[i]]]){
        const lo=Math.min(a,b),hi=Math.max(a,b),key=`${lo}:${hi}`
        boundaries.set(key,{a:lo,b:hi,count:(boundaries.get(key)?.count||0)+1})
      }
    }
    const outline=[]
    for(const edge of boundaries.values()){
      if(edge.count!==1)continue
      for(const index of [edge.a,edge.b]){
        const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index)
        const n=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,index)
        p.addScaledVector(n,.0035)
        outline.push(...p.toArray())
      }
      edgeCount++
    }
    if(outline.length){
      const border=new THREE.BufferGeometry()
      border.setAttribute('position',new THREE.Float32BufferAttribute(outline,3))
      resources.push(border)
      const borderLines=new THREE.LineSegments(border,edgeMaterial)
      borderLines.userData={previewLayer:'edges',sourcePieceId:pieceId}
      container.add(borderLines)
    }
    root.add(container)
    meshCount++
    triangleCount+=indices.length/3
    byPieceTriangles.set(pieceId,indices.length/3)
  }
  let sewingPathCount=0
  for(const pair of fixture.sewingPairs||[]){
    for(const path of pair.paths||[]){
      const points=path.map(id=>idToPosition.get(id)).filter(Boolean)
      if(points.length<2)continue
      const geometry=new THREE.BufferGeometry().setFromPoints(points)
      resources.push(geometry)
      const line=new THREE.Line(geometry,sewingMaterial)
      line.userData={previewLayer:'sewing',sourceSeamPairId:pair.id}
      // Keep source stitch guides attached to their original panel. An
      // optional exploded inspection can therefore move a panel without
      // leaving its native stitching path behind in the assembled pose.
      const owner=path.length&&path.every(id=>sourceVertexOwner.get(id)===sourceVertexOwner.get(path[0]))
        ?panelContainers.get(sourceVertexOwner.get(path[0])):null
      ;(owner||root).add(line)
      sewingPathCount++
    }
  }
  return {meshCount,triangleCount,edgeCount,byPieceTriangles,sewingPathCount,sourceVertexCount:fixture.sourceVertices}
}

// Render transforms only. The original CLO export has already staged all
// seven individually curved panels around the same shirt. Assembly is the
// exact source placement; a modest exploded inspection exposes each cut part
// without cloning surfaces or changing the garment's 2D drafting geometry.
const INSPECTION_POSES = Object.freeze({
  // Centers are in preview metres. Keep the pattern silhouettes and the
  // full source curvature intact; only move/rotate each physical mesh once.
  'clo-front':{center:[-.70,-.17,.10],rotation:[0,-.12,0]},
  'clo-back':{center:[.70,-.17,-.08],rotation:[0,.16,0]},
  'clo-left-sleeve':{center:[-1.63,.28,.08],rotation:[0,-.12,.14]},
  'clo-right-sleeve':{center:[1.63,.28,.08],rotation:[0,.12,-.14]},
  // CLO neck bands lie nearly horizontal in 3D. Rotate around each band's
  // own center for a legible inspection view, with space between all three.
  'clo-neck-a':{center:[-.36,1.27,.06],rotation:[-Math.PI/2,0,0]},
  'clo-neck-b':{center:[0,1.27,.06],rotation:[-Math.PI/2,0,0]},
  'clo-neck-c':{center:[.36,1.27,.06],rotation:[-Math.PI/2,0,0]},
})

export function positionCloGarmentSourcePanels(root, arrangement='assembled') {
  const spaced=arrangement==='separated'
  const anatomicalSide=root.name==='garment-side-view'
  for(const panel of root.children){
    const id=panel.userData?.sourcePieceId
    if(!id)continue
    // Original CLO pieces are separate, unsewn surfaces whose lateral
    // projection has floating spikes and open sides. The strict anatomical
    // side uses its dedicated display shell; all source groups remain intact
    // and return in the original seven-piece inspection arrangement.
    panel.visible=true
    // This child pivot gathers the mesh, boundaries and matching CLO sewing
    // guides, keeping every original seam in the correct panel after moving.
    if(!panel.userData.previewPivot){
      const box=new THREE.Box3().setFromObject(panel)
      const center=box.getCenter(new THREE.Vector3())
      const pivot=new THREE.Group()
      pivot.name=`${id}-source-geometry-pivot`
      while(panel.children.length)pivot.add(panel.children[0])
      panel.add(pivot)
      panel.userData.previewPivot=pivot
      panel.userData.sourceCenter=center
    }
    const pivot=panel.userData.previewPivot
    if(spaced){
      const pose=INSPECTION_POSES[id]
      if(!pose)throw new Error(`Unknown CLO male T-shirt source panel ${id}`)
      const origin=panel.userData.sourceCenter
      pivot.position.copy(origin).multiplyScalar(-1)
      pivot.scale.set(1,1,1)
      panel.position.set(...pose.center)
      panel.rotation.set(...pose.rotation)
    }else{
      // Exact source placement: do not compress/hide the exported cloth or
      // substitute a cosmetic shirt shell for its unsewn pattern geometry.
      pivot.position.set(0,0,0)
      pivot.scale.set(1,1,1)
      panel.position.set(0,0,0)
      panel.rotation.set(0,0,0)
    }
  }
  for(const child of root.children){
    if(child.name.startsWith('render-only-side-')||child.name==='render-only-curved-torso-underlay')child.visible=false
  }
}
