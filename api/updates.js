export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BASE  = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  const RKEY  = 'paintx:updates';

  async function kvGet(k) {
    const r = await fetch(`${BASE}/get/${encodeURIComponent(k)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const j = await r.json();
    return j.result || null;
  }

  async function kvSet(k, value) {
    // value must be a string; encode it in the URL path
    const r = await fetch(
      `${BASE}/set/${encodeURIComponent(k)}/${encodeURIComponent(value)}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    const j = await r.json();
    return j.result === 'OK';
  }

  // ── GET — public ──
  if (req.method === 'GET') {
    try {
      const raw = await kvGet(RKEY);
      const updates = raw ? JSON.parse(raw) : [];
      return res.status(200).json({ updates });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load updates' });
    }
  }

  // ── POST — publish update (admin) ──
  if (req.method === 'POST') {
    const { password, title, body, version, tags } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    try {
      const raw = await kvGet(RKEY);
      const updates = raw ? JSON.parse(raw) : [];
      const entry = {
        id: Date.now().toString(),
        title: title.trim(),
        body: body.trim(),
        version: (version || '').trim(),
        tags: Array.isArray(tags) ? tags : [],
        date: new Date().toISOString()
      };
      updates.unshift(entry);
      const ok = await kvSet(RKEY, JSON.stringify(updates));
      if (!ok) return res.status(500).json({ error: 'Failed to save' });
      return res.status(200).json({ ok: true, update: entry });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── DELETE — remove update by id (admin) ──
  if (req.method === 'DELETE') {
    const { password, id } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
    try {
      const raw = await kvGet(RKEY);
      const updates = raw ? JSON.parse(raw) : [];
      const filtered = updates.filter(u => u.id !== id);
      const ok = await kvSet(RKEY, JSON.stringify(filtered));
      if (!ok) return res.status(500).json({ error: 'Failed to delete' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
