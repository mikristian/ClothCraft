// Browser-only drawing references. Never inject into the Rust garment schema.
export const REFERENCE_LIMIT = 40
export const REFERENCE_FILE_LIMIT = 30 * 1024 * 1024
const DB = 'exo-native-pattern-references-v1'
const STORE = 'projects'
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const queues = new Map()
const clamp = (n, low, high) => Math.max(low, Math.min(high, n))
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback

export function referenceProjectKey(snapshot) {
  const t = snapshot?.template
  if (!t?.panels?.length) return null
  return [t.id || t.name || 'untitled', ...t.panels.map(p => p.id)].join('::')
}

export function normalizePatternReference(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid reference')
  const dataUrl = String(value.dataUrl || '')
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl) || dataUrl.length > 12_000_000) throw new Error('Invalid reference photo')
  const naturalWidth = clamp(Math.floor(finite(value.naturalWidth, 0)), 1, 100000)
  const naturalHeight = clamp(Math.floor(finite(value.naturalHeight, 0)), 1, 100000)
  const widthMm = clamp(finite(value.widthMm, 200), 1, 100000)
  const heightMm = clamp(finite(value.heightMm, widthMm * naturalHeight / naturalWidth), 1, 100000)
  return {
    id: String(value.id || '').slice(0, 120) || (globalThis.crypto?.randomUUID?.() || `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    name: String(value.name || 'Reference photo').slice(0, 180),
    dataUrl, naturalWidth, naturalHeight, widthMm, heightMm,
    xMm: clamp(finite(value.xMm, 0), -100000, 100000),
    yMm: clamp(finite(value.yMm, 0), -100000, 100000),
    rotation: clamp(finite(value.rotation, 0), -3600, 3600),
    opacity: clamp(finite(value.opacity, .5), 0, 1),
    visible: value.visible !== false, locked: value.locked !== false,
    lockAspectRatio: value.lockAspectRatio !== false,
  }
}

export function validatePatternReferences(records) {
  if (!Array.isArray(records) || records.length > REFERENCE_LIMIT) throw new Error('Reference count exceeds limit')
  const normalized = records.map(normalizePatternReference)
  if (new Set(normalized.map(r => r.id)).size !== normalized.length) throw new Error('Duplicate reference IDs')
  return normalized
}

// One real-world ruler measurement is enough to calibrate a flat, square-on
// photograph uniformly. Points are normalized [0,1] positions in the image.
// Perspective distortion must be corrected before relying on the trace.
export function calibratePatternReferenceDistance20261025(reference,points,actualMm) {
  if(!Array.isArray(points)||points.length!==2||
    !points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
      p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))throw Error('Select two positions on the reference image')
  const nw=Number(reference?.naturalWidth),nh=Number(reference?.naturalHeight)
  const length=Number(actualMm)
  if(!Number.isFinite(nw)||!Number.isFinite(nh)||nw<=0||nh<=0||
    !Number.isFinite(length)||length<=0||length>100000)throw Error('Invalid image dimensions or known length')
  const pixels=Math.hypot((points[1].x-points[0].x)*nw,(points[1].y-points[0].y)*nh)
  if(pixels<2)throw Error('Pick reference points farther apart')
  const widthMm=length*nw/pixels,heightMm=length*nh/pixels
  if(widthMm<1||heightMm<1||widthMm>100000||heightMm>100000)throw Error('Calibrated image would be outside supported dimensions')
  return {widthMm,heightMm,lockAspectRatio:true}
}

function connect() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('IndexedDB is unavailable')); return }
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE) }
    request.onerror = () => reject(request.error || new Error('Reference database failed'))
    request.onsuccess = () => resolve(request.result)
  })
}
async function transact(key, payload, write) {
  if (!key || typeof key !== 'string') throw new Error('A project key is required')
  const db = await connect()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, write ? 'readwrite' : 'readonly')
      const request = write ? tx.objectStore(STORE).put(payload, key) : tx.objectStore(STORE).get(key)
      let result
      request.onsuccess = () => { result = request.result }
      request.onerror = () => reject(request.error || new Error('Reference operation failed'))
      tx.onerror = () => reject(tx.error || new Error('Reference transaction failed'))
      tx.onabort = () => reject(tx.error || new Error('Reference transaction aborted'))
      tx.oncomplete = () => resolve(result)
    })
  } finally { db.close() }
}
export async function readPatternReferences(key) {
  const result = await transact(key, undefined, false)
  return Array.isArray(result) ? validatePatternReferences(result) : []
}
export function savePatternReferences(key, records) {
  const safe = validatePatternReferences(records)
  const previous = queues.get(key) || Promise.resolve()
  const pending = previous.catch(() => {}).then(() => transact(key, safe, true))
  queues.set(key, pending)
  pending.finally(() => { if (queues.get(key) === pending) queues.delete(key) }).catch(() => {})
  return pending
}

export async function importPatternReferenceFile(file) {
  if (!file || !TYPES.has(file.type)) throw new Error('Select a JPG, PNG, or WebP photo')
  if (file.size < 1 || file.size > REFERENCE_FILE_LIMIT) throw new Error('Reference image must be under 30 MB')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Could not decode the photo'))
      img.src = url
    })
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 100_000_000) throw new Error('Image dimensions exceed safety limits')
    const factor = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * factor))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * factor))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Image conversion unavailable')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', .85)
    return normalizePatternReference({
      name:file.name, dataUrl, naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight,
      widthMm:200, heightMm:200 * img.naturalHeight/img.naturalWidth,
    })
  } finally { URL.revokeObjectURL(url) }
}
