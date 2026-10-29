// Pure draft helpers: the caller persists the returned draft via its existing document save.
const list = value => Array.isArray(value) ? value : []
// Preserve spaces while controlled inputs are being edited; only IDs are normalized.
const string = (value, limit = 500) => typeof value === 'string' ? value.slice(0, limit) : ''
const idString = value => string(value, 100).trim()
const fields = ['name', 'code', 'hex', 'fabric', 'finish', 'notes']

export function normalizeTechPackColorways(value) {
  const seen = new Set()
  return list(value).filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map(item => {
      const result = {id: idString(item.id)}
      for (const field of fields) result[field] = string(item[field], field === 'notes' ? 2000 : 200)
      return result
    }).filter(item => {
      if (!item.id || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
}

export function addTechPackColorway(draft = {}, patch = {}) {
  const colorways = normalizeTechPackColorways(draft.colorways)
  const existing = new Set(colorways.map(item => item.id))
  let index = 1
  while (existing.has(`colorway-${index}`)) index += 1
  const next = {id: `colorway-${index}`}
  for (const field of fields) next[field] = string(patch?.[field], field === 'notes' ? 2000 : 200)
  return {...draft, colorways: [...colorways, next]}
}

export function updateTechPackColorway(draft = {}, id, patch = {}) {
  const safePatch = patch && typeof patch === 'object' ? patch : {}
  return {...draft, colorways: normalizeTechPackColorways(draft.colorways).map(item => {
    if (item.id !== id) return item
    const next = {...item}
    for (const field of fields) if (Object.hasOwn(safePatch, field)) next[field] = string(safePatch[field], field === 'notes' ? 2000 : 200)
    return next
  })}
}

export function removeTechPackColorway(draft = {}, id) {
  return {...draft, colorways: normalizeTechPackColorways(draft.colorways).filter(item => item.id !== id)}
}
