/** Resolve the visible grading size *during render*, before expensive graded
 * views are computed. This prevents a saved garment or Undo/Redo restored
 * size run (e.g. W28–W38) from rendering at the previous project's XS–XXL
 * selection (e.g. M). Never mutates the grading rule table or the UI state.
 */
export function resolveGradePreviewSize(project,requestedSize){
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||!sizes.length)return project?.grading?.baseSize||'M'
 if(sizes.includes(requestedSize))return requestedSize
 if(sizes.includes(project?.grading?.baseSize))return project.grading.baseSize
 return sizes[0]
}
