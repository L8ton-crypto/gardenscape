// Cross-platform "save this file". iOS Safari ignores programmatic <a download>
// clicks on data: URLs, so there we hand the file to the native share sheet
// (which offers Save Image / Save to Files); elsewhere a normal download.

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function saveFile(dataUrl: string, filename: string): Promise<void> {
  const blob = dataUrl.startsWith('data:') ? dataUrlToBlob(dataUrl) : await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: blob.type });

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS masquerades as Mac

  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user closed the sheet
      // fall through to the link approach
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
