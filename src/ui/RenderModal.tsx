import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../state/store';
import type { Design } from '../model/types';
import { fmtM, objectArea, polylineLength } from '../model/types';
import { LIB_MAP, LINE_STYLES } from '../model/library';
import { getCachedRender, putCachedRender } from '../share/renderCache';
import { saveFile } from '../share/download';

const PRESETS = [
  { key: 'aerial', name: 'Aerial 3D', emoji: '🏞️' },
  { key: 'eyelevel', name: 'From the patio', emoji: '📷' },
  { key: 'dusk', name: 'Dusk', emoji: '🌇' },
];

function houseEdge(d: Design): string {
  const house = d.objects.find(o => o.type === 'house' || o.type === 'extension');
  if (!house) return 'bottom'; // no house drawn — assume it sits below the plan
  let hx = house.x, hy = house.y;
  if (house.kind === 'line' && house.points?.length) {
    hx = 0; hy = 0;
    for (let i = 0; i < house.points.length; i += 2) { hx += house.points[i]; hy += house.points[i + 1]; }
    hx /= house.points.length / 2; hy /= house.points.length / 2;
  }
  const dists: [string, number][] = [
    ['top', hy], ['bottom', d.heightM - hy],
    ['left', hx], ['right', d.widthM - hx],
  ];
  dists.sort((a, b) => a[1] - b[1]);
  return dists[0][0];
}

function designSummary(d: Design): string {
  const parts = [
    `Plot ${fmtM(d.widthM)} x ${fmtM(d.heightM)}. North at ${d.northDeg} degrees.`,
    `The house adjoins the garden along the ${houseEdge(d)} edge of the plan — render the garden attached to the house with part of its rear facade visible along that edge, not as a free-standing island plot`,
  ];
  for (const o of d.objects) {
    const name = o.label || LIB_MAP[o.type]?.name || LINE_STYLES[o.type]?.name;
    if (!name || o.kind === 'note') continue;
    if (o.kind === 'line') {
      parts.push(`${name} run ${fmtM(polylineLength(o.points ?? []))}${o.type === 'wall' && o.wallHeight ? ` height ${fmtM(o.wallHeight)}` : ''}`);
    } else if (o.kind === 'polygon') {
      parts.push(`${name} area ${Math.round(objectArea(o) * 10) / 10}m2`);
    } else if (o.kind !== 'symbol') {
      parts.push(`${name} ${fmtM(o.w)} x ${fmtM(o.h)} at position (${o.x.toFixed(1)}, ${o.y.toFixed(1)})${o.level != null ? ` level ${o.level}m` : ''}`);
    } else {
      parts.push(`${name} at (${o.x.toFixed(1)}, ${o.y.toFixed(1)})`);
    }
  }
  return parts.join('; ').slice(0, 2000);
}

// Captures the canvas (in sketch+dims mode) downscaled for the API.
async function capturePlan(container: HTMLElement | null): Promise<string | null> {
  const st = useStore.getState();
  const wasSketch = st.sketchMode, wasDims = st.showDims;
  if (!wasSketch) st.toggleSketch();
  useStore.setState({ showDims: true });
  window.dispatchEvent(new Event('gs:fit'));
  await new Promise(r => setTimeout(r, 450));
  const canvas = container?.querySelector('canvas');
  let out: string | null = null;
  if (canvas) {
    const scale = Math.min(1, 1200 / Math.max(canvas.width, canvas.height));
    const c2 = document.createElement('canvas');
    c2.width = Math.round(canvas.width * scale);
    c2.height = Math.round(canvas.height * scale);
    const ctx = c2.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c2.width, c2.height);
    ctx.drawImage(canvas, 0, 0, c2.width, c2.height);
    out = c2.toDataURL('image/png');
  }
  if (!wasSketch) useStore.getState().toggleSketch();
  useStore.setState({ showDims: wasDims });
  return out;
}

export function RenderModal({ onClose }: { onClose: () => void }) {
  const containerEl = document.querySelector<HTMLElement>('.canvas-holder');
  const design = useStore(s => s.design)!;
  const [preset, setPreset] = useState('aerial');
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fromCache, setFromCache] = useState(false);

  const run = async (p: string, force = false) => {
    setError(''); setPreset(p); setFromCache(false);
    if (!force) {
      const cached = await getCachedRender(design, p);
      if (cached) { setImg(cached); setFromCache(true); setBusy(false); return; }
    }
    setBusy(true);
    try {
      const plan = await capturePlan(containerEl);
      if (!plan) throw new Error('Could not capture the plan');
      const r = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: plan, preset: p, summary: designSummary(design) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Render failed (${r.status})`);
      setImg(data.image);
      putCachedRender(design, p, data.image);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { run('aerial'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal render-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>✨ 3D render</h3>
          <button onClick={onClose}>✕ Close</button>
        </div>
        <div className="render-presets">
          {PRESETS.map(p => (
            <button key={p.key} disabled={busy} className={preset === p.key ? 'active' : ''}
              onClick={() => run(p.key)}>{p.emoji} {p.name}</button>
          ))}
        </div>
        <div className="render-stage">
          {busy && <div className="render-busy"><span className="spinner" />Rendering your garden… (~15s)</div>}
          {!busy && error && <div className="render-error">⚠️ {error}</div>}
          {!busy && !error && img && <img src={img} alt="3D render of your garden" />}
        </div>
        {!busy && img && !error && (
          <div className="render-actions">
            {fromCache && <span className="render-cached">saved render — plot unchanged</span>}
            <button onClick={() => run(preset, true)}>🔄 Re-roll</button>
            <button className="primary" onClick={() => saveFile(img, `${design.name} - 3D render.png`)}>⬇ Save image</button>
          </div>
        )}
        <p className="modal-foot">AI impression based on your plan — layout is respected, planting detail is artistic licence.</p>
      </div>
    </div>,
    document.body,
  );
}
