import type { Design } from '../model/types';

const INDEX_KEY = 'gardenscape:index';
const DESIGN_KEY = (id: string) => `gardenscape:design:${id}`;
const THUMB_KEY = (id: string) => `gardenscape:thumb:${id}`;

export interface DesignMeta { id: string; name: string; updatedAt: number }

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* quota / private mode */ }
}

export function listDesigns(): DesignMeta[] {
  const raw = safeGet(INDEX_KEY);
  if (!raw) return [];
  try { return (JSON.parse(raw) as DesignMeta[]).sort((a, b) => b.updatedAt - a.updatedAt); }
  catch { return []; }
}

export function loadDesign(id: string): Design | null {
  const raw = safeGet(DESIGN_KEY(id));
  if (!raw) return null;
  try { return JSON.parse(raw) as Design; } catch { return null; }
}

export function saveDesign(d: Design) {
  safeSet(DESIGN_KEY(d.id), JSON.stringify(d));
  const idx = listDesigns().filter(m => m.id !== d.id);
  idx.push({ id: d.id, name: d.name, updatedAt: d.updatedAt });
  safeSet(INDEX_KEY, JSON.stringify(idx));
}

export function deleteDesign(id: string) {
  try {
    localStorage.removeItem(DESIGN_KEY(id));
    localStorage.removeItem(THUMB_KEY(id));
  } catch { /* ignore */ }
  safeSet(INDEX_KEY, JSON.stringify(listDesigns().filter(m => m.id !== id)));
}

export function saveThumb(id: string, dataUrl: string) { safeSet(THUMB_KEY(id), dataUrl); }
export function loadThumb(id: string): string | null { return safeGet(THUMB_KEY(id)); }
