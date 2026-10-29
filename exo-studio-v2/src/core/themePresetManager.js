import { DEFAULT_STUDIO_CUSTOMIZATION, normalizeStudioCustomization } from './studioCustomization.js'
import { STUDIO_THEME_IDS } from './studioThemePresets.js'

export const SAVED_THEME_PRESETS_KEY = 'exo.savedThemePresets.v1'
export const THEME_SCHEDULE_KEY = 'exo.themeSchedule.v1'
const MAX_JSON_BYTES = 128000
const MAX_PRESETS = 40
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const safeObject = v => v && typeof v === 'object' && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
const forbiddenKey = key => key === '__proto__' || key === 'prototype' || key === 'constructor'
function checkTree(v, depth = 0) {
  if (depth > 5) throw Error('Theme preset nesting is too deep')
  if (typeof v === 'string') { if (v.length > 256) throw Error('Theme preset text is too long'); return }
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw Error('Invalid number'); return }
  if (typeof v === 'boolean' || v === null) return
  if (!safeObject(v)) throw Error('Invalid theme preset data')
  for (const [key, entry] of Object.entries(v)) {
    if (forbiddenKey(key) || key.length > 80) throw Error('Unsafe theme preset property')
    checkTree(entry, depth + 1)
  }
}
const validName = name => {
  if (typeof name !== 'string') throw Error('Theme name must be text')
  const clean = name.trim()
  if (!clean || clean.length > 64 || /[\u0000-\u001f\u007f<>]/.test(clean)) throw Error('Use a theme name of 1–64 characters')
  return clean
}
const safeId = id => typeof id === 'string' && /^custom-[a-z0-9-]{8,64}$/.test(id)
const appearanceKeys = Object.keys(DEFAULT_STUDIO_CUSTOMIZATION.appearance).filter(key => !['studioColor','backgroundMode','environmentPreset','lightColor','lightIntensity','lightPositionX','lightPositionY','lightPositionZ'].includes(key))
const preferenceKeys = Object.keys(DEFAULT_STUDIO_CUSTOMIZATION.preferences).filter(key => /^twoD/.test(key))
const onlyKeys = (source, keys) => Object.fromEntries(keys.map(key => [key, source[key]]))

export function captureThemeOverrides(customization) {
  const normalized = normalizeStudioCustomization(customization)
  return {appearance:onlyKeys(normalized.appearance, appearanceKeys),preferences:onlyKeys(normalized.preferences, preferenceKeys)}
}

function validateOverrides(overrides) {
  if (!safeObject(overrides) || !safeObject(overrides.appearance) || !safeObject(overrides.preferences)) throw Error('Invalid theme contents')
  checkTree(overrides)
  for (const [section, keys] of [['appearance', appearanceKeys],['preferences', preferenceKeys]]) {
    for (const [key, val] of Object.entries(overrides[section])) {
      if (!keys.includes(key)) throw Error('Unsupported theme property')
      if ((/Color|accent|Backdrop|Tint/i.test(key)) && typeof val === 'string' && val !== 'auto' && !/^#[0-9a-f]{6}$/i.test(val) && !['adaptive','white','ink','accent'].includes(val)) throw Error(`Invalid color: ${key}`)
    }
  }
  const normalized = captureThemeOverrides({...DEFAULT_STUDIO_CUSTOMIZATION,appearance:{...DEFAULT_STUDIO_CUSTOMIZATION.appearance,...overrides.appearance},preferences:{...DEFAULT_STUDIO_CUSTOMIZATION.preferences,...overrides.preferences}})
  for (const section of ['appearance','preferences']) {
    for (const [key,val] of Object.entries(overrides[section])) {
      if (normalized[section][key] !== val) throw Error(`Invalid theme value: ${key}`)
    }
  }
  return normalized
}
function validateEntry(entry) {
  if (!safeObject(entry) || !safeId(entry.id)) throw Error('Invalid theme identifier')
  const name = validName(entry.name)
  if (!safeObject(entry.overrides)) throw Error('Invalid theme contents')
  return {id:entry.id,name,overrides:validateOverrides(entry.overrides)}
}
function parseCollection(json) {
  if (typeof json !== 'string' || json.length > MAX_JSON_BYTES) throw Error('Theme file exceeds the 128 KB limit')
  const payload = JSON.parse(json)
  if (!safeObject(payload) || payload.version !== 1 || !Array.isArray(payload.presets) || payload.presets.length > MAX_PRESETS) throw Error('Invalid theme preset file')
  const presets = payload.presets.map(validateEntry)
  if (new Set(presets.map(p=>p.id)).size !== presets.length) throw Error('Duplicate theme identifiers')
  return presets
}
function getStorage() { return typeof localStorage === 'undefined' ? null : localStorage }
export function loadSavedThemePresets() {
  try { const text = getStorage()?.getItem(SAVED_THEME_PRESETS_KEY); return text ? parseCollection(text) : [] } catch { return [] }
}
function storePresets(presets) {
  const json=JSON.stringify({version:1,presets})
  if (json.length > MAX_JSON_BYTES) throw Error('Theme collection exceeds the storage limit')
  const store=getStorage()
  if (!store) throw Error('Local theme storage is unavailable')
  store.setItem(SAVED_THEME_PRESETS_KEY,json)
  return presets
}
export function saveNamedThemePreset(name, customization) {
  const presets=loadSavedThemePresets()
  if (presets.length >= MAX_PRESETS) throw Error('Maximum of 40 saved themes reached')
  const clean=validName(name)
  const id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`
  const next=validateEntry({id,name:clean,overrides:captureThemeOverrides(customization)})
  storePresets([...presets,next])
  return next
}
export function deleteSavedThemePreset(id) { return storePresets(loadSavedThemePresets().filter(p=>p.id!==id)) }
export function exportSavedThemePresets() { return JSON.stringify({version:1,presets:loadSavedThemePresets()},null,2) }
export function importSavedThemePresets(json) {
  const imports=parseCollection(json)
  const existing=loadSavedThemePresets()
  if (!imports.length) return existing
  const taken=new Set(existing.map(p=>p.id))
  const result=[...existing]
  for(const preset of imports) {
    if(result.length >= MAX_PRESETS) throw Error('Maximum of 40 saved themes reached')
    let id=preset.id
    while(taken.has(id)) id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`
    taken.add(id)
    result.push({...preset,id})
  }
  return storePresets(result)
}
export function applySavedThemePreset(customization, preset) {
  const {overrides}=validateEntry(preset)
  return normalizeStudioCustomization({...customization,appearance:{...customization?.appearance,...overrides.appearance},preferences:{...customization?.preferences,...overrides.preferences}})
}

export const DEFAULT_THEME_SCHEDULE = Object.freeze({mode:'off',dayStart:'07:00',nightStart:'19:00',dayThemeId:'bone-light',nightThemeId:'graphite'})
export function normalizeThemeSchedule(value) {
  const v=safeObject(value)?value:{}
  const themeId=id=>typeof id==='string'&&(STUDIO_THEME_IDS.has(id)||loadSavedThemePresets().some(p=>p.id===id))?id:null
  return {mode:['off','system','time'].includes(v.mode)?v.mode:DEFAULT_THEME_SCHEDULE.mode,
    dayStart:TIME.test(v.dayStart)?v.dayStart:DEFAULT_THEME_SCHEDULE.dayStart,
    nightStart:TIME.test(v.nightStart)?v.nightStart:DEFAULT_THEME_SCHEDULE.nightStart,
    dayThemeId:themeId(v.dayThemeId)||DEFAULT_THEME_SCHEDULE.dayThemeId,
    nightThemeId:themeId(v.nightThemeId)||DEFAULT_THEME_SCHEDULE.nightThemeId}
}
export function loadThemeSchedule() {
  try { const text=getStorage()?.getItem(THEME_SCHEDULE_KEY); return normalizeThemeSchedule(text&&text.length<4096?JSON.parse(text):{}) } catch { return normalizeThemeSchedule() }
}
export function saveThemeSchedule(value) {
  const config=normalizeThemeSchedule(value)
  const store=getStorage();if(!store)throw Error('Local theme storage is unavailable')
  store.setItem(THEME_SCHEDULE_KEY,JSON.stringify(config))
  return config
}
export function resolveThemeScheme(config, {prefersDark=false,now=new Date()}={}) {
  const setting=normalizeThemeSchedule(config)
  if(setting.mode==='off')return null
  if(setting.mode==='system')return prefersDark?'night':'day'
  const time=now.getHours()*60+now.getMinutes()
  const asMinutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3,5))
  const start=asMinutes(setting.dayStart),end=asMinutes(setting.nightStart)
  if(start===end)return prefersDark?'night':'day'
  return (start<end?time>=start&&time<end:time>=start||time<end)?'day':'night'
}
export function resolveScheduledTheme(config, options) {
  const setting=normalizeThemeSchedule(config)
  const scheme=resolveThemeScheme(setting,options)
  if(!scheme)return null
  const id=scheme==='day'?setting.dayThemeId:setting.nightThemeId
  return {scheme,themeId:id,preset:loadSavedThemePresets().find(p=>p.id===id)||null}
}
