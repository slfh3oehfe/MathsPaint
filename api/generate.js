export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, name, plan } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  function seg() {
    return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4).padEnd(4,'0');
  }
  const key = `PX-${seg()}-${seg()}-${seg()}`;

  const payload = JSON.stringify({
    name: (name || 'User').trim(),
    plan: (plan || 'Pro').trim(),
    created: new Date().toISOString()
  });

  try {
    // Upstash REST: GET /set/KEY/VALUE (value must be URL-encoded)
    const r = await fetch(
      `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(payload)}`,
      { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } }
    );
    const data = await r.json();
    if (data.result === 'OK') {
      return res.status(200).json({ key });
    }
    return res.status(500).json({ error: 'Failed to store key', detail: data });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
