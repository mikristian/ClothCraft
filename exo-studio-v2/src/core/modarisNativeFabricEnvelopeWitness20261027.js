// Independent post-commit review of the bounded native six-size fabric envelope.
// Never sends edits, approves manufacturing or substitutes for Rust validation.
const SIZES = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const finite = n => typeof n === 'number' && Number.isFinite(n)
const near = (a, b, eps = 1e-8) => finite(a) && finite(b) && Math.abs(a - b) <= eps
const fail = reason => Object.freeze({ ok: false, reason: String(reason), factoryApproved: false })
const polygon = (template, id) => template?.panels?.find(p => p.id === id)?.polygon
const direct = value => finite(value) ? value : object(value) && value.formula == null && finite(value.valueMm) ? value.valueMm : null

/**
 * Witnesses a REAL Rust commit, not a staged JS edit. The direct measurement
 * is shared by the six grades; independent per-size graded measurements and
 * computed formulas are intentionally not claimed by this bounded contract.
 */
export function verifyModarisNativeFabricEnvelopeCommit20261027({
  beforeProject, afterProject, beforeRevision, afterRevision, measurement, expectedValueMm,
}) {
  try {
    if (!object(beforeProject) || !object(afterProject) ||
        !Number.isSafeInteger(beforeRevision) || afterRevision !== beforeRevision + 1 ||
        typeof measurement !== 'string' || !measurement || !finite(expectedValueMm))
      throw Error('Native source, measurement or one-revision commit evidence missing')
    const beforeRun = beforeProject.grade_run, afterRun = afterProject.grade_run
    const oldGraph = beforeProject.native_point_bindings, graph = afterProject.native_point_bindings
    const beforeEnvelope = beforeProject.fabric_grade_envelope
    const envelope = afterProject.fabric_grade_envelope
    if (!object(beforeRun) || !object(afterRun) || !object(oldGraph) || !object(graph) ||
        !object(beforeEnvelope) || !object(envelope))
      throw Error('Persisted six-size grade, native bindings or fabric envelope missing')
    if (envelope.schemaVersion !== 1 || typeof envelope.provenance !== 'string' ||
        !envelope.provenance.trim() || !same(envelope.measurements, beforeEnvelope.measurements) ||
        envelope.provenance !== beforeEnvelope.provenance ||
        typeof envelope.fabricId !== 'string' || !envelope.fabricId ||
        envelope.fabricId !== beforeEnvelope.fabricId ||
        !afterProject.template?.fabrics?.some(fabric => fabric.id === envelope.fabricId))
      throw Error('Fabric provenance, bound schema or authored envelope changed during recompute')
    if (!same(envelope.sourceTemplate, afterProject.template) ||
        !same(beforeEnvelope.sourceTemplate, beforeProject.template) ||
        !same(graph.sourceTemplate, afterProject.template) ||
        !same(oldGraph.sourceTemplate, beforeProject.template))
      throw Error('Persisted envelope or native rule graph has stale source geometry')
    if (!same(beforeRun.baseTemplate, beforeProject.template) ||
        !same(afterRun.baseTemplate, afterProject.template) ||
        !same(beforeRun.sizes, SIZES) || !same(afterRun.sizes, SIZES) ||
        beforeRun.baseSize !== 'M' || afterRun.baseSize !== 'M' ||
        beforeRun.gradedTemplates?.length !== 6 || afterRun.gradedTemplates?.length !== 6)
      throw Error('Source-linked XS–XXL grade inventory or base template changed')
    if (!same(beforeRun.pomSpecs, afterRun.pomSpecs) ||
        !same(oldGraph.bindings, graph.bindings) ||
        !same(Object.keys(oldGraph.measurements).sort(), Object.keys(graph.measurements).sort()))
      throw Error('Point rule, POM or measurement inventory changed')
    const oldValue = direct(oldGraph.measurements[measurement])
    const newValue = direct(graph.measurements[measurement])
    if (oldValue === null || !near(newValue, expectedValueMm) || near(oldValue, newValue, 1e-10))
      throw Error('Rust did not persist the requested direct measurement edit')
    const names = Object.keys(graph.measurements)
    if (!same(Object.keys(envelope.measurements).sort(), names.sort()))
      throw Error('Fabric envelope does not cover every native measurement')
    for (const name of names) {
      const value = direct(graph.measurements[name])
      if (value === null) throw Error('Computed fabric measurement needs a native per-size evaluator')
      const limits = envelope.measurements[name]
      if (!object(limits) || !same(Object.keys(limits).sort(), [...SIZES].sort()))
        throw Error('Missing or extra fabric bound size')
      for (const size of SIZES) {
        const row = limits[size]
        if (!object(row) || !finite(row.minMm) || !finite(row.maxMm) ||
            row.minMm > row.maxMm || value < row.minMm - 1e-8 || value > row.maxMm + 1e-8)
          throw Error(`Fabric measurement ${name} violates size ${size} bounds`)
      }
    }
    const rules = graph.bindings.filter(rule => rule.distanceFormula === measurement &&
      rule.mode === 'polar' && finite(rule.angleDeg))
    if (!rules.length) throw Error('No directly measured polar pattern target to witness')
    let checkedPoints = 0
    for (const rule of rules) {
      const oldPoly = polygon(beforeProject.template, rule.panelId)
      const newPoly = polygon(afterProject.template, rule.panelId)
      if (!oldPoly || !newPoly || !same(oldPoly.edges, newPoly.edges) ||
          !same(oldPoly.curves ?? {}, newPoly.curves ?? {}) ||
          !same(oldPoly.free_curve_points ?? {}, newPoly.free_curve_points ?? {}) ||
          oldPoly.points?.length !== newPoly.points?.length)
        throw Error('Native polar witness requires unchanged straight boundary topology')
      const anchor = newPoly.points[rule.a], target = newPoly.points[rule.pointIndex]
      if (!Array.isArray(anchor) || !Array.isArray(target) ||
          !anchor.every(finite) || !target.every(finite))
        throw Error('Native bound point is nonfinite or missing')
      const angle = rule.angleDeg * Math.PI / 180
      const expected = [anchor[0] + Math.cos(angle) * expectedValueMm / 1000,
        anchor[1] + Math.sin(angle) * expectedValueMm / 1000]
      if (!near(target[0], expected[0]) || !near(target[1], expected[1]))
        throw Error('Rust bound point disagrees with physical measurement')
      for (let i = 0; i < 6; i++) {
        const oldSize = polygon(beforeRun.gradedTemplates[i], rule.panelId)
        const newSize = polygon(afterRun.gradedTemplates[i], rule.panelId)
        if (!oldSize || !newSize || !same(oldSize.edges, newSize.edges) ||
            oldSize.points?.length !== newSize.points?.length)
          throw Error('Six-size graded panel topology changed')
        for (let j = 0; j < newPoly.points.length; j++) {
          const oldPoint = oldSize.points[j], newPoint = newSize.points[j]
          if (!Array.isArray(oldPoint) || !Array.isArray(newPoint))
            throw Error('Missing physical graded vertex')
          for (let axis = 0; axis < 2; axis++) {
            const originalOffset = oldPoint[axis] - oldPoly.points[j][axis]
            const newOffset = newPoint[axis] - newPoly.points[j][axis]
            if (!near(originalOffset, newOffset))
              throw Error(`Grade ${SIZES[i]} did not preserve original vertex offset`)
          }
        }
        checkedPoints++
      }
    }
    const scrub = project => {
      const copy = structuredClone(project)
      for (const key of ['template','grade_run','native_point_bindings','fabric_grade_envelope',
        'state','mesh_signature']) delete copy[key]
      return copy
    }
    if (!same(scrub(beforeProject), scrub(afterProject)))
      throw Error('Native recompute changed unrelated saved project metadata')
    return Object.freeze({ ok: true, format: 'exo-native-fabric-envelope-commit-witness.v1',
      beforeRevision, afterRevision, measurement, oldValueMm: oldValue,
      valueMm: newValue, checkedSizes: 6, checkedBoundTargets: checkedPoints,
      verifiedPersistedEnvelope: true, verifiedNativePointRules: true,
      verifiedOriginalGradeOffsets: true, factoryApproved: false,
      independentlyVendorAccepted: false })
  } catch (error) { return fail(error?.message ?? error) }
}
