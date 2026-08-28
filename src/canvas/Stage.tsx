import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Circle, Text, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import { useStore } from '../state/store';
import { GridLayer } from './GridLayer';
import { DimsOverlay } from './DimsOverlay';
import { ObjectNode } from './ObjectNode';
import { LIB_MAP } from '../model/library';
import { fmtM } from '../model/types';
import type { GardenObject } from '../model/types';

Konva.hitOnDragEnabled = true;

export function CanvasStage({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const design = useStore(s => s.design)!;
  const viewOnly = useStore(s => s.viewOnly);
  const tool = useStore(s => s.tool);
  const lineType = useStore(s => s.lineType);
  const selectedId = useStore(s => s.selectedId);
  const showLayers = useStore(s => s.showLayers);
  const showDims = useStore(s => s.showDims);
  const draftPoints = useStore(s => s.draftPoints);
  const measure = useStore(s => s.measure);
  const { select, setTool, setDraftPoints, setMeasure, addObject, updateObject, commit, snapVal } = useStore.getState();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeMap = useRef<Map<string, Konva.Node>>(new Map());
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState({ x: 60, y: 60, scale: 40 }); // px per metre
  const lastDist = useRef(0);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // resize observer + fit on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const fitView = useCallback(() => {
    const pad = 80;
    const scale = Math.min((size.w - pad) / (design.widthM + 2.4), (size.h - pad) / (design.heightM + 2.4));
    setView({
      scale,
      x: (size.w - design.widthM * scale) / 2,
      y: (size.h - design.heightM * scale) / 2,
    });
  }, [size, design.widthM, design.heightM]);

  useEffect(() => { fitView(); }, [design.id, size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  // expose fit + zoom to toolbar via custom events
  useEffect(() => {
    const onFit = () => fitView();
    const onZoom = (e: Event) => {
      const f = (e as CustomEvent).detail as number;
      setView(v => ({ ...v, scale: Math.min(300, Math.max(5, v.scale * f)) }));
    };
    window.addEventListener('gs:fit', onFit);
    window.addEventListener('gs:zoom', onZoom);
    return () => { window.removeEventListener('gs:fit', onFit); window.removeEventListener('gs:zoom', onZoom); };
  }, [fitView]);

  // Konva's hit canvas can go stale when the stage transform changes without a
  // node mutation — redraw it (debounced) after pan/zoom so taps keep landing.
  useEffect(() => {
    const t = setTimeout(() => {
      stageRef.current?.getLayers().forEach(l => l.drawHit());
    }, 120);
    return () => clearTimeout(t);
  }, [view]);

  // transformer attach
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? nodeMap.current.get(selectedId) : null;
    const o = design.objects.find(o => o.id === selectedId);
    if (node && o && !viewOnly && o.kind !== 'line' && o.kind !== 'polygon' && o.kind !== 'symbol') {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, design, viewOnly]);

  const toWorld = (p: { x: number; y: number }) => ({ x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale });
  const pointerWorld = () => {
    const p = stageRef.current?.getPointerPosition();
    return p ? toWorld(p) : null;
  };

  // ---- wheel zoom ----
  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const old = view.scale;
    const factor = e.evt.deltaY > 0 ? 0.92 : 1.08;
    const scale = Math.min(300, Math.max(5, old * factor));
    const p = stageRef.current!.getPointerPosition()!;
    setView({
      scale,
      x: p.x - ((p.x - view.x) / old) * scale,
      y: p.y - ((p.y - view.y) / old) * scale,
    });
  };

  // ---- touch pinch ----
  const onTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches;
    if (t.length !== 2) return;
    e.evt.preventDefault();
    const p1 = { x: t[0].clientX, y: t[0].clientY };
    const p2 = { x: t[1].clientX, y: t[1].clientY };
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (lastDist.current && lastCenter.current) {
      const factor = dist / lastDist.current;
      const scale = Math.min(300, Math.max(5, view.scale * factor));
      setView(v => ({
        scale,
        x: center.x - ((center.x - v.x) / v.scale) * scale + (center.x - lastCenter.current!.x),
        y: center.y - ((center.y - v.y) / v.scale) * scale + (center.y - lastCenter.current!.y),
      }));
    }
    lastDist.current = dist;
    lastCenter.current = center;
  };
  const onTouchEnd = () => { lastDist.current = 0; lastCenter.current = null; };

  // ---- drawing handlers ----
  const onStagePointerDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedEmpty = e.target === e.target.getStage() || e.target.name() === 'paper';
    const w = pointerWorld();
    if (!w) return;
    const wx = snapVal(w.x), wy = snapVal(w.y);

    if (tool === 'select') {
      if (clickedEmpty) select(null);
      return;
    }
    if (viewOnly) return;

    if (tool === 'rect') {
      drawStart.current = { x: wx, y: wy };
      setDraftRect({ x: wx, y: wy, w: 0, h: 0 });
    } else if (tool === 'polygon' || tool === 'line') {
      // read fresh state — stale closures here dropped every point but the last
      const cur = useStore.getState().draftPoints;
      setDraftPoints([...cur, wx, wy]);
    } else if (tool === 'measure') {
      const m = useStore.getState().measure;
      if (!m || m.length === 4) setMeasure([w.x, w.y, w.x, w.y]);
      else setMeasure([m[0], m[1], w.x, w.y]);
    }
  };

  const onStagePointerMove = () => {
    const w = pointerWorld();
    if (!w) return;
    if (tool === 'rect' && drawStart.current) {
      const wx = snapVal(w.x), wy = snapVal(w.y);
      const s = drawStart.current;
      setDraftRect({ x: Math.min(s.x, wx), y: Math.min(s.y, wy), w: Math.abs(wx - s.x), h: Math.abs(wy - s.y) });
    }
    if (tool === 'measure' && measure && measure.length === 4) {
      setMeasure([measure[0], measure[1], w.x, w.y]);
    }
  };

  const onStagePointerUp = () => {
    if (tool === 'rect' && drawStart.current && draftRect) {
      drawStart.current = null;
      if (draftRect.w > 0.2 && draftRect.h > 0.2) {
        const id = addObject({
          type: 'custom-area', kind: 'rect',
          x: draftRect.x + draftRect.w / 2, y: draftRect.y + draftRect.h / 2,
          w: draftRect.w, h: draftRect.h, rotation: 0,
          label: 'Area', color: '#c8d8b9',
        });
        select(id); setTool('select');
      }
      setDraftRect(null);
    }
  };

  const finishDraft = () => {
    // drop consecutive duplicate points (double-click/tap to finish adds repeats)
    const raw = useStore.getState().draftPoints;
    const pts: number[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const n = pts.length;
      if (n === 0 || Math.hypot(raw[i] - pts[n - 2], raw[i + 1] - pts[n - 1]) > 0.05) pts.push(raw[i], raw[i + 1]);
    }
    if (tool === 'polygon' && pts.length >= 6) {
      const id = addObject({ type: 'custom-poly', kind: 'polygon', x: 0, y: 0, w: 0, h: 0, rotation: 0, points: pts, label: 'Area', color: '#bfe3d0' });
      select(id);
    }
    if (tool === 'line' && pts.length >= 4) {
      const id = addObject({ type: lineType, kind: 'line', x: 0, y: 0, w: 0, h: 0, rotation: 0, points: pts, wallHeight: lineType === 'wall' ? 1.0 : undefined });
      select(id);
    }
    setDraftPoints([]);
    setTool('select');
  };

  // dbl-click / dbl-tap finishes polygon or line
  const onDblClick = () => { if ((tool === 'polygon' || tool === 'line') && useStore.getState().draftPoints.length) finishDraft(); };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      const st = useStore.getState();
      if (e.key === 'Enter' && (tool === 'polygon' || tool === 'line')) { finishDraft(); return; }
      if (e.key === 'Escape') { setDraftPoints([]); setTool('select'); select(null); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); st.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); st.redo(); return; }
      if (!st.selectedId || st.viewOnly) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); st.duplicateObject(st.selectedId); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { st.removeObject(st.selectedId); return; }
      const g = st.design?.snapStepM ?? 0.1;
      const o = st.design?.objects.find(o => o.id === st.selectedId);
      if (!o) return;
      const mv = (dx: number, dy: number) => {
        e.preventDefault();
        if (o.points) st.updateObject(o.id, { points: o.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) });
        else st.updateObject(o.id, { x: o.x + dx, y: o.y + dy });
      };
      if (e.key === 'ArrowLeft') mv(-g, 0);
      if (e.key === 'ArrowRight') mv(g, 0);
      if (e.key === 'ArrowUp') mv(0, -g);
      if (e.key === 'ArrowDown') mv(0, g);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool, draftPoints, lineType]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = (o: GardenObject) => {
    const cat = LIB_MAP[o.type]?.category;
    if (o.kind === 'line') return showLayers.hard;
    if (cat === 'utilities') return showLayers.utilities;
    if (cat === 'planting') return showLayers.planting;
    if (cat === 'surfaces' || cat === 'structures') return showLayers.hard;
    return true;
  };

  const handleDragEnd = (o: GardenObject, x: number, y: number) => {
    if (o.kind === 'line' || o.kind === 'polygon') {
      // x,y is the group offset — bake into points
      const dx = snapVal(x) , dy = snapVal(y);
      updateObject(o.id, { points: (o.points ?? []).map((v, i) => v + (i % 2 === 0 ? dx : dy)) });
      const node = nodeMap.current.get(o.id);
      node?.position({ x: 0, y: 0 });
    } else {
      updateObject(o.id, { x: snapVal(x), y: snapVal(y) });
    }
  };

  const onTransformEnd = () => {
    const node = selectedId ? nodeMap.current.get(selectedId) : null;
    const o = design.objects.find(o => o.id === selectedId);
    if (!node || !o) return;
    const sx = node.scaleX(), sy = node.scaleY();
    node.scale({ x: 1, y: 1 });
    updateObject(o.id, {
      x: snapVal(node.x()), y: snapVal(node.y()),
      w: Math.max(0.1, snapVal(o.w * sx) || o.w * sx),
      h: Math.max(0.1, snapVal(o.h * sy) || o.h * sy),
      rotation: Math.round(node.rotation()),
    });
  };

  // boundary edit handles
  const boundaryHandles = tool === 'boundary' && !viewOnly ? (
    <>
      {Array.from({ length: design.boundary.length / 2 }, (_, i) => (
        <Circle key={i} x={design.boundary[i * 2]} y={design.boundary[i * 2 + 1]} radius={0.22}
          fill="#fff" stroke="#1f6feb" strokeWidth={0.06} draggable
          onDragEnd={e => {
            const nx = snapVal(e.target.x()), ny = snapVal(e.target.y());
            commit(d => { d.boundary[i * 2] = nx; d.boundary[i * 2 + 1] = ny; });
            e.target.position({ x: nx, y: ny });
          }}
          onDblClick={() => {
            if (design.boundary.length > 6) commit(d => { d.boundary.splice(i * 2, 2); });
          }}
          onDblTap={() => {
            if (design.boundary.length > 6) commit(d => { d.boundary.splice(i * 2, 2); });
          }}
        />
      ))}
      {/* midpoints to add vertices */}
      {Array.from({ length: design.boundary.length / 2 }, (_, i) => {
        const j = (i + 1) % (design.boundary.length / 2);
        const mx = (design.boundary[i * 2] + design.boundary[j * 2]) / 2;
        const my = (design.boundary[i * 2 + 1] + design.boundary[j * 2 + 1]) / 2;
        return <Circle key={`m${i}`} x={mx} y={my} radius={0.14} fill="#1f6feb" opacity={0.5}
          onClick={() => commit(d => { d.boundary.splice(j * 2 === 0 ? d.boundary.length : j * 2, 0, mx, my); })}
          onTap={() => commit(d => { d.boundary.splice(j * 2 === 0 ? d.boundary.length : j * 2, 0, mx, my); })}
        />;
      })}
    </>
  ) : null;

  const measureLen = measure ? Math.hypot(measure[2] - measure[0], measure[3] - measure[1]) : 0;

  return (
    <Stage
      ref={stageRef}
      width={size.w} height={size.h}
      x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale}
      draggable={tool === 'select'}
      onDragEnd={e => {
        if (e.target === stageRef.current) setView(v => ({ ...v, x: e.target.x(), y: e.target.y() }));
      }}
      onWheel={onWheel}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onStagePointerDown} onTouchStart={onStagePointerDown}
      onMouseMove={onStagePointerMove}
      onMouseUp={onStagePointerUp}
      onDblClick={onDblClick} onDblTap={onDblClick}
    >
      <Layer>
        <GridLayer design={design} />
        {design.objects.filter(visible).map(o => (
          <ObjectNode key={o.id} o={o}
            selected={o.id === selectedId}
            viewOnly={viewOnly}
            onSelect={() => tool === 'select' && select(o.id)}
            onDragEnd={(x, y) => handleDragEnd(o, x, y)}
            nodeRef={n => { if (n) nodeMap.current.set(o.id, n); else nodeMap.current.delete(o.id); }}
          />
        ))}
        {showDims && <DimsOverlay design={design} />}
        {/* draft rect */}
        {draftRect && <Rect x={draftRect.x} y={draftRect.y} width={draftRect.w} height={draftRect.h}
          fill="rgba(31,111,235,0.12)" stroke="#1f6feb" strokeWidth={0.04} dash={[0.2, 0.1]} listening={false} />}
        {draftRect && draftRect.w > 0.1 && (
          <Text x={draftRect.x} y={draftRect.y - 0.45} text={`${fmtM(draftRect.w)} × ${fmtM(draftRect.h)}`} fontSize={0.32} fill="#1f6feb" listening={false} />
        )}
        {/* draft polygon / line */}
        {draftPoints.length >= 2 && (
          <Group listening={false}>
            <Line points={draftPoints} stroke="#1f6feb" strokeWidth={0.06} dash={[0.2, 0.1]}
              closed={tool === 'polygon' && draftPoints.length >= 6} fill={tool === 'polygon' ? 'rgba(31,111,235,0.1)' : undefined} />
            {Array.from({ length: draftPoints.length / 2 }, (_, i) => (
              <Circle key={i} x={draftPoints[i * 2]} y={draftPoints[i * 2 + 1]} radius={0.12} fill="#1f6feb" />
            ))}
          </Group>
        )}
        {/* measure */}
        {measure && (
          <Group listening={false}>
            <Line points={measure} stroke="#c2410c" strokeWidth={0.05} dash={[0.25, 0.12]} />
            <Circle x={measure[0]} y={measure[1]} radius={0.1} fill="#c2410c" />
            <Circle x={measure[2]} y={measure[3]} radius={0.1} fill="#c2410c" />
            <Text x={(measure[0] + measure[2]) / 2 + 0.15} y={(measure[1] + measure[3]) / 2 - 0.4}
              text={fmtM(measureLen)} fontSize={0.36} fontStyle="bold" fill="#c2410c" />
          </Group>
        )}
        {boundaryHandles}
        <Transformer ref={trRef} rotateEnabled keepRatio={false}
          anchorSize={14} anchorCornerRadius={7} borderStroke="#1f6feb" anchorStroke="#1f6feb"
          rotateAnchorOffset={30} onTransformEnd={onTransformEnd}
          boundBoxFunc={(_, nb) => nb} />
      </Layer>
    </Stage>
  );
}
