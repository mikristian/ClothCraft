export const CLO_IMPORT_MANIFEST_URL = '/clo-hardware-converted/manifest.json'

const categories = [
  ['buttonhole', 'Buttonholes'], ['button', 'Buttons'], ['zipper', 'Zippers'],
  ['slider', 'Sliders'], ['puller', 'Pullers'], ['stopper', 'Stoppers'],
  ['tape', 'Tapes'], ['graphic', 'Graphics'], ['trim', 'Other trims'],
]
export const CLO_IMPORT_CATEGORIES = categories

const toText = value => typeof value === 'string' ? value.trim() : ''
const basename = path => String(path || '').replace(/\\/g, '/').split('/').pop() || ''
const publicUrl = value => {
  const raw = toText(value)
  if (!raw || /^(?:data:|blob:|https?:|\/\/)/i.test(raw) || raw.includes('..')) return ''
  if (raw.startsWith('/clo-hardware-converted/')) return encodeURI(raw)
  return encodeURI(`/clo-hardware-converted/${raw.replace(/^\/+/, '').replace(/^clo-hardware-converted\//, '')}`)
}
const classify = (item, text) => {
  const declared = toText(item.category || item.kind || item.group || item.type).toLowerCase()
  // Source paths such as "Button & Buttonhole/Button/..." include both words.
  // Prefer the authoritative catalog category over substring guesses.
  const explicitlyTyped = {
    'buttons': 'button', 'buttonholes': 'buttonhole', 'graphics': 'graphic',
    'zipper pullers': 'puller', 'zipper sliders': 'slider',
    'zipper stoppers': 'stopper', 'zipper tape and teeth textures': 'tape',
  }
  if (explicitlyTyped[declared]) return explicitlyTyped[declared]
  const source = `${declared} ${text}`.toLowerCase()
  if (/button.?hole/.test(source)) return 'buttonhole'
  if (/slider/.test(source)) return 'slider'
  if (/puller|pull.tab|zipper.pull/.test(source)) return 'puller'
  if (/stopper|top.stop|bottom.stop/.test(source)) return 'stopper'
  if (/tape|zipper tape|teeth texture/.test(source)) return 'tape'
  if (/zipper|ykk|coil|teeth/.test(source)) return 'zipper'
  if (/button/.test(source)) return 'button'
  if (/graphic|print|logo/.test(source)) return 'graphic'
  return 'trim'
}

export function normalizeCloImportedHardwareManifest(manifest) {
  const rawItems = Array.isArray(manifest) ? manifest :
    Array.isArray(manifest?.items) ? manifest.items :
    Array.isArray(manifest?.assets) ? manifest.assets :
    Array.isArray(manifest?.files) ? manifest.files : []
  return rawItems.filter(item => item && typeof item === 'object').map((item, index) => {
    const path = toText(item.sourcePath || item.source || item.originalPath || item.path || item.relative_path)
    const name = toText(item.name || item.displayName || item.label) || basename(path).replace(/\.[^.]+$/, '') || `Imported trim ${index + 1}`
    const model = publicUrl(item.glb || item.glbPath || item.modelUrl || item.model || item.outputGlb || item.convertedPath || item.output?.glb)
    const thumbnail = publicUrl(item.thumbnail || item.thumbnailUrl || item.preview || item.previewImage || item.image || item.output?.thumbnail)
    const id = String(item.id || `${index}-${name}`).replace(/[^\w-]/g, '_')
    const format = toText(item.format || item.extension || basename(path).split('.').pop()).replace(/^\./, '').toUpperCase()
    return {
      id: `${id}-${index}`, name, sourcePath: path, category: classify(item, `${name} ${path}`),
      format, model, thumbnail, status: toText(item.status || item.conversionStatus),
      material: toText(item.material), vendor: toText(item.vendor), original: item,
    }
  })
}
