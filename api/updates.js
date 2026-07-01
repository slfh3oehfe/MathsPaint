// api/updates.js — GET returns updates array, POST adds a new update (admin only)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const KV_URL   = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  async function kv(cmd, ...args) {
    const r = await fetch(`${KV_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const j = await r.json();
    return j.result;
  }

  // ── GET — return all updates sorted newest first ──
  if (req.method === 'GET') {
    try {
      const raw = await kv('get', 'paintx:updates');
      const updates = raw ? JSON.parse(raw) : [];
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
      const raw = await kv('get', 'paintx:updates');
      const updates = raw ? JSON.parse(raw) : [];
      const entry = {
        id: Date.now().toString(),
        title: title.trim(),
        body: body.trim(),
        version: (version || '').trim(),
        tags: Array.isArray(tags) ? tags : [],
        date: new Date().toISOString()
      };
      updates.unshift(entry); // newest first
      await fetch(`${KV_URL}/set/paintx:updates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(updates))
      });
      return res.status(200).json({ ok: true, update: entry });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save update' });
    }
  }

  // ── DELETE — admin deletes an update by id ──
  if (req.method === 'DELETE') {
    const { password, id } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    try {
      const raw = await kv('get', 'paintx:updates');
      let updates = raw ? JSON.parse(raw) : [];
      updates = updates.filter(u => u.id !== id);
      await fetch(`${KV_URL}/set/paintx:updates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(updates))
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete update' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
