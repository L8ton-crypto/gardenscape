import { useState } from 'react';
import { useStore } from '../state/store';
import { encodeShareUrl } from '../share/encode';
import { renderBuilderPlan } from '../share/builderExport';
import { objectArea, polylineLength, fmtM2, fmtM } from '../model/types';
import { LIB_MAP } from '../model/library';

export function Toolbar({ onHome, stageThumb }: { onHome: () => void; stageThumb: () => string | null }) {
  const design = useStore(s => s.design)!;
  const viewOnly = useStore(s => s.viewOnly);
  const tool = useStore(s => s.tool);
  const snap = useStore(s => s.snap);
  const canUndo = useStore(s => s.past.length > 0);
  const canRedo = useStore(s => s.future.length > 0);
  const showLayers = useStore(s => s.showLayers);
  const { setTool, setSnap, undo, redo, commit, toggleLayer } = useStore.getState();
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const share = async () => {
    const url = encodeShareUrl(design);
    try {
      await navigator.clipboard.writeText(url);
      flash('View-only link copied to clipboard');
    } catch {
      prompt('Copy this view-only link:', url);
    }
  };

  const download = (dataUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
  };

  const exportPng = () => {
    const url = stageThumb();
    if (url) { download(url, `${design.name}.png`); flash('PNG exported'); }
  };

  const exportBuilder = () => {
    download(renderBuilderPlan(design), `${design.name} - builders plan.png`);
    flash("Builder's plan exported");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    download(URL.createObjectURL(blob), `${design.name}.gardenscape.json`);
    flash('Design JSON exported');
  };

  return (
    <div className="toolbar">
      <button className="tb-btn brand" onClick={onHome} title="My designs">🌿</button>
      {!viewOnly && (
        <input className="tb-name" value={design.name}
          onChange={e => commit(d => { d.name = e.target.value; })} />
      )}
      {viewOnly && <span className="tb-name readonly">{design.name} <em>· view only</em></span>}

      {!viewOnly && (
        <>
          <div className="tb-group">
            <button className={`tb-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Select / move">➤</button>
            <button className={`tb-btn ${tool === 'measure' ? 'active' : ''}`} onClick={() => setTool(tool === 'measure' ? 'select' : 'measure')} title="Tape measure">📏</button>
          </div>
          <div className="tb-group">
            <button className="tb-btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">↶</button>
            <button className="tb-btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)">↷</button>
          </div>
          <button className={`tb-btn ${snap ? 'active' : ''}`} onClick={() => setSnap(!snap)} title="Snap to grid">🧲</button>
        </>
      )}

      <div className="tb-group">
        <button className="tb-btn" onClick={() => window.dispatchEvent(new CustomEvent('gs:zoom', { detail: 1.2 }))} title="Zoom in">＋</button>
        <button className="tb-btn" onClick={() => window.dispatchEvent(new CustomEvent('gs:zoom', { detail: 1 / 1.2 }))} title="Zoom out">－</button>
        <button className="tb-btn" onClick={() => window.dispatchEvent(new Event('gs:fit'))} title="Fit to screen">⛶</button>
      </div>

      <div className="tb-spacer" />
      <TotalsStrip />

      <div className="tb-menu-wrap">
        <button className="tb-btn" onClick={() => setMenuOpen(v => !v)} title="Menu">☰</button>
        {menuOpen && (
          <div className="tb-menu" onClick={() => setMenuOpen(false)}>
            {!viewOnly && <button onClick={share}>🔗 Copy view-only link</button>}
            <button onClick={exportPng}>🖼 Export PNG</button>
            <button onClick={exportBuilder}>📐 Builder's plan (PNG)</button>
            {!viewOnly && <button onClick={exportJson}>💾 Export JSON backup</button>}
            {!viewOnly && (
              <>
                <div className="menu-sep" />
                <div className="menu-label">Layers</div>
                <button onClick={e => { e.stopPropagation(); toggleLayer('planting'); }}>{showLayers.planting ? '☑' : '☐'} Planting</button>
                <button onClick={e => { e.stopPropagation(); toggleLayer('hard'); }}>{showLayers.hard ? '☑' : '☐'} Hard landscaping</button>
                <button onClick={e => { e.stopPropagation(); toggleLayer('utilities'); }}>{showLayers.utilities ? '☑' : '☐'} Utilities</button>
                <div className="menu-sep" />
                <div className="menu-label">Grid: {design.gridSizeM}m</div>
                <div className="menu-grid-opts">
                  {[0.1, 0.25, 0.5, 1].map(g => (
                    <button key={g} className={design.gridSizeM === g ? 'active' : ''}
                      onClick={e => { e.stopPropagation(); commit(d => { d.gridSizeM = g; }); }}>{g}m</button>
                  ))}
                </div>
                <div className="menu-label">North: {design.northDeg}°</div>
                <input type="range" min={0} max={359} value={design.northDeg}
                  onClick={e => e.stopPropagation()}
                  onChange={e => commit(d => { d.northDeg = parseInt(e.target.value); })} />
              </>
            )}
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TotalsStrip() {
  const design = useStore(s => s.design)!;
  const totals: Record<string, number> = {};
  let fenceLen = 0, wallLen = 0;
  for (const o of design.objects) {
    if (o.kind === 'line') {
      const l = polylineLength(o.points ?? []);
      if (o.type === 'fence') fenceLen += l;
      if (o.type === 'wall') wallLen += l;
      continue;
    }
    const lib = LIB_MAP[o.type];
    if (lib?.countArea || o.type === 'custom-area' || o.type === 'custom-poly') {
      const key = ['lawn'].includes(o.type) ? 'Lawn' : ['patio', 'gravel', 'path-area'].includes(o.type) ? 'Paving' : o.type === 'decking' ? 'Decking' : 'Beds/other';
      totals[key] = (totals[key] ?? 0) + objectArea(o);
    }
  }
  const parts = [
    ...Object.entries(totals).map(([k, v]) => `${k} ${fmtM2(v)}`),
    fenceLen ? `Fence ${fmtM(fenceLen)}` : null,
    wallLen ? `Wall ${fmtM(wallLen)}` : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return <div className="totals">{parts.join(' · ')}</div>;
}
