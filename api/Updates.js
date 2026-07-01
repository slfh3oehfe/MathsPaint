// api/updates.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BASE  = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  const KEY   = 'paintx:updates';

  // Read updates array from Redis
  async function getUpdates() {
    const r = await fetch(`${BASE}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const j = await r.json();
    return j.result ? JSON.parse(j.result) : [];
  }

  // Write updates array to Redis
  async function setUpdates(updates) {
    const r = await fetch(`${BASE}/set/${encodeURIComponent(KEY)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(updates) })
    });
    const j = await r.json();
    return j.result === 'OK';
  }

  // ── GET — public, returns all updates ──
  if (req.method === 'GET') {
    try {
      const updates = await getUpdates();
      return res.status(200).json({ updates });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load updates' });
    }
  }

  // ── POST — admin posts a new update ──
  if (req.method === 'POST') {
    const { password, title, body, version, tags } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }
    try {
      const updates = await getUpdates();
      const entry = {
        id: Date.now().toString(),
        title: title.trim(),
        body: body.trim(),
        version: (version || '').trim(),
        tags: Array.isArray(tags) ? tags : [],
        date: new Date().toISOString()
      };
      updates.unshift(entry);
      const ok = await setUpdates(updates);
      if (!ok) return res.status(500).json({ error: 'Failed to save update' });
      return res.status(200).json({ ok: true, update: entry });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save update' });
    }
  }

  // ── DELETE — admin removes an update by id ──
  if (req.method === 'DELETE') {
    const { password, id } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    try {
      const updates = await getUpdates();
      const filtered = updates.filter(function(u){ return u.id !== id; });
      const ok = await setUpdates(filtered);
      if (!ok) return res.status(500).json({ error: 'Failed to delete update' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete update' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
