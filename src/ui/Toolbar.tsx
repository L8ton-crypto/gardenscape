import { useState } from 'react';
import { useStore } from '../state/store';
import { encodeShareUrl } from '../share/encode';
import { renderBuilderPlan } from '../share/builderExport';
import { objectArea, polylineLength, fmtM2, fmtM } from '../model/types';
import { LIB_MAP } from '../model/library';
import { estimateMaterials } from '../model/materials';
import { RenderModal } from './RenderModal';

export function Toolbar({ onHome, stageThumb }: { onHome: () => void; stageThumb: () => string | null }) {
  const design = useStore(s => s.design)!;
  const viewOnly = useStore(s => s.viewOnly);
  const tool = useStore(s => s.tool);
  const snap = useStore(s => s.snap);
  const canUndo = useStore(s => s.past.length > 0);
  const canRedo = useStore(s => s.future.length > 0);
  const showLayers = useStore(s => s.showLayers);
  const showDims = useStore(s => s.showDims);
  const sketchMode = useStore(s => s.sketchMode);
  const { setTool, setSnap, undo, redo, commit, toggleLayer, toggleDims, toggleSketch } = useStore.getState();
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showRender, setShowRender] = useState(false);

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
      <button className="tb-btn brand" onClick={onHome} title="My designs"><span>🌿</span><small>Home</small></button>
      {!viewOnly && (
        <input className="tb-name" value={design.name}
          onChange={e => commit(d => { d.name = e.target.value; })} />
      )}
      {viewOnly && <span className="tb-name readonly">{design.name} <em>· view only</em></span>}

      {!viewOnly && (
        <>
          <div className="tb-group">
            <button className={`tb-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Select / move"><span>➤</span><small>Select</small></button>
            <button className={`tb-btn ${tool === 'measure' ? 'active' : ''}`} onClick={() => setTool(tool === 'measure' ? 'select' : 'measure')} title="Tape measure"><span>📏</span><small>Measure</small></button>
          </div>
          <div className="tb-group">
            <button className="tb-btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)"><span>↶</span><small>Undo</small></button>
            <button className="tb-btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)"><span>↷</span><small>Redo</small></button>
          </div>
          <button className={`tb-btn ${snap ? 'active' : ''}`} onClick={() => setSnap(!snap)} title="Snap to grid"><span>🧲</span><small>Snap</small></button>
        </>
      )}
      <button className={`tb-btn ${showDims ? 'active' : ''}`} onClick={toggleDims} title="Show all measurements"><span>📐</span><small>Sizes</small></button>
      <button className={`tb-btn ${sketchMode ? 'active' : ''}`} onClick={toggleSketch} title="Sketch view (schematic)"><span>✏️</span><small>Sketch</small></button>
      <button className="tb-btn" onClick={() => setShowRender(true)} title="3D render (AI)"><span>✨</span><small>3D</small></button>

      <div className="tb-group">
        <button className="tb-btn" onClick={() => window.dispatchEvent(new CustomEvent('gs:zoom', { detail: 1.2 }))} title="Zoom in"><span>＋</span><small>In</small></button>
        <button className="tb-btn" onClick={() => window.dispatchEvent(new CustomEvent('gs:zoom', { detail: 1 / 1.2 }))} title="Zoom out"><span>－</span><small>Out</small></button>
        <button className="tb-btn" onClick={() => window.dispatchEvent(new Event('gs:fit'))} title="Fit to screen"><span>⛶</span><small>Fit</small></button>
      </div>

      <div className="tb-spacer" />
      <TotalsStrip />

      <div className="tb-menu-wrap">
        <button className="tb-btn" onClick={() => setMenuOpen(v => !v)} title="Menu"><span>☰</span><small>Menu</small></button>
        {menuOpen && (
          <div className="tb-menu" onClick={() => setMenuOpen(false)}>
            {!viewOnly && <button onClick={share}>🔗 Copy view-only link</button>}
            <button onClick={() => setShowMaterials(true)}>🧮 Materials estimate</button>
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
                <div className="menu-label">Grid lines: {design.gridSizeM}m</div>
                <div className="menu-grid-opts">
                  {[0.1, 0.25, 0.5, 1].map(g => (
                    <button key={g} className={design.gridSizeM === g ? 'active' : ''}
                      onClick={e => { e.stopPropagation(); commit(d => { d.gridSizeM = g; }); }}>{g}m</button>
                  ))}
                </div>
                <div className="menu-label">Fine step (magnet off): {design.snapStepM ?? 0.1}m</div>
                <div className="menu-grid-opts">
                  {[0.05, 0.1, 0.25, 0.5].map(g => (
                    <button key={g} className={(design.snapStepM ?? 0.1) === g ? 'active' : ''}
                      onClick={e => { e.stopPropagation(); commit(d => { d.snapStepM = g; }); }}>{g}m</button>
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
      {showMaterials && <MaterialsModal onClose={() => setShowMaterials(false)} />}
      {showRender && <RenderModal onClose={() => setShowRender(false)} />}
    </div>
  );
}

function MaterialsModal({ onClose }: { onClose: () => void }) {
  const design = useStore(s => s.design)!;
  const lines = estimateMaterials(design);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🧮 Materials estimate</h3>
          <button onClick={onClose}>✕ Close</button>
        </div>
        {lines.length === 0 ? (
          <p className="modal-empty">Nothing to estimate yet — add surfaces, fences, walls or beds to the plan.</p>
        ) : (
          <table className="mat-table">
            <tbody>
              {lines.map(l => (
                <tr key={l.item}>
                  <td className="mat-item">{l.item}</td>
                  <td className="mat-qty">{l.qty}</td>
                  <td className="mat-note">{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="modal-foot">Rough take-off for budgeting — always confirm quantities with your supplier.</p>
      </div>
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
