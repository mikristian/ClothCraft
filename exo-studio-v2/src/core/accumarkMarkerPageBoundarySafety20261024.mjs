// Digital preflight only. A cut contour must never be split across PDF pages
// without a separately validated physical registration/plotter protocol.
// The 0.05 cm exclusion band also prevents cuts landing on page trim edges.
export function inspectMarkerPageBoundarySafety20261024(marker, pages, { clearanceCm = 0.05 } = {}) {
  const issues = []
  if (!marker || !Number.isFinite(marker.length) || marker.length <= 0 ||
      !Array.isArray(marker.placements) || !Array.isArray(pages) || !pages.length ||
      !Number.isFinite(clearanceCm) || clearanceCm < 0 ||
      pages.some(page => !page || !Number.isFinite(page.startCm) || !Number.isFinite(page.endCm) ||
        !Number.isFinite(page.heightCm) || page.endCm <= page.startCm ||
        Math.abs(page.endCm - page.startCm - page.heightCm) > 1e-8) ||
      pages[0].startCm !== 0 || pages.at(-1).endCm !== marker.length ||
      pages.some((page, index) => index && page.startCm !== pages[index - 1].endCm)) {
    return { ok: false, issues: [{ code: 'INVALID_PAGE_PLAN' }], checkedBoundaries: 0, physicalRegistrationVerified: false }
  }
  const boundaries = pages.slice(0, -1).map(page => page.endCm)
  for (const [index, placement] of marker.placements.entries()) {
    const points = placement?.outline
    if (!Array.isArray(points) || points.length < 3 || points.length > 2000 ||
        points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) {
      issues.push({ code: 'INVALID_CUT_CONTOUR', placementIndex: index })
      continue
    }
    let minY = Infinity, maxY = -Infinity
    for (const point of points) {
      if (point.y < minY) minY = point.y
      if (point.y > maxY) maxY = point.y
    }
    for (const [boundaryIndex, boundaryCm] of boundaries.entries()) {
      if (minY <= boundaryCm + clearanceCm && maxY >= boundaryCm - clearanceCm) {
        issues.push({
          code: minY < boundaryCm && maxY > boundaryCm ? 'CUT_CONTOUR_SPLIT_ACROSS_PAGES' : 'CUT_CONTOUR_AT_PAGE_EDGE',
          placementIndex: index, boundaryIndex, boundaryCm,
        })
      }
    }
  }
  return { ok: issues.length === 0, issues, checkedBoundaries: boundaries.length, physicalRegistrationVerified: false }
}
