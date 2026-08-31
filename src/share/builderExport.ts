import Konva from 'konva';
import type { Design, GardenObject } from '../model/types';
import { objectArea, polylineLength, fmtM2, fmtM } from '../model/types';
import { LIB_MAP, LINE_STYLES } from '../model/library';

// Renders a clean annotated technical plan to a PNG data URL (offscreen Konva stage).
export function renderBuilderPlan(design: Design): string {
  const S = 60; // px per metre
  const M = 100; // margin px
  const TABLE_W = 340;
  const W = design.widthM * S + M * 2 + TABLE_W;
  const H = Math.max(design.heightM * S + M * 2, 500);

  const holder = document.createElement('div');
  const stage = new Konva.Stage({ container: holder, width: W, height: H });
  const layer = new Konva.Layer();
  stage.add(layer);

  layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: '#ffffff' }));

  const ox = M, oy = M;
  const px = (m: number) => m * S;

  // faint grid (1m)
  for (let x = 0; x <= design.widthM; x++)
    layer.add(new Konva.Line({ points: [ox + px(x), oy, ox + px(x), oy + px(design.heightM)], stroke: '#eeeeee', strokeWidth: 1 }));
  for (let y = 0; y <= design.heightM; y++)
    layer.add(new Konva.Line({ points: [ox, oy + px(y), ox + px(design.widthM), oy + px(y)], stroke: '#eeeeee', strokeWidth: 1 }));

  // boundary
  const b = design.boundary.map((v, i) => (i % 2 === 0 ? ox + px(v) : oy + px(v)));
  layer.add(new Konva.Line({ points: b, closed: true, stroke: '#222', strokeWidth: 2.5 }));

  // boundary edge dimensions
  for (let i = 0; i < design.boundary.length; i += 2) {
    const j = (i + 2) % design.boundary.length;
    const x1 = design.boundary[i], y1 = design.boundary[i + 1];
    const x2 = design.boundary[j], y2 = design.boundary[j + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.3) continue;
    const mx = ox + px((x1 + x2) / 2), my = oy + px((y1 + y2) / 2);
    // outward normal
    let nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    const cx = design.widthM / 2, cy = design.heightM / 2;
    if (nx * ((x1 + x2) / 2 - cx) + ny * ((y1 + y2) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    const off = 28;
    layer.add(new Konva.Line({
      points: [ox + px(x1) + nx * off, oy + px(y1) + ny * off, ox + px(x2) + nx * off, oy + px(y2) + ny * off],
      stroke: '#c2410c', strokeWidth: 1,
    }));
    const t = new Konva.Text({
      x: mx + nx * (off + 14) - 40, y: my + ny * (off + 14) - 7, width: 80, align: 'center',
      text: fmtM(len), fontSize: 13, fontStyle: 'bold', fill: '#c2410c',
    });
    layer.add(t);
  }

  // objects
  const scheduled: { label: string; detail: string }[] = [];
  const sorted = [...design.objects].sort((a, b) => objectArea(b) - objectArea(a));
  let noteN = 0;
  for (const o of sorted) {
    if (o.kind === 'note') {
      if (!o.label) continue;
      noteN += 1;
      layer.add(new Konva.Circle({ x: ox + px(o.x), y: oy + px(o.y), radius: 11, fill: '#fbf3c4', stroke: '#9c7c25', strokeWidth: 1.5 }));
      layer.add(new Konva.Text({ x: ox + px(o.x) - 10, y: oy + px(o.y) - 6, width: 20, align: 'center', text: String(noteN), fontSize: 12, fontStyle: 'bold', fill: '#5a4f23' }));
      scheduled.push({ label: `Note ${noteN}`, detail: o.label });
      continue;
    }
    drawObject(layer, o, ox, oy, S);
    const lib = LIB_MAP[o.type];
    const label = o.label || lib?.name || LINE_STYLES[o.type]?.name || 'Item';
    if (o.kind === 'line') {
      const len = polylineLength(o.points ?? []);
      const extra = o.type === 'wall' && o.wallHeight ? ` · H ${fmtM(o.wallHeight)}` : '';
      scheduled.push({ label, detail: `${fmtM(len)} run${extra}` });
    } else if (o.kind !== 'symbol') {
      const area = objectArea(o);
      if (area >= 0.3) scheduled.push({ label, detail: `${fmtM(o.w)} × ${fmtM(o.h)} · ${fmtM2(area)}${o.level != null ? ` · level ${o.level >= 0 ? '+' : ''}${o.level.toFixed(2)}m` : ''}` });
    } else {
      scheduled.push({ label, detail: 'utility point' });
    }
  }

  // title block
  layer.add(new Konva.Text({ x: ox, y: 22, text: design.name.toUpperCase(), fontSize: 24, fontStyle: 'bold', fill: '#1a1a1a', fontFamily: 'Georgia, serif' }));
  layer.add(new Konva.Text({
    x: ox, y: 52,
    text: `Garden plan · plot ${fmtM(design.widthM)} × ${fmtM(design.heightM)} · scale 1m grid · ${new Date().toLocaleDateString('en-GB')} · made with Gardenscape`,
    fontSize: 12, fill: '#666',
  }));

  // scale bar
  const sbY = oy + px(design.heightM) + 40;
  layer.add(new Konva.Rect({ x: ox, y: sbY, width: S, height: 8, fill: '#222' }));
  layer.add(new Konva.Rect({ x: ox + S, y: sbY, width: S, height: 8, fill: '#fff', stroke: '#222', strokeWidth: 1 }));
  layer.add(new Konva.Text({ x: ox - 4, y: sbY + 12, text: '0', fontSize: 11, fill: '#444' }));
  layer.add(new Konva.Text({ x: ox + S - 4, y: sbY + 12, text: '1', fontSize: 11, fill: '#444' }));
  layer.add(new Konva.Text({ x: ox + S * 2 - 8, y: sbY + 12, text: '2m', fontSize: 11, fill: '#444' }));

  // north arrow
  const nax = ox + px(design.widthM) + 40, nay = oy + 10;
  const na = new Konva.Group({ x: nax, y: nay, rotation: design.northDeg });
  na.add(new Konva.Line({ points: [0, 16, 0, -16], stroke: '#222', strokeWidth: 2 }));
  na.add(new Konva.Line({ points: [-7, -6, 0, -16, 7, -6], closed: true, fill: '#222' }));
  layer.add(na);
  layer.add(new Konva.Text({ x: nax - 6, y: nay + 22, text: 'N', fontSize: 14, fontStyle: 'bold', fill: '#222' }));

  // areas schedule
  const tx = ox + px(design.widthM) + 80;
  let ty = oy + 60;
  layer.add(new Konva.Text({ x: tx, y: ty, text: 'SCHEDULE', fontSize: 15, fontStyle: 'bold', fill: '#1a1a1a', fontFamily: 'Georgia, serif' }));
  ty += 26;
  for (const row of scheduled.slice(0, Math.floor((H - ty - 40) / 34))) {
    layer.add(new Konva.Text({ x: tx, y: ty, width: TABLE_W - 60, text: row.label, fontSize: 12, fontStyle: 'bold', fill: '#333', ellipsis: true, wrap: 'none' }));
    layer.add(new Konva.Text({ x: tx, y: ty + 14, width: TABLE_W - 60, text: row.detail, fontSize: 11, fill: '#777' }));
    layer.add(new Konva.Line({ points: [tx, ty + 30, tx + TABLE_W - 60, ty + 30], stroke: '#e5e5e5', strokeWidth: 1 }));
    ty += 34;
  }

  layer.draw();
  const url = stage.toDataURL({ pixelRatio: 2 });
  stage.destroy();
  return url;
}

function drawObject(layer: Konva.Layer, o: GardenObject, ox: number, oy: number, S: number) {
  const lib = LIB_MAP[o.type];
  const px = (m: number) => m * S;
  if (o.kind === 'line') {
    const style = LINE_STYLES[o.type];
    const pts = (o.points ?? []).map((v, i) => (i % 2 === 0 ? ox + px(v) : oy + px(v)));
    layer.add(new Konva.Line({
      points: pts, stroke: '#555', strokeWidth: Math.max(1.5, (style?.width ?? 0.1) * S * 0.6),
      dash: style?.dash?.map(d => d * S), lineCap: 'round', lineJoin: 'round',
      opacity: o.type === 'path' || o.type === 'hedge' ? 0.35 : 1,
    }));
    return;
  }
  if (o.kind === 'polygon') {
    const pts = (o.points ?? []).map((v, i) => (i % 2 === 0 ? ox + px(v) : oy + px(v)));
    layer.add(new Konva.Line({ points: pts, closed: true, fill: '#f2f2f2', stroke: '#555', strokeWidth: 1.5 }));
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cy += pts[i + 1]; }
    cx /= pts.length / 2; cy /= pts.length / 2;
    layer.add(new Konva.Text({ x: cx - 80, y: cy - 7, width: 160, align: 'center', text: `${o.label ?? 'Area'} · ${fmtM2(objectArea(o))}`, fontSize: 12, fontStyle: 'bold', fill: '#333' }));
    return;
  }
  const g = new Konva.Group({ x: ox + px(o.x), y: oy + px(o.y), rotation: o.rotation });
  if (o.kind === 'circle' || o.kind === 'symbol') {
    g.add(new Konva.Circle({ radius: px(o.w / 2), fill: o.kind === 'symbol' ? '#fff' : '#f5f5f5', stroke: '#555', strokeWidth: 1.5 }));
  } else if (o.kind === 'ellipse') {
    g.add(new Konva.Ellipse({ radiusX: px(o.w / 2), radiusY: px(o.h / 2), fill: '#f5f5f5', stroke: '#555', strokeWidth: 1.5 }));
  } else {
    g.add(new Konva.Rect({ x: -px(o.w / 2), y: -px(o.h / 2), width: px(o.w), height: px(o.h), fill: lib?.hatch ? '#e8e8e8' : '#f5f5f5', stroke: lib?.hatch ? '#222' : '#555', strokeWidth: lib?.hatch ? 2 : 1.5 }));
    if (lib?.hatch) {
      for (let d = -o.h; d < o.w; d += 0.4) {
        g.add(new Konva.Line({
          points: [
            px(Math.max(-o.w / 2, -o.w / 2 + d)), px(-o.h / 2 + Math.max(0, -d)),
            px(Math.min(o.w / 2, -o.w / 2 + d + o.h)), px(o.h / 2 - Math.max(0, d + o.h - o.w)),
          ], stroke: '#999', strokeWidth: 1,
        }));
      }
    }
  }
  const name = o.label || lib?.name || '';
  const big = Math.max(o.w, o.h) >= 1.2;
  if (name && big) {
    g.add(new Konva.Text({ x: -px(o.w / 2) - 60, y: -8, width: px(o.w) + 120, align: 'center', text: `${name}`, fontSize: 12, fontStyle: 'bold', fill: '#222' }));
    if (o.kind !== 'symbol') g.add(new Konva.Text({ x: -px(o.w / 2) - 60, y: 7, width: px(o.w) + 120, align: 'center', text: `${fmtM(o.w)} × ${fmtM(o.h)}`, fontSize: 11, fill: '#666' }));
  }
  layer.add(g);
}
