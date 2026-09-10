const webpush = require('web-push');
const Subscription = require('../models/Subscription');

// Configure VAPID details once
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Dispatches web push notifications to a list of subscriptions and removes dead/expired ones.
 * @param {Array} subscriptions - List of Mongoose subscription documents
 * @param {Object} payloadObject - { title, body, url, icon, badge, image }
 * @returns {Promise<Object>} Delivery summary
 */
async function sendNotificationBatch(subscriptions, payloadObject) {
  if (!subscriptions || subscriptions.length === 0) {
    return {
      totalTargeted: 0,
      successful: 0,
      failed: 0,
      purged: 0
    };
  }

  const payload = JSON.stringify({
    title: payloadObject.title || 'Web Push Alert',
    body: payloadObject.body || 'You have received a new notification.',
    url: payloadObject.url || '/',
    icon: payloadObject.icon || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    badge: payloadObject.badge || 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
    image: payloadObject.image || null,
    timestamp: Date.now()
  });

  let successful = 0;
  let failed = 0;
  const deadEndpoints = [];

  const sendPromises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      successful++;
    } catch (err) {
      failed++;
      // Push services (FCM, Apple, Mozilla) return 410 (Gone) or 404 (Not Found) for revoked/expired subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        deadEndpoints.push(sub.endpoint);
        console.warn(`[DEAD SUB] Status ${err.statusCode} on endpoint: ${sub.endpoint.slice(0, 45)}...`);
      } else {
        console.error(`[PUSH ERROR] ${sub.endpoint.slice(0, 45)}:`, err.message);
      }
    }
  });

  await Promise.allSettled(sendPromises);

  // Automatically delete stale subscriptions from MongoDB
  let purgedCount = 0;
  if (deadEndpoints.length > 0) {
    const deleteResult = await Subscription.deleteMany({ endpoint: { $in: deadEndpoints } });
    purgedCount = deleteResult.deletedCount;
    console.log(`[CLEANUP] Automatically purged ${purgedCount} dead subscription(s) from MongoDB.`);
  }

  return {
    totalTargeted: subscriptions.length,
    successful,
    failed,
    purged: purgedCount
  };
}

module.exports = {
  webpush,
  sendNotificationBatch
};
