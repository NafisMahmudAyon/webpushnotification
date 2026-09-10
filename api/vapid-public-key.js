/**
 * GET /api/vapid-public-key
 * Returns the VAPID public key so the frontend client can convert it to a Uint8Array
 * and call registration.pushManager.subscribe()
 */
module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      error: 'VAPID_PUBLIC_KEY is not configured in environment variables.'
    });
  }

  return res.status(200).json({
    publicKey
  });
};
