const connectToDatabase = require('../lib/mongodb');
const Subscription = require('../models/Subscription');
const { sendNotificationBatch } = require('../lib/push');

/**
 * POST /api/send-notification
 * Manual push notification dispatcher.
 * Body: { title, body, url, icon, image, endpoint }
 * Protected via Authorization: Bearer <CRON_SECRET> or <API_SECRET_KEY>
 */
module.exports = async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Security Check: Protect with secret bearer token or API key
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];
  const expectedSecret = process.env.CRON_SECRET || process.env.API_SECRET_KEY;

  if (expectedSecret) {
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    const providedToken = bearerToken || apiKeyHeader;

    if (!providedToken || providedToken !== expectedSecret) {
      return res.status(401).json({
        error: 'Unauthorized. Valid Bearer token or x-api-key required.'
      });
    }
  }

  try {
    await connectToDatabase();

    const { title, body, url, icon, badge, image, endpoint } = req.body || {};

    let targetSubscriptions = [];

    if (endpoint) {
      // Target a specific subscriber endpoint
      const singleSub = await Subscription.findOne({ endpoint });
      if (!singleSub) {
        return res.status(404).json({
          error: 'Specified subscriber endpoint not found in database.'
        });
      }
      targetSubscriptions = [singleSub];
    } else {
      // Target all active subscribers
      targetSubscriptions = await Subscription.find({});
    }

    if (targetSubscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No subscribers registered yet.',
        summary: { totalTargeted: 0, successful: 0, failed: 0, purged: 0 }
      });
    }

    // Dispatch batch and automatically purge 410/404 dead subscriptions
    const summary = await sendNotificationBatch(targetSubscriptions, {
      title,
      body,
      url,
      icon,
      badge,
      image
    });

    return res.status(200).json({
      success: true,
      message: 'Push notification dispatch completed.',
      summary
    });
  } catch (error) {
    console.error('Error in /api/send-notification:', error);
    return res.status(500).json({
      error: 'Failed to dispatch push notification.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
