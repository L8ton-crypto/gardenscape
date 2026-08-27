import LZString from 'lz-string';
import type { Design } from '../model/types';

export function encodeShareUrl(d: Design): string {
  const packed = LZString.compressToEncodedURIComponent(JSON.stringify(d));
  return `${location.origin}${location.pathname}#d=${packed}`;
}

export function decodeShareHash(hash: string): Design | null {
  const m = hash.match(/#d=(.+)$/);
  if (!m) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    const d = JSON.parse(json) as Design;
    if (!d || !Array.isArray(d.objects) || !d.widthM || !d.heightM) return null;
    return d;
  } catch { return null; }
}
