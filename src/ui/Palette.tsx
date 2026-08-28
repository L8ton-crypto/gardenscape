import { useState } from 'react';
import { LIBRARY, CATEGORIES, LINE_STYLES } from '../model/library';
import { useStore } from '../state/store';
import type { LineType } from '../model/types';

export function Palette() {
  const [cat, setCat] = useState<string>('planting');
  const tool = useStore(s => s.tool);
  const lineType = useStore(s => s.lineType);
  const { addObject, select, setTool, setLineType } = useStore.getState();
  const design = useStore(s => s.design);

  const place = (type: string) => {
    const item = LIBRARY.find(i => i.type === type)!;
    if (!design) return;
    const id = addObject({
      type: item.type, kind: item.kind,
      x: design.widthM / 2, y: design.heightM / 2,
      w: item.w, h: item.h, rotation: 0,
      treads: item.kind === 'steps' ? 4 : undefined,
    });
    select(id);
    setTool('select');
  };

  return (
    <div className="palette">
      <div className="palette-tabs">
        {CATEGORIES.map(c => (
          <button key={c.key} className={cat === c.key ? 'active' : ''} onClick={() => setCat(c.key)}>{c.name}</button>
        ))}
        <button className={cat === 'lines' ? 'active' : ''} onClick={() => setCat('lines')}>Lines</button>
        <button className={cat === 'draw' ? 'active' : ''} onClick={() => setCat('draw')}>Draw</button>
      </div>
      <div className="palette-items">
        {cat === 'lines' ? (
          Object.entries(LINE_STYLES).map(([key, s]) => (
            <button key={key}
              className={`pal-item ${tool === 'line' && lineType === key ? 'active' : ''}`}
              onClick={() => { setLineType(key as LineType); setTool('line'); }}>
              <span className="pal-icon">{s.emoji}</span><span>{s.name}</span>
            </button>
          )).concat(tool === 'line'
            ? [<div key="hint" className="hint">Tap the start point, tap the end — the run completes itself. Select it afterwards to add corners or a label.</div>]
            : [])
        ) : cat === 'draw' ? (
          <>
            <button className={`pal-item ${tool === 'rect' ? 'active' : ''}`} onClick={() => setTool('rect')}>
              <span className="pal-icon">▭</span><span>Area (drag)</span>
            </button>
            <button className={`pal-item ${tool === 'polygon' ? 'active' : ''}`} onClick={() => setTool('polygon')}>
              <span className="pal-icon">⬠</span><span>Freeform (tap points)</span>
            </button>
            <button className={`pal-item ${tool === 'boundary' ? 'active' : ''}`} onClick={() => setTool('boundary')}>
              <span className="pal-icon">🧭</span><span>Edit boundary</span>
            </button>
            {(tool === 'polygon' || tool === 'line') && (
              <div className="hint">Tap to add points · double-tap or Enter to finish · Esc to cancel</div>
            )}
            {tool === 'boundary' && (
              <div className="hint">Drag corners · tap a blue midpoint to add a corner · double-tap a corner to remove</div>
            )}
          </>
        ) : (
          LIBRARY.filter(i => i.category === cat).map(i => (
            <button key={i.type} className="pal-item" onClick={() => place(i.type)}>
              <span className="pal-icon">{i.emoji}</span><span>{i.name}</span>
              <span className="pal-size">{i.w}×{i.h}m</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
