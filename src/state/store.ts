import { create } from 'zustand';
import type { Design, GardenObject, Tool, LineType } from '../model/types';
import { uid } from '../model/types';
import { saveDesign } from '../storage/local';

interface AppState {
  design: Design | null;
  viewOnly: boolean;
  tool: Tool;
  lineType: LineType;
  selectedId: string | null;
  snap: boolean;
  showDims: boolean;
  showLayers: { planting: boolean; hard: boolean; utilities: boolean };
  draftPoints: number[];        // in-progress polygon/line, world coords
  measure: number[] | null;     // [x1,y1,x2,y2] while measuring
  past: Design[];
  future: Design[];

  setDesign: (d: Design | null, viewOnly?: boolean) => void;
  setTool: (t: Tool) => void;
  setLineType: (t: LineType) => void;
  select: (id: string | null) => void;
  setSnap: (v: boolean) => void;
  toggleDims: () => void;
  toggleLayer: (k: keyof AppState['showLayers']) => void;
  setDraftPoints: (pts: number[]) => void;
  setMeasure: (m: number[] | null) => void;

  commit: (mut: (d: Design) => void) => void;   // history-recording mutation
  updateObject: (id: string, patch: Partial<GardenObject>) => void;
  addObject: (o: Omit<GardenObject, 'id'>) => string;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  undo: () => void;
  redo: () => void;
  snapVal: (v: number) => number;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function autosave(d: Design) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveDesign(d), 400);
}

const clone = (d: Design): Design => JSON.parse(JSON.stringify(d));

export const useStore = create<AppState>()((set, get) => ({
  design: null,
  viewOnly: false,
  tool: 'select',
  lineType: 'fence',
  selectedId: null,
  snap: true,
  showDims: false,
  showLayers: { planting: true, hard: true, utilities: true },
  draftPoints: [],
  measure: null,
  past: [],
  future: [],

  setDesign: (d, viewOnly = false) => set({ design: d, viewOnly, past: [], future: [], selectedId: null, tool: 'select', draftPoints: [], measure: null }),
  setTool: t => set({ tool: t, draftPoints: [], measure: null, selectedId: t === 'select' ? get().selectedId : null }),
  setLineType: t => set({ lineType: t }),
  select: id => set({ selectedId: id }),
  setSnap: v => set({ snap: v }),
  toggleDims: () => set(s => ({ showDims: !s.showDims })),
  toggleLayer: k => set(s => ({ showLayers: { ...s.showLayers, [k]: !s.showLayers[k] } })),
  setDraftPoints: pts => set({ draftPoints: pts }),
  setMeasure: m => set({ measure: m }),

  commit: mut => {
    const { design, past, viewOnly } = get();
    if (!design || viewOnly) return;
    const prev = clone(design);
    const next = clone(design);
    mut(next);
    next.updatedAt = Date.now();
    set({ design: next, past: [...past.slice(-99), prev], future: [] });
    autosave(next);
  },

  updateObject: (id, patch) => get().commit(d => {
    const o = d.objects.find(o => o.id === id);
    if (o) Object.assign(o, patch);
  }),

  addObject: o => {
    const id = uid();
    get().commit(d => { d.objects.push({ ...o, id }); });
    return id;
  },

  removeObject: id => {
    get().commit(d => { d.objects = d.objects.filter(o => o.id !== id); });
    if (get().selectedId === id) set({ selectedId: null });
  },

  duplicateObject: id => {
    const { design } = get();
    const src = design?.objects.find(o => o.id === id);
    if (!src) return;
    const nid = uid();
    get().commit(d => {
      const copy: GardenObject = JSON.parse(JSON.stringify(src));
      copy.id = nid;
      copy.x += 0.5; copy.y += 0.5;
      if (copy.points) copy.points = copy.points.map((v, i) => v + (i % 2 === 0 ? 0.5 : 0.5));
      d.objects.push(copy);
    });
    set({ selectedId: nid });
  },

  undo: () => {
    const { past, future, design } = get();
    if (!past.length || !design) return;
    const prev = past[past.length - 1];
    set({ design: prev, past: past.slice(0, -1), future: [design, ...future].slice(0, 100), selectedId: null });
    autosave(prev);
  },
  redo: () => {
    const { past, future, design } = get();
    if (!future.length || !design) return;
    const next = future[0];
    set({ design: next, future: future.slice(1), past: [...past, design].slice(-100), selectedId: null });
    autosave(next);
  },

  snapVal: v => {
    const { snap, design } = get();
    if (!design) return v;
    // magnet ON → align to the visible grid; OFF → still round to the fine step
    const g = snap ? design.gridSizeM : (design.snapStepM ?? 0.1);
    return Math.round((Math.round(v / g) * g) * 1000) / 1000;
  },
}));

// dev/testing hook
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__gs = useStore;
