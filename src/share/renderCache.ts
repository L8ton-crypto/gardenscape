import type { Design } from '../model/types';

// Renders are cached in IndexedDB keyed by design id + preset + a fingerprint
// of everything that affects the picture. Unchanged plan → instant cached image.

const DB = 'gardenscape-renders';
const STORE = 'renders';
const MAX_ENTRIES = 12;

export function designFingerprint(d: Design): string {
  const src = JSON.stringify({
    w: d.widthM, h: d.heightM, b: d.boundary, n: d.northDeg,
    o: d.objects.map(o => [o.type, o.kind, o.x, o.y, o.w, o.h, o.rotation, o.points, o.label, o.color, o.level, o.wallHeight, o.treads]),
  });
  let h = 5381;
  for (let i = 0; i < src.length; i++) h = ((h << 5) + h + src.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' }).createIndex('at', 'at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const keyFor = (d: Design, preset: string) => `${d.id}:${preset}:${designFingerprint(d)}`;

export async function getCachedRender(d: Design, preset: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise(resolve => {
      const req = db.transaction(STORE).objectStore(STORE).get(keyFor(d, preset));
      req.onsuccess = () => resolve(req.result?.image ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function putCachedRender(d: Design, preset: string, image: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({ key: keyFor(d, preset), image, at: Date.now() });
    // evict oldest beyond cap
    const all = store.index('at').openCursor();
    const keys: { key: string; at: number }[] = [];
    all.onsuccess = () => {
      const cur = all.result;
      if (cur) { keys.push({ key: cur.value.key, at: cur.value.at }); cur.continue(); }
      else if (keys.length > MAX_ENTRIES) {
        keys.sort((a, b) => a.at - b.at).slice(0, keys.length - MAX_ENTRIES)
          .forEach(k => db.transaction(STORE, 'readwrite').objectStore(STORE).delete(k.key));
      }
    };
  } catch { /* private mode etc — cache is best-effort */ }
}
