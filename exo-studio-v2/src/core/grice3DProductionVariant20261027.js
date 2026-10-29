// Grice, Digital Pattern Cutting for Fashion, printed pp. 57–61, 73–90, 130–131.
// Source-preserving 2D production / 3D selection audit; it never creates cloth or sewing.
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value
const exact = (value, keys, optional = []) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).every(key => keys.includes(key) || optional.includes(key)) && keys.every(key => Object.hasOwn(value, key))

export function buildGriceVariantReadiness20261027(snapshot, definition) {
  const blockers = [], warnings = [], pieceRows = []
  const block = message => { if (!blockers.includes(message)) blockers.push(message) }
  const warn = message => { if (!warnings.includes(message)) warnings.push(message) }
  const sourceRevision = Number.isSafeInteger(snapshot?.revision) && snapshot.revision >= 0 ? snapshot.revision : null
  const result = () => ({ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : warnings.length ? 'review' : 'pass',
    readyFor3D: blockers.length === 0 && warnings.length === 0,
    blockers, warnings, pieceRows, sourceRevision, manufacturerApproved: false})

  if (sourceRevision === null) block('Invalid native source revision')
  if (!exact(definition, ['version', 'sourceRevision', 'pieces']) || definition.version !== 1 ||
      !Number.isSafeInteger(definition.sourceRevision) || definition.sourceRevision < 0 ||
      !Array.isArray(definition.pieces)) {
    block('Invalid strict version 1 variant definition')
    return result()
  }
  if (definition.sourceRevision !== sourceRevision) block('Stale variant source revision')
  const authored = snapshot?.template?.panels
  const compiled = snapshot?.panels
  const authoredSeams = snapshot?.template?.seams
  const compiledSeams = snapshot?.seams
  if (!Array.isArray(authored) || authored.length < 1 || authored.length > 128 ||
      !Array.isArray(compiled) || !Array.isArray(authoredSeams) || !Array.isArray(compiledSeams)) {
    block('Missing native authored or compiled panel and seam inventory')
    return result()
  }
  const source = new Map(), scene = new Map(), chosen = new Map()
  for (const panel of authored) {
    if (!validId(panel?.id) || source.has(panel.id)) block('Invalid or duplicate native authored panel ID')
    else source.set(panel.id, panel)
  }
  for (const panel of compiled) {
    if (!validId(panel?.id) || scene.has(panel.id) || !source.has(panel.id)) block('Invalid, unknown or duplicate compiled native panel ID')
    else scene.set(panel.id, panel)
  }
  for (const item of definition.pieces) {
    if (!exact(item, ['panelId', 'quantity', 'production', 'sendTo3D', 'fabricId'], ['substitutePanelId']) ||
        !validId(item.panelId) || ![1, 2].includes(item.quantity) ||
        typeof item.production !== 'boolean' || typeof item.sendTo3D !== 'boolean' ||
        !validId(item.fabricId) || (Object.hasOwn(item, 'substitutePanelId') && !validId(item.substitutePanelId))) {
      block('Invalid strict variant piece definition')
      continue
    }
    if (chosen.has(item.panelId)) { block(`Duplicate variant panel ${item.panelId}`); continue }
    if (!source.has(item.panelId)) { block(`Unknown variant panel ${item.panelId}`); continue }
    chosen.set(item.panelId, item)
  }
  for (const id of source.keys()) if (!chosen.has(id)) block(`Missing variant panel ${id}`)
  if (chosen.size !== source.size || definition.pieces.length !== source.size)
    block('Variant inventory must contain exactly the authored native panels')

  const claims = new Map()
  for (const [id, item] of chosen) {
    const authoredPanel = source.get(id)
    if (item.fabricId !== authoredPanel.fabric) block(`${id}: fabric identity differs from native source`)
    if (item.sendTo3D && !scene.has(id)) block(`${id}: selected 3D panel is absent from compiled scene`)
    const substituteId = item.substitutePanelId
    if (substituteId !== undefined) {
      if (substituteId === id || !source.has(substituteId)) block(`${id}: invalid or unknown substitute panel`)
      else {
        const other = chosen.get(substituteId)
        if (!other || !other.sendTo3D || !scene.has(substituteId)) block(`${id}: substitute is not selected and compiled for 3D`)
        if (source.get(substituteId)?.fabric !== authoredPanel.fabric || other?.fabricId !== item.fabricId)
          block(`${id}: substitute fabric mismatch`)
        if (item.sendTo3D) block(`${id}: source and substitute both selected for 3D`)
        if (claims.has(substituteId)) block(`${id}: ambiguous duplicate 3D substitute target`)
        claims.set(substituteId, id)
      }
    }
    const compiledCount = Number.isSafeInteger(scene.get(id)?.instanceCount) && scene.get(id).instanceCount >= 1
      ? scene.get(id).instanceCount : 1
    if (item.quantity === 2 && item.sendTo3D && compiledCount < 2)
      warn(`${id}: paired piece requires review; compiled scene does not prove two mirrored instances`)
    if (item.quantity === 2 && !item.sendTo3D && substituteId)
      warn(`${id}: paired source substitution requires review of mirrored single/paired correspondence`)
    pieceRows.push({panelId: id, quantity: item.quantity, production: item.production, sendTo3D: item.sendTo3D,
      fabricId: item.fabricId, substitutePanelId: substituteId ?? null,
      compiledFor3D: scene.has(id), compiledInstanceCount: scene.has(id) ? compiledCount : 0,
      requiresPairReview: item.quantity === 2 && item.sendTo3D && compiledCount < 2})
  }

  const compiledSeamIds = new Set()
  for (const seam of compiledSeams) {
    if (!validId(seam?.id) || compiledSeamIds.has(seam.id)) block('Invalid or duplicate compiled seam identity')
    else compiledSeamIds.add(seam.id)
  }
  const authoredSeamIds = new Set()
  for (const seam of authoredSeams) {
    if (!validId(seam?.id) || authoredSeamIds.has(seam.id)) { block('Invalid or duplicate authored seam identity'); continue }
    authoredSeamIds.add(seam.id)
    if (!compiledSeamIds.has(seam.id)) block(`${seam.id}: authored sewing relationship missing from compiled scene`)
    const a = seam?.a?.panel, b = seam?.b?.panel
    if (!validId(a) || !validId(b) || !source.has(a) || !source.has(b)) {
      block(`${seam.id}: unknown sewn boundary endpoint`)
      continue
    }
    for (const endpoint of [a, b]) {
      const piece = chosen.get(endpoint)
      if (!piece) continue
      if (piece.sendTo3D && !scene.has(endpoint)) block(`${seam.id}: sewn 3D endpoint ${endpoint} is uncompiled`)
      if (!piece.sendTo3D && !piece.substitutePanelId)
        block(`${seam.id}: sewn endpoint ${endpoint} excluded from 3D without a substitute`)
      if (piece.substitutePanelId && !piece.sendTo3D)
        block(`${seam.id}: substitute ${piece.substitutePanelId} requires unsupported sewn boundary remapping from ${endpoint}`)
    }
  }
  for (const id of compiledSeamIds) if (!authoredSeamIds.has(id)) block(`${id}: compiled sewing relationship is not authored`)
  if (authoredSeams.length === 0) block('No native sewn relationships available to verify 3D assembly')
  if (!pieceRows.some(row => row.sendTo3D)) block('No pieces selected for 3D')
  if (!pieceRows.some(row => row.production)) warn('No production pieces selected; production variant is empty')
  return result()
}
