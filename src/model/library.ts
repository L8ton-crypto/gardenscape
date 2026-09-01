import type { ObjectKind } from './types';

export interface LibraryItem {
  type: string;
  name: string;
  kind: ObjectKind;
  category: 'planting' | 'surfaces' | 'structures' | 'features' | 'utilities';
  w: number;             // default size (m); circle: diameter
  h: number;
  fill: string;
  stroke: string;
  emoji: string;         // palette icon
  hatch?: boolean;       // built structure hatching
  countArea?: boolean;   // include in totals strip
}

export const LIBRARY: LibraryItem[] = [
  // planting
  { type: 'tree',       name: 'Tree',        kind: 'circle', category: 'planting', w: 3,   h: 3,   fill: '#7fae6e', stroke: '#4e7d40', emoji: '🌳', countArea: false },
  { type: 'small-tree', name: 'Small tree',  kind: 'circle', category: 'planting', w: 1.8, h: 1.8, fill: '#96bd7d', stroke: '#5c8a48', emoji: '🌲' },
  { type: 'shrub',      name: 'Shrub',       kind: 'circle', category: 'planting', w: 1,   h: 1,   fill: '#a9c98b', stroke: '#6d9455', emoji: '🌿' },
  { type: 'flower-bed', name: 'Flower bed',  kind: 'rect',   category: 'planting', w: 2,   h: 1,   fill: '#e8b8c8', stroke: '#b97f96', emoji: '🌸', countArea: true },
  { type: 'veg-patch',  name: 'Veg patch',   kind: 'rect',   category: 'planting', w: 2.4, h: 1.2, fill: '#d9c091', stroke: '#a58e5d', emoji: '🥕', countArea: true },
  { type: 'raised-bed', name: 'Raised bed',  kind: 'rect',   category: 'planting', w: 2,   h: 0.9, fill: '#cbab7e', stroke: '#8d7047', emoji: '🪴', countArea: true },
  { type: 'lawn',       name: 'Lawn',        kind: 'rect',   category: 'planting', w: 5,   h: 4,   fill: '#b5d69a', stroke: '#82a866', emoji: '🟩', countArea: true },
  { type: 'pot',        name: 'Pot',         kind: 'circle', category: 'planting', w: 0.5, h: 0.5, fill: '#e4b39b', stroke: '#a97a5e', emoji: '🏺' },
  // surfaces
  { type: 'patio',      name: 'Patio',       kind: 'rect', category: 'surfaces', w: 3.6, h: 3,   fill: '#d8d3c8', stroke: '#a29a8a', emoji: '🧱', countArea: true },
  { type: 'decking',    name: 'Decking',     kind: 'rect', category: 'surfaces', w: 3.6, h: 3,   fill: '#cfa579', stroke: '#96714a', emoji: '🪵', countArea: true },
  { type: 'gravel',     name: 'Gravel',      kind: 'rect', category: 'surfaces', w: 3,   h: 2,   fill: '#dcd8cf', stroke: '#aba79c', emoji: '⬜', countArea: true },
  { type: 'path-area',  name: 'Path (area)', kind: 'rect', category: 'surfaces', w: 3,   h: 0.9, fill: '#e0d9c6', stroke: '#ada27f', emoji: '👣', countArea: true },
  // structures
  { type: 'house',      name: 'House wall',  kind: 'rect', category: 'structures', w: 6,   h: 2.5, fill: '#c9c2b8', stroke: '#5c564d', emoji: '🏠', hatch: true },
  { type: 'garage',     name: 'Garage',      kind: 'rect', category: 'structures', w: 3,   h: 6,   fill: '#c9c2b8', stroke: '#5c564d', emoji: '🚗', hatch: true },
  { type: 'extension',  name: 'Extension',   kind: 'rect', category: 'structures', w: 3,   h: 3,   fill: '#c9c2b8', stroke: '#5c564d', emoji: '🏗️', hatch: true },
  { type: 'outbuilding',name: 'Outbuilding', kind: 'rect', category: 'structures', w: 2.5, h: 2,   fill: '#c9c2b8', stroke: '#5c564d', emoji: '🏚️', hatch: true },
  { type: 'shed',       name: 'Shed',        kind: 'rect', category: 'structures', w: 1.8, h: 2.4, fill: '#b99a71', stroke: '#7b6244', emoji: '🛖' },
  { type: 'greenhouse', name: 'Greenhouse',  kind: 'rect', category: 'structures', w: 1.9, h: 2.5, fill: '#cfe6df', stroke: '#7fa89b', emoji: '🪟' },
  { type: 'pergola',    name: 'Pergola',     kind: 'rect', category: 'structures', w: 3,   h: 3,   fill: 'rgba(185,154,113,0.25)', stroke: '#8d7047', emoji: '⛩️' },
  { type: 'arch',       name: 'Arch',        kind: 'rect', category: 'structures', w: 1.2, h: 0.4, fill: 'rgba(140,110,80,0.4)', stroke: '#6d5638', emoji: '🌉' },
  { type: 'steps',      name: 'Steps',       kind: 'steps', category: 'structures', w: 1.2, h: 0.9, fill: '#d5cfc3', stroke: '#8a8274', emoji: '🪜' },
  // features
  { type: 'pond',       name: 'Pond',        kind: 'circle', category: 'features', w: 2,   h: 2,   fill: '#a9cfe0', stroke: '#5f93ab', emoji: '💧' },
  { type: 'water-feature', name: 'Water feature', kind: 'circle', category: 'features', w: 0.9, h: 0.9, fill: '#bcd9ea', stroke: '#5f93ab', emoji: '⛲' },
  { type: 'table',      name: 'Table & chairs', kind: 'ellipse', category: 'features', w: 1.8, h: 1.8, fill: '#e0d6c4', stroke: '#9c8f74', emoji: '🪑' },
  { type: 'table-rect', name: 'Table (square)', kind: 'rect', category: 'features', w: 1.5, h: 1.5, fill: '#e0d6c4', stroke: '#9c8f74', emoji: '🟫' },
  { type: 'bbq',        name: 'BBQ',         kind: 'rect', category: 'features', w: 0.7, h: 0.5, fill: '#9b9b9b', stroke: '#5c5c5c', emoji: '🍖' },
  { type: 'trampoline', name: 'Trampoline',  kind: 'circle', category: 'features', w: 3,   h: 3,   fill: '#9fb6c9', stroke: '#5a7386', emoji: '🤸' },
  { type: 'bench',      name: 'Bench',       kind: 'rect', category: 'features', w: 1.5, h: 0.5, fill: '#c9a877', stroke: '#8d7047', emoji: '🛋️' },
  { type: 'bin-store',  name: 'Bin store',   kind: 'rect', category: 'features', w: 1.4, h: 0.8, fill: '#b3b8ba', stroke: '#70777a', emoji: '🗑️' },
  { type: 'playhouse',  name: 'Playhouse',   kind: 'rect', category: 'features', w: 1.5, h: 1.5, fill: '#e8c9a0', stroke: '#a98a5e', emoji: '🏰' },
  // utilities (symbols)
  { type: 'tap',        name: 'Outdoor tap', kind: 'symbol', category: 'utilities', w: 0.4, h: 0.4, fill: '#4a90d9', stroke: '#2c5f96', emoji: '🚰' },
  { type: 'drain',      name: 'Drain',       kind: 'symbol', category: 'utilities', w: 0.4, h: 0.4, fill: '#7a7a7a', stroke: '#444',    emoji: '🕳️' },
  { type: 'power',      name: 'Power point', kind: 'symbol', category: 'utilities', w: 0.4, h: 0.4, fill: '#e0b64a', stroke: '#9c7c25', emoji: '⚡' },
  { type: 'light',      name: 'Light',       kind: 'symbol', category: 'utilities', w: 0.4, h: 0.4, fill: '#f5e08a', stroke: '#b09b3f', emoji: '💡' },
];

export const LIB_MAP = Object.fromEntries(LIBRARY.map(i => [i.type, i]));

export const LINE_STYLES: Record<string, { name: string; stroke: string; width: number; dash?: number[]; double?: boolean; emoji: string }> = {
  house:  { name: 'House edge', stroke: '#3a362f', width: 0.3, emoji: '🏠' },
  fence:  { name: 'Fence',  stroke: '#8d6b43', width: 0.08, dash: [0.4, 0.15], emoji: '🚧' },
  wall:   { name: 'Wall',   stroke: '#6e6a60', width: 0.22, double: true, emoji: '🧱' },
  path:   { name: 'Path',   stroke: '#c9bd9c', width: 0.9, emoji: '👣' },
  hedge:  { name: 'Hedge',  stroke: '#7fae6e', width: 0.5, emoji: '🌳' },
  edging: { name: 'Edging', stroke: '#a29a8a', width: 0.1, dash: [0.15, 0.1], emoji: '➖' },
};

export const CATEGORIES: { key: LibraryItem['category']; name: string }[] = [
  { key: 'planting',  name: 'Planting' },
  { key: 'surfaces',  name: 'Surfaces' },
  { key: 'structures', name: 'Structures' },
  { key: 'features',  name: 'Features' },
  { key: 'utilities', name: 'Utilities' },
];
