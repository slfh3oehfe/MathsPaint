export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BASE  = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  const RKEY  = 'paintx:updates';

  // Always use POST pipeline for SET — avoids URL length limits and encoding issues
  async function kvGet(k) {
    const r = await fetch(`${BASE}/get/${encodeURIComponent(k)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const j = await r.json();
    return j.result ?? null;
  }

  async function kvSet(k, value) {
    // Use pipeline endpoint so the value is in the body, not the URL
    const r = await fetch(`${BASE}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', k, value]])
    });
    const j = await r.json();
    return Array.isArray(j) && j[0]?.result === 'OK';
  }

  // Parse the stored value — handle double-encoded strings gracefully
  function parseUpdates(raw) {
    if (!raw) return [];
    try {
      let v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      // If still a string (double-encoded), parse again
      if (typeof v === 'string') v = JSON.parse(v);
      return Array.isArray(v) ? v : [];
    } catch(e) {
      return [];
    }
  }

  // ── GET — public ──
  if (req.method === 'GET') {
    try {
      const raw = await kvGet(RKEY);
      return res.status(200).json({ updates: parseUpdates(raw) });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load updates' });
    }
  }

  // ── POST — publish (admin) ──
  if (req.method === 'POST') {
    const { password, title, body, version, tags } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    try {
      const updates = parseUpdates(await kvGet(RKEY));
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

  // ── DELETE — remove by id (admin) ──
  if (req.method === 'DELETE') {
    const { password, id } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
    try {
      const updates = parseUpdates(await kvGet(RKEY));
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
