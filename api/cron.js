const connectToDatabase = require('../lib/mongodb');
const Subscription = require('../models/Subscription');
const { sendNotificationBatch } = require('../lib/push');

/**
 * GET /api/cron
 * Automatically invoked on a schedule by Vercel Cron Jobs.
 * Validates the Authorization header against CRON_SECRET.
 */
module.exports = async function handler(req, res) {
  // Vercel Cron sends GET requests by default
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verify Vercel Cron Bearer token
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`;
    if (!authHeader || authHeader !== expectedAuth) {
      console.warn('[CRON] Unauthorized cron attempt blocked.');
      return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET token.' });
    }
  }

  console.log('[CRON] Vercel Cron schedule triggered successfully.');

  try {
    await connectToDatabase();

    const subscribers = await Subscription.find({});
    if (subscribers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cron executed: No active subscribers to notify.',
        timestamp: new Date().toISOString()
      });
    }

    const summary = await sendNotificationBatch(subscribers, {
      title: '⏰ Scheduled Update',
      body: `Automated push sync at ${new Date().toLocaleTimeString()} UTC. Your system is healthy!`,
      url: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'Scheduled broadcast sent successfully.',
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CRON ERROR]', error);
    return res.status(500).json({
      error: 'Cron job push execution failed.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
