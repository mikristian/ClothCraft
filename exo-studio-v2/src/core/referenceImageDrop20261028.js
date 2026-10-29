// Browser-to-canvas reference-image drops. A Google Images drag may supply a
// real image file, an HTML <img>, or a direct image URL depending on browser.
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|avif)(?:[?#]|$)/i
const IMAGE_HOST = /(?:^|\.)(?:gstatic\.com|googleusercontent\.com|ggpht\.com)$/i

export function referenceImageFile(file) {
  if (!file) return false
  const types = ['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/avif']
  if (types.includes(file.type)) return true
  return (!file.type || file.type === 'application/octet-stream') && IMAGE_EXTENSION.test(file.name || '')
}

function safeImageUrl(raw, imageElement = false) {
  if (typeof raw !== 'string') return null
  const value = raw.trim().replace(/&amp;/g, '&')
  if (/^data:image\/(?:png|jpeg|webp|gif|avif);base64,/i.test(value)) return value
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    // HTML image elements supply a known image source; other drag formats may
    // contain a Google results PAGE, which must not be imported as an image.
    if (!imageElement && !IMAGE_EXTENSION.test(url.pathname) && !IMAGE_HOST.test(url.hostname)) return null
    return url.href
  } catch { return null }
}

export function imageUrlFromDraggedHtml(html) {
  if (typeof html !== 'string' || !html) return null
  const elements = html.match(/<img\b[^>]*>/gi) || []
  for (const element of elements) {
    const match = element.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)
    const url = safeImageUrl(match?.[1] || match?.[2] || match?.[3], true)
    if (url) return url
  }
  return null
}

export function droppedReferenceImage(dataTransfer) {
  if (!dataTransfer) return null
  const files = Array.from(dataTransfer.files || [])
  const file = files.find(referenceImageFile)
  if (file) return file
  const html = dataTransfer.getData?.('text/html') || ''
  const htmlUrl = imageUrlFromDraggedHtml(html)
  if (htmlUrl) return htmlUrl
  for (const type of ['text/uri-list', 'text/plain']) {
    const candidate = (dataTransfer.getData?.(type) || '').split(/\r?\n/)
      .find(line => line.trim() && !line.startsWith('#'))
    // URL lists can contain image endpoints without a file extension. Treat
    // them as candidates; the loader still checks that an actual image loads.
    const url = safeImageUrl(candidate, type === 'text/uri-list')
    if (url) return url
  }
  return null
}

export function referenceImageDragAvailable(dataTransfer) {
  const types = Array.from(dataTransfer?.types || [])
  return types.some(type => ['Files', 'text/html', 'text/uri-list', 'text/plain'].includes(type))
}
