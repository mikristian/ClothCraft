/**
 * Curated stage library for EXO ClothCraft Studio V2.
 * The approved EXO01 showroom is the only stage in the current V2 catalog.
 * Separate photo-shoot lighting presets live in photoShootSets.js.
 */
export const EXO_STAGE_ID = 'EXO01'

export const STAGE_PRESETS = Object.freeze([
  Object.freeze({
    id: EXO_STAGE_ID,
    name: 'EXO Stage 01 · Runway Chamber',
    kind: 'runway',
    description: 'Architectural runway chamber with individual gallery seating, detailed stone relief, practical stage lighting and a full-length walkable podium.',
    archetype: 'architectural runway',
    sceneHints: Object.freeze(['Approved Blender studio', '23 optimized stage meshes', 'Garment and avatar remain editable']),
    referenceUrl: null,
    palette: Object.freeze({base:'#48413c'}),
    sceneFile: '/stage-scenes/EXO01.glb',
    posterFile: '/stage-posters/EXO01.png',
    sourceStatus: 'Original EXO Blender Stage 01, approved for V2',
  }),
])

export const listStagePresets = kind => kind ? STAGE_PRESETS.filter(preset => preset.kind === kind) : [...STAGE_PRESETS]
export const getStagePreset = id => STAGE_PRESETS.find(preset => preset.id === id) ?? null
/** Preserve only physically installed stage IDs in saved garments. */
export const normalizeStageId = id => getStagePreset(id) ? id : 'none'
