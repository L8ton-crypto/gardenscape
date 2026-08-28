import { Group, Line, Text } from 'react-konva';
import type { Design, GardenObject } from '../model/types';
import { fmtM, fmtM2, objectArea, polylineLength } from '../model/types';
import { LIB_MAP } from '../model/library';

const DIM = '#b3541e';

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
    const off = 0.45, tOff = 0.72;
    edges.push(
      <Group key={`e${i}`}>
        <Line points={[x1 + nx * off, y1 + ny * off, x2 + nx * off, y2 + ny * off]}
          stroke={DIM} strokeWidth={0.025} />
        <Line points={[x1 + nx * 0.15, y1 + ny * 0.15, x1 + nx * (off + 0.12), y1 + ny * (off + 0.12)]} stroke={DIM} strokeWidth={0.02} />
        <Line points={[x2 + nx * 0.15, y2 + ny * 0.15, x2 + nx * (off + 0.12), y2 + ny * (off + 0.12)]} stroke={DIM} strokeWidth={0.02} />
        <Text x={(x1 + x2) / 2 + nx * tOff - 1} y={(y1 + y2) / 2 + ny * tOff - 0.16}
          width={2} align="center" text={fmtM(len)} fontSize={0.3} fontStyle="bold" fill={DIM} />
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
    return (
      <Text x={mx - 1.5} y={my - 0.5} width={3} align="center"
        text={fmtM(polylineLength(pts)) + (o.type === 'wall' && o.wallHeight ? ` · H ${fmtM(o.wallHeight)}` : '')}
        fontSize={0.28} fontStyle="bold" fill={DIM} />
    );
  }
  if (o.kind === 'polygon') {
    const pts = o.points ?? [];
    if (pts.length < 6) return null;
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cy += pts[i + 1]; }
    cx /= pts.length / 2; cy /= pts.length / 2;
    return <Text x={cx - 1.5} y={cy + 0.2} width={3} align="center" text={fmtM2(objectArea(o))} fontSize={0.28} fontStyle="bold" fill={DIM} />;
  }
  if (o.kind === 'symbol') return null;
  const lib = LIB_MAP[o.type];
  const txt = o.kind === 'circle'
    ? `⌀ ${fmtM(o.w)}`
    : `${fmtM(o.w)} × ${fmtM(o.h)}${lib?.countArea ? ` · ${fmtM2(objectArea(o))}` : ''}`;
  return (
    <Group x={o.x} y={o.y} rotation={o.rotation}>
      <Text x={-2} y={(o.kind === 'circle' ? o.w : o.h) / 2 + 0.08} width={4} align="center"
        text={txt} fontSize={0.28} fontStyle="bold" fill={DIM} />
    </Group>
  );
}
