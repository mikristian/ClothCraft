/**
 * Select representative indices for the 2D sewing correspondence overlay.
 *
 * The guides already describe pairs of actual seam coordinates. Sampling only
 * affects how many are painted; the native sewing links are never modified.
 * Always retain both real endpoints so short/uneven seams do not seem to stop
 * before their last correspondence.
 */
import {rustSampleSewingGuideIndices} from './rustSewingGuideKernel.js'

export function samplePatternSewingGuideIndices(count,{emphasized=false}={}) {
  if (!Number.isSafeInteger(count) || count<=0) return []
  return rustSampleSewingGuideIndices(count,emphasized)
}
