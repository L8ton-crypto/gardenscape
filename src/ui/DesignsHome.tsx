import { useState } from 'react';
import { listDesigns, loadDesign, deleteDesign, loadThumb, saveDesign } from '../storage/local';
import { newDesign, uid } from '../model/types';
import type { Design } from '../model/types';

const TEMPLATES: { name: string; desc: string; make: () => Design }[] = [
  { name: 'Blank plot', desc: 'Start from your own dimensions', make: () => newDesign('My garden', 10, 8) },
  {
    name: 'UK semi rear garden', desc: '11 × 7m with patio, lawn & shed', make: () => {
      const d = newDesign('Rear garden', 11, 7);
      d.objects = [
        { id: uid(), type: 'patio', kind: 'rect', x: 2, y: 5.5, w: 4, h: 3, rotation: 0 },
        { id: uid(), type: 'lawn', kind: 'rect', x: 6.5, y: 3.5, w: 7, h: 5, rotation: 0 },
        { id: uid(), type: 'shed', kind: 'rect', x: 9.8, y: 1.3, w: 1.8, h: 2.4, rotation: 0 },
        { id: uid(), type: 'flower-bed', kind: 'rect', x: 5.5, y: 0.6, w: 9, h: 1, rotation: 0 },
        { id: uid(), type: 'tree', kind: 'circle', x: 9, y: 5.5, w: 3, h: 3, rotation: 0 },
      ];
      return d;
    },
  },
  {
    name: 'Courtyard', desc: '6 × 5m paved courtyard', make: () => {
      const d = newDesign('Courtyard', 6, 5);
      d.objects = [
        { id: uid(), type: 'patio', kind: 'rect', x: 3, y: 2.5, w: 6, h: 5, rotation: 0, label: 'Paving' },
        { id: uid(), type: 'raised-bed', kind: 'rect', x: 3, y: 0.5, w: 5, h: 0.8, rotation: 0 },
        { id: uid(), type: 'table', kind: 'circle', x: 3, y: 3, w: 1.8, h: 1.8, rotation: 0 },
        { id: uid(), type: 'pot', kind: 'circle', x: 0.5, y: 4.5, w: 0.5, h: 0.5, rotation: 0 },
        { id: uid(), type: 'pot', kind: 'circle', x: 5.5, y: 4.5, w: 0.5, h: 0.5, rotation: 0 },
      ];
      return d;
    },
  },
];

export function DesignsHome({ onOpen }: { onOpen: (d: Design) => void }) {
  const [metas, setMetas] = useState(listDesigns());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('My garden');
  const [w, setW] = useState('10');
  const [h, setH] = useState('8');

  const create = () => {
    const d = newDesign(name.trim() || 'My garden', clampDim(w), clampDim(h));
    saveDesign(d);
    onOpen(d);
  };

  const importJson = (file: File) => {
    file.text().then(txt => {
      try {
        const d = JSON.parse(txt) as Design;
        if (!d.widthM || !Array.isArray(d.objects)) throw new Error('bad');
        d.id = uid();
        d.updatedAt = Date.now();
        saveDesign(d);
        onOpen(d);
      } catch { alert('That file is not a valid Gardenscape design.'); }
    });
  };

  return (
    <div className="home">
      <header className="home-head">
        <h1>🌿 Gardenscape</h1>
        <p>Design your garden to scale — drag, draw, measure, share.</p>
      </header>

      {creating ? (
        <div className="new-form">
          <h2>New design</h2>
          <label>Name<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
          <div className="dim-row">
            <label>Width (m)<input type="number" min={1} max={200} step={0.5} value={w} onChange={e => setW(e.target.value)} /></label>
            <label>Depth (m)<input type="number" min={1} max={200} step={0.5} value={h} onChange={e => setH(e.target.value)} /></label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={create}>Create garden</button>
            <button onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <section>
            <h2>Start new</h2>
            <div className="cards">
              <button className="card new" onClick={() => setCreating(true)}>
                <span className="card-big">＋</span><strong>New design</strong><span>Enter your plot size</span>
              </button>
              {TEMPLATES.slice(1).map(t => (
                <button key={t.name} className="card" onClick={() => { const d = t.make(); saveDesign(d); onOpen(d); }}>
                  <span className="card-big">🌱</span><strong>{t.name}</strong><span>{t.desc}</span>
                </button>
              ))}
              <label className="card import">
                <span className="card-big">📂</span><strong>Import JSON</strong><span>Restore a backup</span>
                <input type="file" accept=".json" hidden onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} />
              </label>
            </div>
          </section>

          {metas.length > 0 && (
            <section>
              <h2>My designs</h2>
              <div className="cards">
                {metas.map(m => {
                  const thumb = loadThumb(m.id);
                  return (
                    <div key={m.id} className="card saved" onClick={() => { const d = loadDesign(m.id); if (d) onOpen(d); }}>
                      {thumb ? <img src={thumb} alt="" /> : <span className="card-big">🗺️</span>}
                      <strong>{m.name}</strong>
                      <span>{new Date(m.updatedAt).toLocaleDateString('en-GB')}</span>
                      <button className="card-del" onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete "${m.name}"? This cannot be undone.`)) {
                          deleteDesign(m.id);
                          setMetas(listDesigns());
                        }
                      }}>🗑</button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
      <footer className="home-foot">Designs are saved in this browser. Use Export JSON for backups, share links for viewing.</footer>
    </div>
  );
}

const clampDim = (v: string) => Math.min(200, Math.max(1, parseFloat(v) || 10));
