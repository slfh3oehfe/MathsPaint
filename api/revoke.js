// api/revoke.js — deletes a key from Redis
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { password, key } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
  if (!key) return res.status(400).json({ error: 'No key' });

  try {
    await fetch(`${process.env.KV_REST_API_URL}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
