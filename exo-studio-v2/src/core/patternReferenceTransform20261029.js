export function transformReference(reference,handle,dx,dy){
 if(![dx,dy].every(Number.isFinite))return reference
 if(handle==='move')return {...reference,xMm:reference.xMm+dx,yMm:reference.yMm+dy}
 const a=(reference.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a)
 const x=c*dx+s*dy,y=-s*dx+c*dy
 const left=handle.includes('w'),right=handle.includes('e'),top=handle.includes('n'),bottom=handle.includes('s')
 let w=Math.max(1,reference.widthMm+(right?x:left?-x:0)),h=Math.max(1,reference.heightMm+(bottom?y:top?-y:0))
 if(reference.lockAspectRatio&&handle.length===2){const ratio=reference.widthMm/reference.heightMm;if(Math.abs(w/reference.widthMm-1)>=Math.abs(h/reference.heightMm-1))h=w/ratio;else w=h*ratio}
 const cx=(w-reference.widthMm)*(left?-.5:.5),cy=(h-reference.heightMm)*(top?-.5:.5)
 return {...reference,widthMm:w,heightMm:h,xMm:reference.xMm+reference.widthMm/2+c*cx-s*cy-w/2,yMm:reference.yMm+reference.heightMm/2+s*cx+c*cy-h/2}
}
