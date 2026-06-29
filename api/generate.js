// api/generate.js — generates a new PX- key and stores it in Redis
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, name, plan } = req.body;

  // Simple admin password check — change this to whatever you want
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  // Generate PX-XXXX-XXXX-XXXX
  function seg() {
    return Math.random().toString(36).toUpperCase().slice(2, 6).padEnd(4, '0');
  }
  const key = `PX-${seg()}-${seg()}-${seg()}`;

  const payload = JSON.stringify({
    name: name || 'User',
    plan: plan || 'Pro',
    created: new Date().toISOString()
  });

  try {
    await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: payload })
    });
    return res.status(200).json({ key });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to store key' });
  }
}
