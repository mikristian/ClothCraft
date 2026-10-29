// Authored document coverage and explicit review needs. Never infer factory approval.
const rows = value => Array.isArray(value) ? value : []
const filled = value => value !== null && value !== undefined && String(value).trim() !== ''
const meaningful = value => filled(value) && !/^(?:new construction detail|add seam, fabric, trim or placement instructions\.?|not assigned|draft|pending)$/i.test(String(value).trim())
const issue = (id, pageId, title, reason, severity = 'missing') => ({id, pageId, title, reason, severity})
const cells = (workspace, page, id) => {
  const value = workspace?.cells?.[page]?.[id]
  return value && typeof value === 'object' && !Array.isArray(value) ? value : Array.isArray(value) ? value : {}
}
const override = (workspace, page, id, index, fallback) => cells(workspace, page, id)[index] ?? fallback
const validPosition = position => Array.isArray(position) && position.length === 3 &&
  position.every(v => Number.isFinite(v) && v >= 0 && v <= 1)
const validAnchor = anchor => anchor && typeof anchor === 'object' &&
  ['actor', 'avatar', 'garment', 'cloth'].includes(anchor.source) && Number.isInteger(anchor.triangleIndex) && anchor.triangleIndex >= 0 &&
  Array.isArray(anchor.weights) && anchor.weights.length === 3 &&
  anchor.weights.every(v => Number.isFinite(v) && v >= -1e-4 && v <= 1.0001) &&
  Math.abs(anchor.weights.reduce((sum, v) => sum + v, 0) - 1) <= 1e-3 &&
  (anchor.vertices == null || (Array.isArray(anchor.vertices) && anchor.vertices.length === 3 &&
    anchor.vertices.every(v => Number.isInteger(v) && v >= 0)))
const recordHas = (record, ...keys) => keys.some(key => meaningful(record?.[key]))
// Both tables use COMPONENT/ITEM, TYPE, PLACEMENT, MATERIAL, QUANTITY, INSTRUCTIONS.
// Rows added in the board are {id,cells:[...]}, while saved draft records are objects.
const factoryRowComplete = row => Array.isArray(row?.cells)
  ? [0, 1, 2, 5].every(index => meaningful(row.cells[index])) &&
    (!filled(row.cells[4]) || (Number.isSafeInteger(Number(row.cells[4])) && Number(row.cells[4]) > 0))
  : recordHas(row, 'name', 'description') && meaningful(row?.type) &&
    meaningful(row?.placement) && recordHas(row, 'notes', 'instructions') &&
    (!filled(row?.quantity) || (Number.isSafeInteger(Number(row.quantity)) && Number(row.quantity) > 0))
const recordArray = (draft, workspace, page) => [...rows(draft?.[page]), ...rows(workspace?.extraRows?.[page])]
const revision = value => value == null ? null : String(value)
const sameRevision = (a, b) => a != null && b != null && revision(a) === revision(b)
const imageAvailable = asset => typeof (asset?.dataUrl || asset?.src || asset?._src) === 'string' &&
  /^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|data:image\/svg\+xml,%3Csvg)/i.test(asset.dataUrl || asset.src || asset._src)
const fabricsHaveMissingPanelReferences = (panels, fabrics) => {
  const fabricIds = new Set(fabrics.filter(f => filled(f?.id)).map(f => String(f.id)))
  return panels.some(p => !filled(p?.fabricId) || !fabricIds.has(String(p.fabricId)))
}

export function techPackFactoryReadiness(source = {}, draft = {}, workspace = {}, assets = []) {
  const missing = [], review = []
  const add = (condition, id, page, title, reason, severity = 'missing') => {
    if (condition) return
    ;(severity === 'review' ? review : missing).push(issue(id, page, title, reason, severity))
  }
  add(source?.ready === true, 'source', 'overview', 'Garment source', 'Garment geometry has not loaded')
  const assetLookup = new Map(rows(assets).filter(asset => asset?.id != null).map(asset => [String(asset.id), asset]))
  const references = Object.entries(workspace?.pageAssets || {}).flatMap(([page, ids]) => rows(ids).map(id => ({page,id})))
  references.push(...Object.entries(workspace?.pageFooterAssets || {}).filter(([,id]) => id != null).map(([page,id]) => ({page,id})))
  for (const [page, objects] of Object.entries(workspace?.boardObjects || {})) {
    for (const [key, transform] of Object.entries(objects || {})) if (transform?.assetId != null) references.push({page,id:transform.assetId,key})
  }
  for (const {page,id,key} of references) {
    const asset = assetLookup.get(String(id))
    add(Boolean(asset && imageAvailable(asset)), `asset-${page}-${key || id}`, page, 'Linked artwork asset',
      `Reattach the missing or unsupported image for asset ${String(id)}`, 'review')
    if (asset && asset.sourceRevision != null) {
      add(sameRevision(asset.sourceRevision, source?.revision), `stale-asset-${page}-${id}`, page,
        'Asset source revision', 'Review artwork generated from an earlier garment revision', 'review')
    }
  }
  for (const [page, boxes] of Object.entries(workspace?.pageBoxes || {})) {
    for (const box of rows(boxes)) {
      const table = box?.slot?.spreadsheetTable
      if (!table || !Array.isArray(table.columns)) continue
      if (table.sourceRevision != null) {
        add(sameRevision(table.sourceRevision, source?.revision), `stale-table-${page}-${box.id}`, page,
          'Spreadsheet source revision', 'Refresh source-linked spreadsheet data before export', 'review')
      }
      const staleCell = rows(table.rows).some(row => Object.values(row?.cells || {}).some(cell => cell && typeof cell === 'object' &&
        (cell.override ||
        (cell.sourceRevision != null && !sameRevision(cell.sourceRevision, source?.revision) && !cell.override))))
      add(!staleCell, `table-cells-${page}-${box.id}`, page, 'Spreadsheet source review',
        'Review source revisions and authored overrides in this spreadsheet', 'review')
      const availableHeight = Number(box?.height)
      if (rows(table.rows).length && (!Number.isFinite(availableHeight) || availableHeight < 95 + rows(table.rows).length * 30)) {
        add(false, `table-overflow-${page}-${box.id}`, page, 'Spreadsheet print overflow',
          'Review continuation sheets and row wrapping in print preview', 'review')
      }
    }
  }
  add(meaningful(draft?.sku), 'sku', 'overview', 'Style number', 'Assign the manufacturing style reference')
  add(meaningful(draft?.factory), 'factory', 'overview', 'Factory', 'Identify the receiving factory')
  const panels = rows(source?.panels)
  add(panels.length > 0, 'patterns', 'pattern-cutlist', 'Pattern pieces', 'Provide source cut pieces')
  if (panels.length) add(panels.every(p => filled(p?.quantity) && Number.isSafeInteger(Number(p.quantity)) && Number(p.quantity) > 0 &&
    meaningful(p?.fabricId) && filled(p?.allowance) && Number.isFinite(Number(p.allowance)) && Number(p.allowance) >= 0 && meaningful(p?.grain)),
    'cutlist', 'pattern-cutlist', 'Cutting specification', 'Review quantities, fabric references, seam allowances and grain')
  if (panels.length && fabricsHaveMissingPanelReferences(panels, rows(source?.fabrics))) {
    add(false, 'fabric-links', 'pattern-cutlist', 'Pattern fabric references',
      'One or more cut pieces refer to fabric IDs absent from the source fabric inventory')
  }
  const poms = Object.values(draft?.pom && Object.keys(draft.pom).length ? draft.pom : source?.pom || {}).flatMap(rows)
  add(poms.length > 0 && poms.every(p =>
    filled(p?.cm) && filled(p?.toleranceCm) &&
    Number.isFinite(Number(p.cm)) && Number(p.cm) >= 0 &&
    Number.isFinite(Number(p.toleranceCm)) && Number(p.toleranceCm) >= 0),
    'pom', 'measurements', 'Measurements and tolerances', 'Supply nonnegative numeric measurements and tolerances')
  if (poms.length) add(false, 'pom-verify', 'measurements', 'Physical measurement verification',
    'Geometry-derived or entered measurements need a physical sample check and recorded sign-off', 'review')
  const fabrics = rows(source?.fabrics)
  const bom = rows(draft?.bom)
  add(fabrics.length > 0, 'fabrics', 'fabrics', 'Fabric specification', 'Add garment fabric records')
  if (fabrics.length) add(fabrics.every(f => {
    const item = bom.find(b => String(b?.id) === String(f?.id)) || {}
    return meaningful(override(workspace, 'fabrics', f.id, 2, item.composition ?? f.composition))
      && filled(override(workspace, 'fabrics', f.id, 3, item.gsm ?? f.gsm))
      && Number.isFinite(Number(override(workspace, 'fabrics', f.id, 3, item.gsm ?? f.gsm)))
      && Number(override(workspace, 'fabrics', f.id, 3, item.gsm ?? f.gsm)) > 0
  }), 'fabric-spec', 'fabrics', 'Composition and GSM', 'Specify fiber composition and weight for every fabric')
  add(bom.length > 0, 'bom', 'materials', 'Bill of materials', 'Author the materials and trims list')
  const arrows = rows(workspace?.annotations?.callouts).filter(a => a?.type === 'arrow')
  add(arrows.length > 0 && arrows.every(a => recordHas(a, 'component') && recordHas(a, 'instruction')),
    'arrows', 'callouts', 'Construction arrows', 'Every leader needs an identified component and instruction')
  if (arrows.length) add(arrows.every(a => a?.verified === true || a?.reviewStatus === 'verified'),
    'arrow-review', 'callouts', 'Arrow verification', 'Verify leader placement against the actual construction', 'review')
  const markers = rows(workspace?.interactiveMarkers)
  if (markers.length) {
    add(markers.every(m => meaningful(m?.title) && meaningful(m?.detail) &&
      (m?.anchor ? validAnchor(m.anchor) : validPosition(m?.position))),
    '3d-notes', 'interactive3d', '3D detail notes', 'Complete each marker title, instruction and position')
    add(markers.every(m => m?.verified === true || m?.reviewStatus === 'verified'),
    '3d-review', 'interactive3d', '3D marker verification', 'Review marker placement and notes against garment construction', 'review')
  }
  const labels = recordArray(draft, workspace, 'labels')
  add(labels.length > 0 && labels.every(factoryRowComplete),
    'labels', 'labels', 'Labels and placement', 'Specify branding, care labeling and placement instructions')
  const packaging = recordArray(draft, workspace, 'packaging')
  add(packaging.length > 0 && packaging.every(factoryRowComplete),
    'packaging', 'packaging', 'Packaging instructions', 'Specify packaging type and handling or folding instructions')
  add(rows(draft?.colorways).length > 0 && rows(draft?.colorways).every(c => meaningful(c?.name) && recordHas(c, 'code', 'hex')),
    'colorways', 'colorways', 'Colorways', 'Name each colorway and specify a color reference')
  add(false, 'sample-review', 'notes', 'Sample and factory sign-off',
    'Record physical fit, material tests, label checks and explicit factory approval before release', 'review')
  const blocking = missing.length > 0 || review.length > 0
  const items = [...missing, ...review].map(item => ({...item, label: item.title, status: item.severity,
    description: item.reason}))
  return {ready: !blocking, items, missing, review, issues: [...missing, ...review],
    counts: {missing: missing.length, review: review.length}, status: blocking ? 'needs-attention' : 'ready'}
}
