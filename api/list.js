// api/list.js — lists all generated keys (admin only)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  try {
    const r = await fetch(`${process.env.KV_REST_API_URL}/keys/PX-*`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    const data = await r.json();
    const keys = data.result || [];

    // Fetch info for each key
    const details = await Promise.all(keys.map(async (k) => {
      const r2 = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(k)}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
      });
      const d = await r2.json();
      const info = d.result ? JSON.parse(d.result) : {};
      return { key: k, ...info };
    }));

    return res.status(200).json({ keys: details });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
