#!/usr/bin/env node
/**
 * Convert an official CLO OBJ + optional sewing metadata XML export into a
 * source-preserving, lightweight preview fixture. Does not decode proprietary
 * ZPAC internals, alter the CLO document, or infer finished seams/drape.
 *
 * node scripts/extract-clo-garment-preview.mjs input.obj output.json metadata.xml
 */
import {readFile, writeFile} from 'node:fs/promises'
import {basename} from 'node:path'

export function parseCloObjPreview(objText, xmlText = '', sourceName = 'CLO garment OBJ') {
  const positions = []
  const texcoords = []
  const groups = []
  let group = null
  const ensureGroup = () => {
    if (!group) {
      group = {name:'Unassigned', triangles:[], vertices:[], uv:[], sourceVertexIds:[], indices:[]}
      groups.push(group)
    }
    return group
  }
  const vertexMap = new Map()
  const sourceIndex = (text, count) => {
    const n = Number(text)
    const index = n > 0 ? n - 1 : count + n
    if (!Number.isInteger(index) || index < 0 || index >= count) throw new Error(`Invalid OBJ index ${text}`)
    return index
  }
  const localVertex = raw => {
    const [v, vt = ''] = raw.split('/')
    const pIndex = sourceIndex(v, positions.length)
    const uvIndex = vt ? sourceIndex(vt, texcoords.length) : -1
    const key = `${pIndex}/${uvIndex}`
    if (!vertexMap.has(key)) {
      const current = ensureGroup()
      vertexMap.set(key, current.sourceVertexIds.length)
      current.vertices.push(...positions[pIndex])
      current.uv.push(...(uvIndex >= 0 ? texcoords[uvIndex] : [0, 0]))
      current.sourceVertexIds.push(pIndex + 1)
    }
    return vertexMap.get(key)
  }
  for (const line of objText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [type, ...words] = trimmed.split(/\s+/)
    if (type === 'v') positions.push(words.slice(0,3).map(Number))
    else if (type === 'vt') texcoords.push(words.slice(0,2).map(Number))
    else if (type === 'g' || type === 'o') {
      // CLO's exporter uses groups. Ignore object declaration when group
      // names already exist, so OBJ object/group nesting doesn't double count.
      if (type === 'o' && group) continue
      group = {name:words.join('_') || `panel-${groups.length+1}`,vertices:[],uv:[],sourceVertexIds:[],indices:[]}
      groups.push(group)
      vertexMap.clear()
    } else if (type === 'f') {
      const corners = words.map(localVertex)
      if (corners.length < 3) throw new Error('Non-triangular degenerate face')
      for (let j = 1; j + 1 < corners.length; j++) {
        ensureGroup().indices.push(corners[0],corners[j],corners[j+1])
      }
    }
  }
  const usable = groups.filter(g => g.indices.length > 0)
  if (!usable.length) throw new Error('CLO OBJ has no drawable panel groups')
  if (positions.some(vertex=>vertex.some(v=>!Number.isFinite(v)))) throw new Error('Invalid CLO vertex coordinate')
  const sewingPairs = [...xmlText.matchAll(/<SeamLinePair\b[^>]*>([\s\S]*?)<\/SeamLinePair>/g)]
    .map((match,index) => ({id:index+1, paths:[...match[1].matchAll(/MeshPointIndexes\s*=\s*['"]([^'"]+)['"]/g)]
      .map(line => line[1].split('/').map(Number))}))
  for (const pair of sewingPairs) {
    if (pair.paths.length!==2 || pair.paths.some(path=>path.some(id=>!Number.isInteger(id)||id<1||id>positions.length)))
      throw new Error(`Invalid XML sewing pair ${pair.id}`)
  }
  const bounds = positions.reduce((acc,v)=>{
    for(let axis=0;axis<3;axis++){acc.min[axis]=Math.min(acc.min[axis],v[axis]);acc.max[axis]=Math.max(acc.max[axis],v[axis])}
    return acc
  },{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]})
  const round = n => Math.round(n*1000)/1000
  return {
    format:'exo.clo-garment-source-preview.v1',
    provenance:{source:sourceName,kind:'official CLO OBJ + XML export',pose:'authored CLO 3D mesh snapshot',unit:'mm',simulatedFitCertified:false},
    boundsMm:{min:bounds.min.map(round),max:bounds.max.map(round)},
    sourceVertices:positions.length,
    triangleCount:usable.reduce((sum,g)=>sum+g.indices.length/3,0),
    sewingPairs,
    groups:usable.map(g=>({
      name:g.name,vertices:g.vertices.map(round),uv:g.uv.map(round),
      sourceVertexIds:g.sourceVertexIds,indices:g.indices,
    })),
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [input,output,metadata] = process.argv.slice(2)
  if (!input || !output) {
    console.error('Usage: node scripts/extract-clo-garment-preview.mjs input.obj output.json [metadata.xml]')
    process.exitCode = 2
  } else {
    const fixture=parseCloObjPreview(await readFile(input,'utf8'), metadata ? await readFile(metadata,'utf8') : '',basename(input))
    await writeFile(output, JSON.stringify(fixture)+'\n',{flag:'w'})
    console.log(JSON.stringify({output,sourceVertices:fixture.sourceVertices,panels:fixture.groups.map(g=>({name:g.name,vertices:g.vertices.length/3,triangles:g.indices.length/3})),sewingPairs:fixture.sewingPairs.length},null,2))
  }
}
