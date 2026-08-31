import type { Design } from './types';
import { objectArea, polylineLength } from './types';

export interface MaterialLine { item: string; qty: string; note: string }

// Rough material take-off from the plan — estimates for budgeting, not ordering.
export function estimateMaterials(design: Design): MaterialLine[] {
  let paving = 0, decking = 0, lawn = 0, beds = 0, gravel = 0;
  let fence = 0, wallLen = 0, wallFace = 0, hedge = 0, edging = 0, pathLine = 0;

  for (const o of design.objects) {
    if (o.kind === 'line') {
      const l = polylineLength(o.points ?? []);
      if (o.type === 'fence') fence += l;
      if (o.type === 'wall') { wallLen += l; wallFace += l * (o.wallHeight ?? 1); }
      if (o.type === 'hedge') hedge += l;
      if (o.type === 'edging') edging += l;
      if (o.type === 'path') pathLine += l * 0.9; // default path width
      continue;
    }
    const a = objectArea(o);
    switch (o.type) {
      case 'patio': case 'path-area': paving += a; break;
      case 'gravel': gravel += a; break;
      case 'decking': decking += a; break;
      case 'lawn': lawn += a; break;
      case 'flower-bed': case 'veg-patch': case 'raised-bed': beds += a; break;
      default: break;
    }
  }

  const r1 = (v: number) => Math.round(v * 10) / 10;
  const out: MaterialLine[] = [];
  if (paving) out.push({ item: 'Paving slabs', qty: `${r1(paving * 1.1)} m²`, note: `${r1(paving)} m² + 10% cuts/waste` });
  if (pathLine) out.push({ item: 'Path surfacing', qty: `${r1(pathLine * 1.1)} m²`, note: `${r1(pathLine)} m² (0.9m wide) + 10%` });
  if (gravel) out.push({ item: 'Gravel', qty: `${r1(gravel * 0.05)} m³ (~${Math.ceil(gravel * 0.05 * 1.6 * 10) / 10} t)`, note: `${r1(gravel)} m² at 50mm depth` });
  if (decking) out.push({ item: 'Decking boards', qty: `${r1(decking * 1.1)} m²`, note: `${r1(decking)} m² + 10% cuts/waste` });
  if (lawn) out.push({ item: 'Turf', qty: `${r1(lawn * 1.05)} m²`, note: `${r1(lawn)} m² + 5% trim` });
  if (beds) out.push({ item: 'Topsoil / compost', qty: `${r1(beds * 0.15)} m³`, note: `${r1(beds)} m² of beds at 150mm` });
  if (fence) out.push({ item: 'Fence panels', qty: `${Math.ceil(fence / 1.8)} × 1.8m`, note: `${r1(fence)} m run · +${Math.ceil(fence / 1.8) + 1} posts` });
  if (wallLen) out.push({ item: 'Walling', qty: `${r1(wallFace)} m² face`, note: `${r1(wallLen)} m run · ~${Math.ceil(wallFace * 60)} bricks single skin` });
  if (hedge) out.push({ item: 'Hedging plants', qty: `${Math.ceil(hedge / 0.5)} plants`, note: `${r1(hedge)} m at 2/metre` });
  if (edging) out.push({ item: 'Edging', qty: `${r1(edging * 1.05)} m`, note: `${r1(edging)} m + 5%` });
  return out;
}
