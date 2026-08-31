// All dimensions in metres. World coords: 1 unit = 1 m; Stage scale converts to px.

export type ObjectKind = 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'symbol' | 'steps' | 'note';

export interface GardenObject {
  id: string;
  type: string;          // key into LIBRARY (or 'custom-area' / 'custom-poly')
  kind: ObjectKind;
  x: number;             // centre for rect/circle/symbol/steps; ignored for line/polygon
  y: number;
  w: number;             // rect/steps width; circle diameter
  h: number;             // rect/steps depth
  rotation: number;      // degrees
  points?: number[];     // line/polygon: flat [x1,y1,x2,y2,...] in world metres (absolute)
  label?: string;
  color?: string;        // pastel fill override
  level?: number | null; // spot height in metres, e.g. -0.45
  wallHeight?: number;   // walls only
  treads?: number;       // steps only
  locked?: boolean;
}

export interface Design {
  id: string;
  name: string;
  widthM: number;
  heightM: number;
  gridSizeM: number;
  snapStepM?: number;    // snap precision, independent of the visual grid (default 0.1)
  boundary: number[];    // polygon, flat coords; defaults to the plot rectangle
  northDeg: number;      // north arrow rotation
  objects: GardenObject[];
  updatedAt: number;
  createdAt: number;
}

export type Tool =
  | 'select'
  | 'rect'      // draw custom area
  | 'polygon'   // draw custom polygon area
  | 'line'      // draw current line type (fence/wall/path/hedge/edging)
  | 'measure'
  | 'boundary'; // edit boundary vertices

export type LineType = 'fence' | 'wall' | 'path' | 'hedge' | 'edging';

export const PASTELS = [
  { name: 'Sage', v: '#c8d8b9' },
  { name: 'Mint', v: '#bfe3d0' },
  { name: 'Sky', v: '#bcd9ea' },
  { name: 'Lilac', v: '#d5c6e0' },
  { name: 'Blush', v: '#f2c6c2' },
  { name: 'Peach', v: '#f7d5b5' },
  { name: 'Butter', v: '#f5e5ab' },
  { name: 'Sand', v: '#e5d5bc' },
  { name: 'Rose', v: '#e8b8c8' },
  { name: 'Stone', v: '#d3d3cb' },
  { name: 'Terracotta', v: '#e4b39b' },
  { name: 'Fern', v: '#a9c9a4' },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newDesign(name: string, widthM: number, heightM: number): Design {
  return {
    id: uid(),
    name,
    widthM,
    heightM,
    gridSizeM: 0.5,
    snapStepM: 0.1,
    boundary: [0, 0, widthM, 0, widthM, heightM, 0, heightM],
    northDeg: 0,
    objects: [],
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
}

// ---- geometry helpers ----
export function polygonArea(pts: number[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const j = (i + 2) % pts.length;
    a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
  }
  return Math.abs(a / 2);
}

export function polylineLength(pts: number[]): number {
  let l = 0;
  for (let i = 2; i < pts.length; i += 2) {
    l += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  }
  return l;
}

export function objectArea(o: GardenObject): number {
  if (o.kind === 'rect' || o.kind === 'steps') return o.w * o.h;
  if (o.kind === 'circle') return Math.PI * (o.w / 2) ** 2;
  if (o.kind === 'ellipse') return Math.PI * (o.w / 2) * (o.h / 2);
  if (o.kind === 'polygon' && o.points) return polygonArea(o.points);
  return 0;
}

export const fmtM = (v: number) => `${(Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '')}m`;
export const fmtM2 = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}m²`;
