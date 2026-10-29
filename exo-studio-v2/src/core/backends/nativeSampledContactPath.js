// Research-only *discrete* contact rejection along a candidate pose change.
// Evaluates interpolated particle positions with a caller-provided endpoint
// clearance screen. This can catch some tunneling missed by endpoint-only
// checks, but CANNOT certify swept cloth triangles, cloth self-collision,
// avatar entry, or the true nonlinear trajectory taken by a cloth solver.

const finite3=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)

export function inspectNativeSampledContactPath(reference,candidate,{
  steps=8,checkPose,
}={}){
  if(!Number.isInteger(steps)||steps<2||steps>16)
    throw new RangeError('Sampled contact path requires 2..16 subdivisions')
  if(typeof checkPose!=='function')throw new TypeError('A pose contact screen is required')
  if(!Array.isArray(reference?.particles)||!Array.isArray(candidate?.particles)||
     reference.particles.length!==candidate.particles.length||reference.particles.length===0)
    throw new Error('Incompatible reference and candidate particles')
  if(!Array.isArray(reference.pieces)||!Array.isArray(candidate.pieces)||
     JSON.stringify(reference.pieces.map(p=>[p.id,p.faces,p.particleIndices]))!==
     JSON.stringify(candidate.pieces.map(p=>[p.id,p.faces,p.particleIndices])))
    throw new Error('Contact path changed garment mesh topology')
  const from=reference.particles.map(p=>p.position)
  const to=candidate.particles.map(p=>p.position)
  if(!from.every(finite3)||!to.every(finite3))throw new RangeError('Nonfinite contact path coordinates')
  // One detached scratch pose, reused for every sample. No source mutation.
  const pose=structuredClone(reference)
  let checked=0,penetrating=0,maximumIntrusionMm=0,worstFraction=null
  const samples=[]
  for(let index=1;index<steps;index++){
    const fraction=index/steps
    for(let i=0;i<from.length;i++){
      for(let axis=0;axis<3;axis++)
        pose.particles[i].position[axis]=from[i][axis]+fraction*(to[i][axis]-from[i][axis])
    }
    const result=checkPose(pose)
    if(!result||result.sampledAvatarClearanceOnly!==true||
      !Number.isInteger(result.checked)||result.checked<1||
      !Number.isInteger(result.penetrating)||result.penetrating<0||result.penetrating>result.checked||
      !Number.isFinite(result.maximumIntrusionMm)||result.maximumIntrusionMm<0)
      throw new Error('Invalid sampled avatar contact screen')
    checked+=result.checked
    penetrating+=result.penetrating
    if(result.maximumIntrusionMm>maximumIntrusionMm){
      maximumIntrusionMm=result.maximumIntrusionMm
      worstFraction=fraction
    }
    samples.push({fraction,checked:result.checked,penetrating:result.penetrating,
      maximumIntrusionMm:result.maximumIntrusionMm})
  }
  return {checked,penetrating,maximumIntrusionMm,worstFraction,
    intermediateSamples:steps-1,subdivisions:steps,samples,
    sampledIntermediateClearanceOnly:true,
    // Sampling finitely many poses never proves absence of swept contacts.
    sweptCollisionCertified:false,avatarEntryCertified:false,
    fitCertified:false,
  }
}
