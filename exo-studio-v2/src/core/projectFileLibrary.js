// Durable browser library for saved garment work. Large snapshots and files live
// in IndexedDB; nothing is written to localStorage or reconstructed from thumbnails.
const DB_NAME = 'exo-clothcraft-project-file-library';
const DB_VERSION = 2;
const STORES = { projects: 'projects', revisions: 'revisions', attachments: 'attachments', collections: 'collections' };
export const LIBRARY_STATUSES = Object.freeze(['working', 'development', 'sample', 'finished', 'base-pattern']);
export const LIBRARY_ASSET_CATEGORIES = Object.freeze([
  'garment', 'pattern', 'fabric', 'trim', 'button', 'zipper', 'hardware',
  'studio-set', 'photo-shoot-set', 'techpack', 'dxf', 'spec', 'image', 'logo', 'other',
]);

function id() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Library transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('Library transaction aborted'));
  });
}
export function openProjectLibrary() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is unavailable. Project File Library requires browser storage.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.projects)) {
        const s = db.createObjectStore(STORES.projects, { keyPath: 'id' });
        s.createIndex('collection', 'collection', { unique: false });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.revisions)) {
        const s = db.createObjectStore(STORES.revisions, { keyPath: 'id' });
        s.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.attachments)) {
        const s = db.createObjectStore(STORES.attachments, { keyPath: 'id' });
        s.createIndex('projectId', 'projectId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.collections)) {
        const s = db.createObjectStore(STORES.collections, { keyPath: 'id' });
        s.createIndex('name', 'name', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Cannot open Project File Library'));
    req.onblocked = () => reject(new Error('Close other library tabs to finish upgrading storage.'));
  });
}
async function transact(stores, mode, fn) {
  const db = await openProjectLibrary();
  try {
    const tx = db.transaction(stores, mode);
    const done = txDone(tx);
    let value;
    try { value = await fn(tx); } catch (error) {
      try { tx.abort(); } catch { /* transaction may already have closed */ }
      await done.catch(() => {});
      throw error;
    }
    await done;
    return value;
  } finally { db.close(); }
}
function cleanStatus(status) {
  if (status == null) return 'working';
  if (!LIBRARY_STATUSES.includes(status)) throw new Error(`Unknown project status: ${status}`);
  return status;
}
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function snapshotProvided(payload) {
  return hasOwn(payload, 'snapshot') && payload.snapshot !== undefined;
}
function requireSnapshot(snapshot) {
  if (snapshot === undefined || snapshot === null) throw new Error('A real saved project snapshot is required');
}
function projectMetadata(p) {
  const { snapshot, ...metadata } = p;
  return metadata;
}
export async function listProjects({ query = '', collection, status, category, includeSnapshot = false } = {}) {
  const all = await transact([STORES.projects], 'readonly', tx => request(tx.objectStore(STORES.projects).getAll()));
  const term = String(query).trim().toLocaleLowerCase();
  return all.filter(p => (
    (!collection || p.collection === collection)
    && (!status || p.status === status)
    && (!category || p.category === category)
    && (!term || [p.name, p.collection, p.description, p.category, ...(p.tags || [])]
      .some(v => String(v || '').toLocaleLowerCase().includes(term)))
  )).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(p => includeSnapshot ? p : projectMetadata(p));
}
export async function getProject(projectId) {
  return transact([STORES.projects], 'readonly', tx => request(tx.objectStore(STORES.projects).get(projectId)));
}
export async function listCollections() {
  const rows = await transact([STORES.collections], 'readonly', tx =>
    request(tx.objectStore(STORES.collections).getAll()));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
export async function createCollection({ name } = {}) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('Collection name is required');
  const collection = { id: id(), name: trimmed, createdAt: new Date().toISOString() };
  return transact([STORES.collections], 'readwrite', async tx => {
    tx.objectStore(STORES.collections).add(collection);
    return collection;
  });
}
export async function saveProject(input) {
  if (!input || typeof input !== 'object') throw new Error('Project input is required');
  const projectId = input.id || id();
  const now = new Date().toISOString();
  return transact([STORES.projects, STORES.revisions], 'readwrite', async tx => {
    const projects = tx.objectStore(STORES.projects);
    const revisions = tx.objectStore(STORES.revisions);
    const previous = await request(projects.get(projectId));
    if (!previous && !snapshotProvided(input)) throw new Error('New project requires a real saved snapshot');
    if (snapshotProvided(input)) requireSnapshot(input.snapshot);
    const nextSnapshot = snapshotProvided(input) ? input.snapshot : previous.snapshot;
    const number = previous ? previous.currentVersion + (snapshotProvided(input) ? 1 : 0) : 1;
    const next = {
      ...previous,
      ...input,
      id: projectId,
      name: String(input.name ?? previous?.name ?? 'Untitled Project').trim() || 'Untitled Project',
      collection: String(input.collection ?? previous?.collection ?? ''),
      status: cleanStatus(input.status ?? previous?.status),
      category: input.category ?? previous?.category ?? 'garment',
      tags: input.tags ?? previous?.tags ?? [],
      description: input.description ?? previous?.description ?? '',
      metadata: input.metadata ?? previous?.metadata ?? {},
      fabricBOM: input.fabricBOM ?? previous?.fabricBOM ?? [],
      specs: input.specs ?? previous?.specs ?? {},
      snapshot: nextSnapshot,
      snapshotFormat: input.snapshotFormat ?? previous?.snapshotFormat ?? 'legacy',
      currentVersion: number,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    projects.put(next);
    if (!previous || snapshotProvided(input)) revisions.add({
      id: id(), projectId, version: number, label: String(input.label ?? `V${number}`),
      notes: String(input.notes ?? ''), snapshot: nextSnapshot,
      snapshotFormat: next.snapshotFormat, createdAt: now,
    });
    return projectMetadata(next);
  });
}
export async function listRevisions(projectId, { includeSnapshot = false } = {}) {
  const entries = await transact([STORES.revisions], 'readonly', tx =>
    request(tx.objectStore(STORES.revisions).index('projectId').getAll(projectId)));
  return entries.sort((a, b) => b.version - a.version)
    .map(r => includeSnapshot ? r : projectMetadata(r));
}
export async function getRevision(revisionId) {
  return transact([STORES.revisions], 'readonly', tx => request(tx.objectStore(STORES.revisions).get(revisionId)));
}
export async function addRevision(projectId, { snapshot, notes = '', snapshotFormat, label } = {}) {
  requireSnapshot(snapshot);
  const project = await getProject(projectId);
  if (!project) throw new Error('Project not found');
  return saveProject({ id: projectId, snapshot, notes, label, snapshotFormat: snapshotFormat || project.snapshotFormat });
}
export async function restoreRevision(projectId, revisionId, notes = 'Restored earlier revision') {
  const revision = await getRevision(revisionId);
  if (!revision || revision.projectId !== projectId) throw new Error('Revision not found for project');
  // Restoration creates another revision, retaining the complete intervening history.
  return addRevision(projectId, { snapshot: revision.snapshot, snapshotFormat: revision.snapshotFormat, notes });
}
export async function saveAttachment(projectId, { blob, name, category = 'other', mimeType, metadata = {} } = {}) {
  if (!(blob instanceof Blob)) throw new Error('Attachment must be a real Blob or File');
  const project = await getProject(projectId);
  if (!project) throw new Error('Project not found');
  const attachment = {
    id: id(), projectId, name: String(name || blob.name || 'Attachment'),
    category, mimeType: mimeType || blob.type || 'application/octet-stream',
    size: blob.size, blob, metadata, createdAt: new Date().toISOString(),
  };
  return transact([STORES.attachments], 'readwrite', async tx => {
    tx.objectStore(STORES.attachments).add(attachment);
    return { ...attachment, blob: undefined };
  });
}
export async function getAttachment(attachmentId) {
  return transact([STORES.attachments], 'readonly', tx => request(tx.objectStore(STORES.attachments).get(attachmentId)));
}
export async function listAttachments(projectId) {
  const rows = await transact([STORES.attachments], 'readonly', tx =>
    request(tx.objectStore(STORES.attachments).index('projectId').getAll(projectId)));
  return rows.map(({ blob, ...rest }) => rest);
}
export async function downloadAttachment(attachmentId) {
  const attachment = await getAttachment(attachmentId);
  if (!attachment) throw new Error('Attachment not found');
  return { name: attachment.name, blob: attachment.blob, mimeType: attachment.mimeType };
}
export async function deleteAttachment(attachmentId) {
  return transact([STORES.attachments], 'readwrite', async tx => {
    const store = tx.objectStore(STORES.attachments);
    if (!await request(store.get(attachmentId))) return false;
    store.delete(attachmentId);
    return true;
  });
}
export async function deleteProject(projectId) {
  return transact(Object.values(STORES), 'readwrite', async tx => {
    const projectStore = tx.objectStore(STORES.projects);
    if (!await request(projectStore.get(projectId))) return false;
    for (const storeName of [STORES.revisions, STORES.attachments]) {
      const store = tx.objectStore(storeName);
      const keys = await request(store.index('projectId').getAllKeys(projectId));
      keys.forEach(key => store.delete(key));
    }
    projectStore.delete(projectId);
    return true;
  });
}
function bytesToBase64(bytes) {
  let result = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    result += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(result);
}
function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
export async function exportLibraryBackup() {
  const [projects, revisions, attachments, collections] = await Promise.all([
    transact([STORES.projects], 'readonly', tx => request(tx.objectStore(STORES.projects).getAll())),
    transact([STORES.revisions], 'readonly', tx => request(tx.objectStore(STORES.revisions).getAll())),
    transact([STORES.attachments], 'readonly', tx => request(tx.objectStore(STORES.attachments).getAll())),
    transact([STORES.collections], 'readonly', tx => request(tx.objectStore(STORES.collections).getAll())),
  ]);
  return {
    format: 'exo-clothcraft-project-library', schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    projects, revisions, collections,
    attachments: await Promise.all(attachments.map(async ({ blob, ...rest }) => ({
      ...rest, base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    }))),
  };
}
export async function importLibraryBackup(backup, { conflict = 'copy' } = {}) {
  if (typeof backup === 'string') backup = JSON.parse(backup);
  if (backup?.format !== 'exo-clothcraft-project-library' || ![1, 2].includes(backup.schemaVersion)
      || !Array.isArray(backup.projects) || !Array.isArray(backup.revisions)
      || !Array.isArray(backup.attachments)
      || (backup.schemaVersion === 2 && !Array.isArray(backup.collections))) throw new Error('Unsupported project library backup');
  if (!['skip', 'copy'].includes(conflict)) throw new Error('Conflict mode must be skip or copy');
  // Validate all attachment data before starting the atomic transaction.
  const attachments = backup.attachments.map(a => {
    if (typeof a.base64 !== 'string') throw new Error('Backup attachment has no bytes');
    const { base64, ...rest } = a;
    return { ...rest, blob: new Blob([base64ToBytes(base64)], { type: a.mimeType }) };
  });
  return transact(Object.values(STORES), 'readwrite', async tx => {
    const projects = tx.objectStore(STORES.projects);
    const revisions = tx.objectStore(STORES.revisions);
    const files = tx.objectStore(STORES.attachments);
    const collectionsStore = tx.objectStore(STORES.collections);
    const mapping = new Map();
    const collectionMapping = new Map();
    let imported = 0, skipped = 0;
    for (const collection of backup.collections || []) {
      if (!collection?.id || !String(collection.name ?? '').trim()) throw new Error('Invalid backup collection');
      const existing = await request(collectionsStore.get(collection.id));
      if (existing && conflict === 'skip') {
        collectionMapping.set(collection.id, collection.id);
        continue;
      }
      const newId = existing ? id() : collection.id;
      collectionMapping.set(collection.id, newId);
      collectionsStore.add({ ...collection, id: newId });
    }
    for (const p of backup.projects) {
      requireSnapshot(p.snapshot);
      const exists = await request(projects.get(p.id));
      if (exists && conflict === 'skip') { skipped++; continue; }
      const newId = exists ? id() : p.id;
      mapping.set(p.id, newId);
      projects.add({ ...p, id: newId,
        ...(p.collectionId && collectionMapping.has(p.collectionId)
          ? { collectionId: collectionMapping.get(p.collectionId) } : {}),
        ...(p.collection && collectionMapping.has(p.collection)
          ? { collection: collectionMapping.get(p.collection) } : {}),
      });
      imported++;
    }
    for (const rev of backup.revisions) {
      if (!mapping.has(rev.projectId)) continue;
      const newId = mapping.get(rev.projectId);
      const collision = await request(revisions.get(rev.id));
      revisions.add({ ...rev, id: collision || newId !== rev.projectId ? id() : rev.id, projectId: newId });
    }
    for (const file of attachments) {
      if (!mapping.has(file.projectId)) continue;
      const newId = mapping.get(file.projectId);
      const collision = await request(files.get(file.id));
      files.add({ ...file, id: collision || newId !== file.projectId ? id() : file.id, projectId: newId });
    }
    return { imported, skipped };
  });
}
