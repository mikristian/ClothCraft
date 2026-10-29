import fs from 'node:fs'
import path from 'node:path'

const COLLECTIONS = Object.freeze({
  upstream_research_fixtures: 'Third-party research DXF fixture',
  github_original_references: 'GitHub garment CAD reference',
  github_derived_garmentcode: 'GarmentCode derived DXF block (sampled)',
  generated_basic_blocks: 'Synthetic drafting block',
  generated_complete_garments: 'Synthetic garment draft',
  openpattern_local_imports: 'Open+Pattern CC BY 4.0',
})

/** A local, read-only metadata view. Never serves the DXF file bytes or grants manufacturing approval. */
export function readPatternIntelligenceCatalog(projectRoot) {
  const manifestPath = path.join(projectRoot, 'download', 'garment-dxf-library-20261023', 'reports', 'library-catalog.json')
  if (!fs.existsSync(manifestPath)) return {
    ok: false, code: 'PATTERN_CATALOG_MISSING',
    error: 'Local DXF catalog unavailable. Run the Pattern Intelligence import/index step.',
    files: [], available: 0, pendingOpenPattern: 0,
  }
  let catalog
  try { catalog = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) }
  catch { return { ok: false, code: 'PATTERN_CATALOG_INVALID', error: 'Local DXF catalog is unreadable', files: [] } }
  if (!Array.isArray(catalog?.files) || catalog.files.length > 150000) {
    return { ok: false, code: 'PATTERN_CATALOG_INVALID', error: 'Local DXF catalog schema is invalid', files: [] }
  }
  const files = catalog.files.filter(record => record &&
    typeof record.filename === 'string' && typeof record.sha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(record.sha256) && typeof record.collection === 'string' &&
    Object.hasOwn(COLLECTIONS, record.collection)).map(record => {
    const relativePath = record.filename.replaceAll('\\', '/')
    const parts = relativePath.split('/')
    const garment = (record.collection === 'openpattern_local_imports' && record.originalName || parts.at(-1))
      ?.replace(/\.dxf$/i, '').replaceAll(/[_-]+/g, ' ').trim() || 'DXF pattern'
    let size = null
    if (record.collection === 'generated_basic_blocks') {
      const match = /^pattern_(\d+)\.dxf$/i.exec(parts.at(-1) || '')
      size = match?.[1] || null
    }
    if (record.collection === 'generated_complete_garments') {
      const match = /^pattern_(\d+)\.dxf$/i.exec(parts.at(-1) || '')
      size = match?.[1] || null
    }
    const garmentcodeNames = { dress_pencil:'Pencil dress', hoody_mean:'Hoodie', js_mean_all:'Jumpsuit', shirt_mean:'Shirt' }
    const family = record.collection === 'generated_basic_blocks' ? parts.slice(2, -2).join(' / ') :
      record.collection === 'generated_complete_garments' ? parts[2] || 'garment' : null
    const source = /^https:\/\/[a-z0-9.-]+\//i.test(record.source || '') ? record.source : null
    return {
      id: record.sha256,
      name: record.collection === 'github_derived_garmentcode' ? `${garmentcodeNames[record.group] || 'GarmentCode'} / ${garment}` :
        ['upstream_research_fixtures', 'openpattern_local_imports', 'github_original_references'].includes(record.collection) ? garment :
        record.collection === 'generated_basic_blocks' ? `${family || 'Block'} · ${size || garment}` :
          `${family || 'Garment'} · ${size || garment}`,
      filename: parts.at(-1) || '',
      relativePath,
      type: COLLECTIONS[record.collection],
      collection: record.collection,
      source,
      license: record.licenseStatus || 'Review required',
      attribution: typeof record.attribution === 'string' ? record.attribution : null,
      derivation: typeof record.derivation === 'string' ? record.derivation : null,
      size,
      bytes: Number.isSafeInteger(record.bytes) ? record.bytes : null,
      geometryEntityTags: Number.isSafeInteger(record.geometryEntityTags) ? record.geometryEntityTags : null,
      factoryApproved: false,
      trainingPermissionVerified: false,
    }
  })
  const queuePath = path.join(projectRoot, 'download', 'garment-dxf-library-20261023', 'reports', 'openpattern-free-checkout-queue.json')
  let pendingOpenPattern = 0
  if (fs.existsSync(queuePath)) {
    try { const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'))
      if (Array.isArray(queue)) {
        const importedSourceUrls = new Set(files.filter(file => file.collection === 'openpattern_local_imports').map(file => file.source))
        pendingOpenPattern = queue.filter(item => item && item.downloaded !== true &&
          !importedSourceUrls.has(item.productUrl)).length
      }
    } catch { /* Queue is optional; actual downloaded inventory remains authoritative. */ }
  }
  return { ok: true, schema: 'exo.pattern-intelligence-read-only.v1', available: files.length,
    pendingOpenPattern, factoryCertified: false,
    licenseNote: 'Third-party fixture rights for AI training or redistribution remain unverified; all patterns are development/reference only.',
    files }
}
