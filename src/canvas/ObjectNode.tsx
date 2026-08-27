import { Group, Rect, Circle, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { GardenObject } from '../model/types';
import { fmtM } from '../model/types';
import { LIB_MAP, LINE_STYLES } from '../model/library';

// Renders one garden object in world-metre coordinates.
export function ObjectNode({ o, selected, viewOnly, onSelect, onDragEnd, nodeRef }: {
  o: GardenObject;
  selected: boolean;
  viewOnly: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  nodeRef?: (n: Konva.Node | null) => void;
}) {
  const lib = LIB_MAP[o.type];
  const fill = o.color ?? lib?.fill ?? '#d3d3cb';
  const stroke = lib?.stroke ?? '#777';
  const draggable = !viewOnly && !o.locked;
  const common = {
    onClick: onSelect, onTap: onSelect,
    draggable,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e.target.x(), e.target.y()),
  };

  const labelText = o.label ?? lib?.name ?? '';
  const showLabel = !!labelText && (o.kind === 'rect' || o.kind === 'polygon' || o.kind === 'circle') && Math.max(o.w, o.h) >= 0.8;
  const levelText = o.level != null ? `${o.level >= 0 ? '+' : ''}${o.level.toFixed(2)}` : null;

  if (o.kind === 'line' || o.kind === 'polygon') {
    const pts = o.points ?? [];
    const style = o.kind === 'line' ? LINE_STYLES[o.type] : null;
    // centroid for label
    let cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cy += pts[i + 1]; }
    cx /= pts.length / 2 || 1; cy /= pts.length / 2 || 1;
    return (
      <Group ref={nodeRef as never} {...common} onDragEnd={e => {
        // bake group offset into points
        onDragEnd(e.target.x(), e.target.y());
      }}>
        {o.kind === 'polygon' ? (
          <Line points={pts} closed fill={fill} stroke={selected ? '#1f6feb' : stroke} strokeWidth={selected ? 0.08 : 0.04} opacity={0.92} />
        ) : style?.double ? (
          <>
            <Line points={pts} stroke={stroke} strokeWidth={style.width} lineCap="butt" />
            <Line points={pts} stroke="#efece4" strokeWidth={style.width - 0.08} lineCap="butt" />
            <Line points={pts} stroke={selected ? '#1f6feb' : 'transparent'} strokeWidth={style.width + 0.06} opacity={0.4} />
          </>
        ) : (
          <Line points={pts} stroke={selected ? '#1f6feb' : (style?.stroke ?? stroke)} strokeWidth={style?.width ?? 0.1}
            dash={style?.dash} lineCap="round" lineJoin="round"
            opacity={o.type === 'path' ? 0.75 : o.type === 'hedge' ? 0.85 : 1} hitStrokeWidth={0.5} />
        )}
        {(o.kind === 'polygon' && showLabel) && (
          <Text x={cx - 3} y={cy - 0.16} width={6} align="center" text={labelText + (levelText ? `  ${levelText}` : '')} fontSize={0.32} fontStyle="600" fill="#3d4a33" listening={false} />
        )}
      </Group>
    );
  }

  return (
    <Group ref={nodeRef as never} x={o.x} y={o.y} rotation={o.rotation} {...common}>
      {o.kind === 'circle' || (o.kind === 'symbol') ? (
        <Circle radius={o.w / 2} fill={fill} stroke={selected ? '#1f6feb' : stroke} strokeWidth={selected ? 0.08 : 0.04} />
      ) : (
        <Rect x={-o.w / 2} y={-o.h / 2} width={o.w} height={o.h} cornerRadius={0.05}
          fill={fill} stroke={selected ? '#1f6feb' : stroke} strokeWidth={selected ? 0.08 : 0.04} />
      )}
      {lib?.hatch && <HatchLines w={o.w} h={o.h} />}
      {o.kind === 'steps' && <Treads w={o.w} h={o.h} n={o.treads ?? 4} />}
      {o.kind === 'symbol' && (
        <Text x={-o.w / 2} y={-0.16} width={o.w} align="center" text={lib?.emoji ?? '?'} fontSize={0.3} listening={false} />
      )}
      {showLabel && (
        <Text x={-o.w / 2 - 1} y={o.kind === 'circle' ? -0.17 : -0.17} width={o.w + 2} align="center"
          text={labelText} fontSize={Math.min(0.34, Math.max(0.22, o.w * 0.12))} fontStyle="600" fill="#3d4a33" listening={false} />
      )}
      {levelText && (
        <Text x={-o.w / 2 - 1} y={0.12} width={o.w + 2} align="center" text={levelText} fontSize={0.26} fill="#6b6152" listening={false} />
      )}
      {selected && o.kind !== 'symbol' && (
        <Text x={-o.w / 2 - 1} y={o.h / 2 + 0.12} width={o.w + 2} align="center"
          text={`${fmtM(o.w)} × ${fmtM(o.h)}`} fontSize={0.28} fill="#1f6feb" listening={false} />
      )}
    </Group>
  );
}

function HatchLines({ w, h }: { w: number; h: number }) {
  const lines = [];
  const step = 0.35;
  for (let d = -h; d < w; d += step) {
    lines.push(<Line key={d} points={[
      Math.max(-w / 2, -w / 2 + d), -h / 2 + Math.max(0, -d),
      Math.min(w / 2, -w / 2 + d + h), h / 2 - Math.max(0, d + h - w),
    ]} stroke="#8a857b" strokeWidth={0.02} listening={false} />);
  }
  return <Group clipX={-w / 2} clipY={-h / 2} clipWidth={w} clipHeight={h} listening={false}>{lines}</Group>;
}

function Treads({ w, h, n }: { w: number; h: number; n: number }) {
  const lines = [];
  for (let i = 1; i < n; i++) {
    const y = -h / 2 + (h / n) * i;
    lines.push(<Line key={i} points={[-w / 2, y, w / 2, y]} stroke="#8a8274" strokeWidth={0.025} listening={false} />);
  }
  return (
    <Group listening={false}>
      {lines}
      <Line points={[0, h / 2 - 0.1, 0, -h / 2 + 0.15]} stroke="#5c564d" strokeWidth={0.03} />
      <Line points={[-0.08, -h / 2 + 0.28, 0, -h / 2 + 0.15, 0.08, -h / 2 + 0.28]} stroke="#5c564d" strokeWidth={0.03} lineCap="round" lineJoin="round" />
    </Group>
  );
}
