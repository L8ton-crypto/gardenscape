import { useStore } from '../state/store';
import { PASTELS, fmtM2, objectArea, polylineLength, fmtM } from '../model/types';
import { LIB_MAP, LINE_STYLES } from '../model/library';

export function PropertiesPanel() {
  const design = useStore(s => s.design);
  const selectedId = useStore(s => s.selectedId);
  const viewOnly = useStore(s => s.viewOnly);
  const { updateObject, removeObject, duplicateObject } = useStore.getState();
  const o = design?.objects.find(o => o.id === selectedId);
  if (!o || viewOnly) return null;

  const lib = LIB_MAP[o.type];
  const isLine = o.kind === 'line';
  const isPoly = o.kind === 'polygon';
  const num = (v: string) => Math.max(0.1, parseFloat(v) || 0.1);

  return (
    <div className="props">
      <div className="props-head">
        <strong>{o.label ?? lib?.name ?? LINE_STYLES[o.type]?.name ?? 'Object'}</strong>
        <div className="props-actions">
          <button title="Duplicate (Ctrl+D)" onClick={() => duplicateObject(o.id)}>⧉</button>
          <button title="Delete" className="danger" onClick={() => removeObject(o.id)}>🗑</button>
        </div>
      </div>

      <label>Label
        <input type="text" value={o.label ?? ''} placeholder={lib?.name ?? ''}
          onChange={e => updateObject(o.id, { label: e.target.value })} />
      </label>

      {!isLine && !isPoly && (
        <div className="props-row">
          <label>{o.kind === 'circle' || o.kind === 'symbol' ? 'Diameter (m)' : 'Width (m)'}
            <input type="number" step={0.1} min={0.1} value={round2(o.w)}
              onChange={e => updateObject(o.id, o.kind === 'circle' || o.kind === 'symbol' ? { w: num(e.target.value), h: num(e.target.value) } : { w: num(e.target.value) })} />
          </label>
          {o.kind !== 'circle' && o.kind !== 'symbol' && (
            <label>Depth (m)
              <input type="number" step={0.1} min={0.1} value={round2(o.h)}
                onChange={e => updateObject(o.id, { h: num(e.target.value) })} />
            </label>
          )}
        </div>
      )}

      {!isLine && !isPoly && (
        <label>Rotation (°)
          <input type="number" step={5} value={Math.round(o.rotation)}
            onChange={e => updateObject(o.id, { rotation: parseFloat(e.target.value) || 0 })} />
        </label>
      )}

      {o.type === 'wall' && (
        <label>Wall height (m)
          <input type="number" step={0.1} min={0} value={o.wallHeight ?? 1}
            onChange={e => updateObject(o.id, { wallHeight: parseFloat(e.target.value) || 0 })} />
        </label>
      )}

      {o.kind === 'steps' && (
        <label>Treads
          <input type="number" step={1} min={2} max={20} value={o.treads ?? 4}
            onChange={e => updateObject(o.id, { treads: Math.max(2, parseInt(e.target.value) || 4) })} />
        </label>
      )}

      {(o.kind === 'rect' || isPoly) && (
        <label>Level (m) <span className="muted">e.g. -0.45, blank = ground</span>
          <input type="number" step={0.05} value={o.level ?? ''}
            placeholder="0.00"
            onChange={e => updateObject(o.id, { level: e.target.value === '' ? null : parseFloat(e.target.value) })} />
        </label>
      )}

      {!isLine && o.kind !== 'symbol' && (
        <div className="swatches">
          {PASTELS.map(p => (
            <button key={p.v} title={p.name} className={`swatch ${o.color === p.v ? 'active' : ''}`}
              style={{ background: p.v }} onClick={() => updateObject(o.id, { color: p.v })} />
          ))}
          <button className="swatch reset" title="Default colour" onClick={() => updateObject(o.id, { color: undefined })}>×</button>
        </div>
      )}

      <div className="props-meta">
        {isLine
          ? `Length: ${fmtM(polylineLength(o.points ?? []))}`
          : o.kind !== 'symbol' ? `Area: ${fmtM2(objectArea(o))}` : null}
      </div>
    </div>
  );
}

const round2 = (v: number) => Math.round(v * 100) / 100;
