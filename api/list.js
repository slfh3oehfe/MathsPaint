export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const BASE  = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;

  try {
    const r = await fetch(`${BASE}/keys/PX-*`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const data = await r.json();
    const keys = data.result || [];

    const details = await Promise.all(keys.map(async (k) => {
      const r2 = await fetch(`${BASE}/get/${encodeURIComponent(k)}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      const d = await r2.json();
      let info = {};
      if (d.result) {
        try {
          const parsed = JSON.parse(d.result);
          // Handle old broken format: { value: "{name:...,plan:...}" }
          if (parsed.value && typeof parsed.value === 'string') {
            info = JSON.parse(parsed.value);
          } else {
            info = parsed;
          }
        } catch(e) {}
      }
      return { key: k, name: info.name || '?', plan: info.plan || '?', created: info.created || '' };
    }));

    return res.status(200).json({ keys: details });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
