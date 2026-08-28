import { Group, Line, Rect, Text } from 'react-konva';
import type { Design, GardenObject } from '../model/types';
import { fmtM, fmtM2, objectArea, polylineLength } from '../model/types';
import { LIB_MAP } from '../model/library';

const DIM = '#b3541e';

// A measurement chip: text on a soft cream pill so it stays legible over
// boundary lines, hatching and object strokes.
function DimLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 0.155 + 0.24;
  const h = 0.42;
  return (
    <Group x={x} y={y} listening={false}>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} cornerRadius={0.1}
        fill="rgba(255,254,248,0.95)" stroke={DIM} strokeWidth={0.015}
        shadowColor="#00000022" shadowBlur={0.06} shadowOffsetY={0.02} />
      <Text x={-w / 2} y={-0.135} width={w} align="center" text={text}
        fontSize={0.27} fontStyle="bold" fill={DIM} />
    </Group>
  );
}

// Schematic-style dimension annotations for everything in the plan.
export function DimsOverlay({ design }: { design: Design }) {
  const { boundary, widthM, heightM } = design;
  const edges = [];
  const cx0 = widthM / 2, cy0 = heightM / 2;
  for (let i = 0; i < boundary.length; i += 2) {
    const j = (i + 2) % boundary.length;
    const x1 = boundary[i], y1 = boundary[i + 1];
    const x2 = boundary[j], y2 = boundary[j + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.3) continue;
    let nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    if (nx * ((x1 + x2) / 2 - cx0) + ny * ((y1 + y2) / 2 - cy0) < 0) { nx = -nx; ny = -ny; }
    const off = 0.45, tOff = 0.85;
    edges.push(
      <Group key={`e${i}`} listening={false}>
        <Line points={[x1 + nx * off, y1 + ny * off, x2 + nx * off, y2 + ny * off]}
          stroke={DIM} strokeWidth={0.025} />
        <Line points={[x1 + nx * 0.15, y1 + ny * 0.15, x1 + nx * (off + 0.12), y1 + ny * (off + 0.12)]} stroke={DIM} strokeWidth={0.02} />
        <Line points={[x2 + nx * 0.15, y2 + ny * 0.15, x2 + nx * (off + 0.12), y2 + ny * (off + 0.12)]} stroke={DIM} strokeWidth={0.02} />
        <DimLabel x={(x1 + x2) / 2 + nx * tOff} y={(y1 + y2) / 2 + ny * tOff} text={fmtM(len)} />
      </Group>,
    );
  }

  return (
    <Group listening={false}>
      {edges}
      {design.objects.map(o => <ObjDim key={o.id} o={o} />)}
    </Group>
  );
}

function ObjDim({ o }: { o: GardenObject }) {
  if (o.kind === 'line') {
    const pts = o.points ?? [];
    if (pts.length < 4) return null;
    const mid = Math.floor(pts.length / 4) * 2;
    const mx = (pts[mid] + pts[Math.min(mid + 2, pts.length - 2)]) / 2;
    const my = (pts[mid + 1] + pts[Math.min(mid + 3, pts.length - 1)]) / 2;
    const text = fmtM(polylineLength(pts)) + (o.type === 'wall' && o.wallHeight ? ` · H ${fmtM(o.wallHeight)}` : '');
    return <DimLabel x={mx} y={my - 0.38} text={text} />;
  }
  if (o.kind === 'polygon') {
    const pts = o.points ?? [];
    if (pts.length < 6) return null;
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cy += pts[i + 1]; }
    cx /= pts.length / 2; cy /= pts.length / 2;
    return <DimLabel x={cx} y={cy + 0.35} text={fmtM2(objectArea(o))} />;
  }
  if (o.kind === 'symbol') return null;
  const lib = LIB_MAP[o.type];
  const txt = o.kind === 'circle'
    ? `⌀ ${fmtM(o.w)}`
    : `${fmtM(o.w)} × ${fmtM(o.h)}${lib?.countArea ? ` · ${fmtM2(objectArea(o))}` : ''}`;
  const half = (o.kind === 'circle' ? o.w : o.h) / 2;
  // centre the chip inside large areas; small items get it just below instead
  const inside = o.w >= 1.6 && half * 2 >= 1.2 && o.kind !== 'circle';
  return (
    <Group x={o.x} y={o.y} rotation={o.rotation} listening={false}>
      <DimLabel x={0} y={inside ? half - 0.4 : half + 0.32} text={txt} />
    </Group>
  );
}
