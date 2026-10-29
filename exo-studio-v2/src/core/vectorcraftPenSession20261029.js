// Adaptation of the open-path lifetime in VectorCraft's PenTool (MIT OR
// Apache-2.0, https://github.com/storytold/vectorcraft/tree/main/crates/tools).
// EXO keeps unfinished paths as editor overlays until native contour creation.
import {resumePausedPenFromAnchor} from './vectorPenResume20261028.js'

export function parkOpenPenPath(paths,points,tangents,id) {
  if (!Number.isSafeInteger(id) || id<0 || !Array.isArray(paths)) return null
  const valid=resumePausedPenFromAnchor(points,tangents,points?.length-1)
  if(!valid)return null
  return [...paths,{id,points:valid.points,tangents:valid.tangents}]
}

export function restoreOpenPenPath(paths,id,index) {
  if (!Array.isArray(paths)) return null
  const path=paths.find(entry=>entry.id===id)
  if(!path)return null
  const result=resumePausedPenFromAnchor(path.points,path.tangents,index)
  if(!result)return null
  return {...result,remaining:paths.filter(entry=>entry.id!==id)}
}
