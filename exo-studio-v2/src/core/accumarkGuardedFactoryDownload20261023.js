import { buildAccuMarkGuardedFactoryPackage20261023 } from './accumarkGuardedFactoryPackage20261023.js'

/** Explicit user-initiated browser download. This development export is not factory approval. */
export function downloadAccuMarkGuardedFactoryPackage20261023(project, browser = {}) {
  const refused = reason => ({ ok: false, reason, manufacturingApproved: false })
  try {
    const packageResult = buildAccuMarkGuardedFactoryPackage20261023(project, { zip: true })
    if (!packageResult.ok) return refused(packageResult.reason || 'Guarded factory package refused')
    if (!(packageResult.zip instanceof Uint8Array) || packageResult.zip.length === 0) return refused('Guarded factory ZIP missing')
    if (!browser || typeof browser !== 'object' || Array.isArray(browser)) return refused('Invalid browser adapter')
    const doc = browser.document ?? globalThis.document
    const urlApi = browser.URL ?? globalThis.URL
    const BlobClass = browser.Blob ?? globalThis.Blob
    const scheduler = browser.setTimeout ?? browser.window?.setTimeout ?? globalThis.setTimeout
    if (!doc || typeof doc.createElement !== 'function' || !doc.body ||
        typeof doc.body.appendChild !== 'function' || typeof doc.body.removeChild !== 'function' ||
        !urlApi || typeof urlApi.createObjectURL !== 'function' || typeof urlApi.revokeObjectURL !== 'function' ||
        typeof BlobClass !== 'function' || typeof scheduler !== 'function') return refused('Browser download APIs unavailable')

    const anchor = doc.createElement('a')
    if (!anchor || typeof anchor.click !== 'function') return refused('Browser download anchor unavailable')
    const filename = `${String(project.name || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'}-guarded-factory.zip`
    const blob = new BlobClass([packageResult.zip], { type: 'application/zip' })
    let objectUrl
    let attached = false
    let scheduled = false
    try {
      objectUrl = urlApi.createObjectURL(blob)
      if (typeof objectUrl !== 'string' || !objectUrl) throw new Error('Invalid browser object URL')
      anchor.href = objectUrl
      anchor.download = filename
      doc.body.appendChild(anchor)
      attached = true
      anchor.click()
      doc.body.removeChild(anchor)
      attached = false
      scheduler.call(browser.window ?? globalThis, () => urlApi.revokeObjectURL(objectUrl), 1000)
      scheduled = true
      return { ok: true, filename, manufacturingApproved: false }
    } finally {
      try {
        if (attached) doc.body.removeChild(anchor)
      } finally {
        if (objectUrl !== undefined && !scheduled) urlApi.revokeObjectURL(objectUrl)
      }
    }
  } catch (error) {
    return refused(`Guarded factory download refused: ${error instanceof Error ? error.message : String(error)}`)
  }
}
