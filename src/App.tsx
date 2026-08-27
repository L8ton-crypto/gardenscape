import { useEffect, useRef, useState } from 'react';
import { useStore } from './state/store';
import { CanvasStage } from './canvas/Stage';
import { Toolbar } from './ui/Toolbar';
import { Palette } from './ui/Palette';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { DesignsHome } from './ui/DesignsHome';
import { decodeShareHash } from './share/encode';
import { saveDesign, saveThumb } from './storage/local';
import { uid } from './model/types';
import type { Design } from './model/types';

export default function App() {
  const design = useStore(s => s.design);
  const viewOnly = useStore(s => s.viewOnly);
  const { setDesign } = useStore.getState();
  const containerRef = useRef<HTMLDivElement>(null);

  const [checkedHash, setCheckedHash] = useState(false);

  useEffect(() => {
    const shared = decodeShareHash(location.hash);
    if (shared) setDesign(shared, true);
    setCheckedHash(true);
  }, [setDesign]);

  const stageThumb = (): string | null => {
    const canvas = containerRef.current?.querySelector('canvas');
    return canvas ? canvas.toDataURL('image/png') : null;
  };

  const goHome = () => {
    if (design && !viewOnly) {
      saveDesign(design);
      const t = stageThumb();
      if (t) saveThumb(design.id, t);
    }
    history.replaceState(null, '', location.pathname);
    setDesign(null);
  };

  const makeCopy = () => {
    if (!design) return;
    const copy: Design = JSON.parse(JSON.stringify(design));
    copy.id = uid();
    copy.name = `${design.name} (copy)`;
    copy.updatedAt = Date.now();
    saveDesign(copy);
    history.replaceState(null, '', location.pathname);
    setDesign(copy, false);
  };

  if (!checkedHash) return null;

  if (!design) return <DesignsHome onOpen={d => setDesign(d)} />;

  return (
    <div className="app">
      <Toolbar onHome={goHome} stageThumb={stageThumb} />
      <div className="workspace">
        {!viewOnly && <Palette />}
        <div className="canvas-holder" ref={containerRef}>
          <CanvasStage containerRef={containerRef} />
          {viewOnly && (
            <div className="viewonly-bar">
              👀 You're viewing a shared design.
              <button onClick={makeCopy}>Make my own copy</button>
            </div>
          )}
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
