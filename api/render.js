// POST /api/render — turns a Gardenscape plan image into an AI 3D-style render.
// The Gemini key lives only in the GEMINI_API_KEY env var, server-side.

const PRESETS = {
  aerial: 'Render this garden as a photorealistic 3D aerial view, camera at roughly 45 degrees elevation looking across the plot',
  eyelevel: 'Render this garden as a photorealistic eye-level photograph taken from the patio / seating area looking across the garden',
  dusk: 'Render this garden as a photorealistic 3D aerial view at golden hour dusk, warm low sunlight, garden lights glowing',
};

const STYLE =
  'Preserve the exact layout, proportions and real-world dimensions shown in the plan. ' +
  'Every object in the plan must appear in the correct position and relative size. ' +
  'UK domestic garden, natural planting, realistic materials (timber fences, stone paving, healthy lawn). ' +
  'No people, no text, no labels, no watermarks. High quality landscape-architect visualisation.';

// Best-effort abuse guards (per warm instance): burst limit per IP + daily spend cap.
const RATE_MAX = 5;            // renders per IP per day
const RATE_WINDOW = 86_400_000;
const DAILY_MAX = 150;         // renders per day across the app (~£5/day worst case)
const ipHits = new Map();
let dayKey = '';
let dayCount = 0;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Render service not configured' });

  const today = new Date().toISOString().slice(0, 10);
  if (dayKey !== today) { dayKey = today; dayCount = 0; }
  if (dayCount >= DAILY_MAX) return res.status(429).json({ error: 'Daily render budget reached — try again tomorrow.' });

  const ip = (req.headers['x-forwarded-for'] || 'unknown').toString().split(',')[0].trim();
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_MAX) return res.status(429).json({ error: 'Daily render limit reached (5 per day) — try again tomorrow.' });

  const { image, preset, summary } = req.body || {};
  const presetText = PRESETS[preset];
  if (!presetText) return res.status(400).json({ error: 'Unknown preset' });
  if (typeof image !== 'string' || !image.startsWith('data:image/png;base64,')) {
    return res.status(400).json({ error: 'Bad image' });
  }
  const b64 = image.slice('data:image/png;base64,'.length);
  if (b64.length > 3_500_000) return res.status(400).json({ error: 'Image too large' });
  const layout = typeof summary === 'string' ? summary.slice(0, 2000) : '';

  const prompt =
    `${presetText}. The attached image is the measured top-down plan of the garden. ` +
    `${STYLE}\n\nPlan data (metres): ${layout}`;

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/png', data: b64 } },
            ],
          }],
        }),
      },
    );
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || `Upstream error ${r.status}`;
      return res.status(502).json({ error: msg });
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inlineData?.data || p.inline_data?.data);
    if (!img) {
      const text = parts.find(p => p.text)?.text || 'Model returned no image';
      return res.status(502).json({ error: text.slice(0, 300) });
    }
    hits.push(now); ipHits.set(ip, hits); dayCount += 1;
    const out = img.inlineData || img.inline_data;
    return res.status(200).json({ image: `data:${out.mimeType || out.mime_type || 'image/png'};base64,${out.data}` });
  } catch (e) {
    return res.status(502).json({ error: `Render failed: ${e.message}` });
  }
}
