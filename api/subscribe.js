const connectToDatabase = require('../lib/mongodb');
const Subscription = require('../models/Subscription');

/**
 * POST /api/subscribe
 * Accepts a browser PushSubscription object and upserts it into MongoDB Atlas.
 * Also handles DELETE for unsubscribing devices.
 */
module.exports = async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    // Handle Unsubscribe Request
    if (req.method === 'DELETE' || (req.method === 'POST' && req.body && req.body.action === 'unsubscribe')) {
      const endpoint = req.body && req.body.endpoint;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required to unsubscribe.' });
      }

      const deleteResult = await Subscription.deleteOne({ endpoint });
      return res.status(200).json({
        success: true,
        message: 'Subscription successfully removed.',
        deletedCount: deleteResult.deletedCount
      });
    }

    // Handle Subscribe Request (POST)
    if (req.method === 'POST') {
      const { endpoint, expirationTime, keys } = req.body || {};

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return res.status(400).json({
          error: 'Invalid PushSubscription payload. Requires endpoint and keys (p256dh, auth).'
        });
      }

      // Upsert: update existing endpoint if already present, or insert new record
      const subscription = await Subscription.findOneAndUpdate(
        { endpoint },
        {
          endpoint,
          expirationTime: expirationTime || null,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(201).json({
        success: true,
        message: 'Push subscription successfully saved in MongoDB Atlas.',
        subscriptionId: subscription._id
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Error in /api/subscribe:', error);
    return res.status(500).json({
      error: 'Database connection or operation failed.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
