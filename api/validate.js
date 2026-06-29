// api/validate.js — checks if a key exists in Upstash Redis
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key } = req.body;
  if (!key || typeof key !== 'string') return res.status(400).json({ valid: false, error: 'No key provided' });

  const cleanKey = key.trim().toUpperCase();

  try {
    const r = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(cleanKey)}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    const data = await r.json();
    if (data.result) {
      const info = JSON.parse(data.result);
      return res.status(200).json({ valid: true, name: info.name, plan: info.plan });
    }
    return res.status(200).json({ valid: false });
  } catch (e) {
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
}
