import { useEffect, useState } from 'react';
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
  const isPoly = o.kind === 'polygon' || o.kind === 'note';
  const isNote = o.kind === 'note';

  return (
    <div className="props">
      <div className="props-head">
        <strong>{isNote ? 'Note' : (o.label ?? lib?.name ?? LINE_STYLES[o.type]?.name ?? 'Object')}</strong>
        <div className="props-actions">
          <button title="Duplicate (Ctrl+D)" onClick={() => duplicateObject(o.id)}>⧉</button>
          <button title="Delete" className="danger" onClick={() => removeObject(o.id)}>🗑</button>
        </div>
      </div>

      <label>{isNote ? 'Note text' : 'Label'}
        {isNote ? (
          <textarea rows={3} value={o.label ?? ''} placeholder="e.g. existing drain here" autoFocus
            onChange={e => updateObject(o.id, { label: e.target.value })} />
        ) : (
          <input type="text" value={o.label ?? ''} placeholder={lib?.name ?? ''}
            onChange={e => updateObject(o.id, { label: e.target.value })} />
        )}
      </label>

      {!isLine && !isPoly && (
        <div className="props-row">
          <label>{o.kind === 'circle' || o.kind === 'symbol' ? 'Diameter (m)' : 'Width (m)'}
            <NumField key={`w-${o.id}`} value={round2(o.w)} min={0.1}
              onCommit={v => updateObject(o.id, o.kind === 'circle' || o.kind === 'symbol' ? { w: v, h: v } : { w: v })} />
          </label>
          {o.kind !== 'circle' && o.kind !== 'symbol' && (
            <label>Depth (m)
              <NumField key={`h-${o.id}`} value={round2(o.h)} min={0.1}
                onCommit={v => updateObject(o.id, { h: v })} />
            </label>
          )}
        </div>
      )}

      {!isLine && !isPoly && (
        <label>Rotation (°)
          <NumField key={`r-${o.id}`} value={Math.round(o.rotation)} step={5}
            onCommit={v => updateObject(o.id, { rotation: v })} />
        </label>
      )}

      {o.type === 'wall' && (
        <label>Wall height (m)
          <NumField key={`wh-${o.id}`} value={o.wallHeight ?? 1} min={0}
            onCommit={v => updateObject(o.id, { wallHeight: v })} />
        </label>
      )}

      {o.kind === 'steps' && (
        <label>Treads
          <NumField key={`t-${o.id}`} value={o.treads ?? 4} step={1} min={2} integer
            onCommit={v => updateObject(o.id, { treads: Math.min(20, Math.max(2, Math.round(v))) })} />
        </label>
      )}

      {(o.kind === 'rect' || o.kind === 'polygon') && (
        <label>Level (m) <span className="muted">e.g. -0.45, blank = ground</span>
          <input type="number" step={0.05} value={o.level ?? ''}
            placeholder="0.00"
            onChange={e => updateObject(o.id, { level: e.target.value === '' ? null : parseFloat(e.target.value) })} />
        </label>
      )}

      {!isLine && o.kind !== 'symbol' && !isNote && (
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

// Number input that lets you clear the field and type freely; the value is
// applied only when the text parses, and snaps back to the real value on blur.
function NumField({ value, onCommit, min, step = 0.1, integer = false }: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
  integer?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const tryCommit = (raw: string) => {
    const v = integer ? parseInt(raw) : parseFloat(raw);
    if (!Number.isFinite(v)) return;
    if (min != null && v < min) return;
    onCommit(v);
  };

  return (
    <input type="number" step={step} min={min} value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setText(String(value)); }}
      onChange={e => { setText(e.target.value); tryCommit(e.target.value); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
