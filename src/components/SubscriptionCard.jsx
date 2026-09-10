import React, { useState } from 'react';
import { Bell, BellOff, Copy, Check, ShieldCheck, Laptop } from 'lucide-react';
import { urlBase64ToUint8Array } from '../utils/pushHelper';

export default function SubscriptionCard({
  permission,
  setPermission,
  isSubscribed,
  setIsSubscribed,
  endpoint,
  setEndpoint,
  addLog
}) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEndpoint = () => {
    if (!endpoint || endpoint === 'None') return;
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog('Endpoint copied to clipboard.', 'info');
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        // --- UNSUBSCRIBE FLOW ---
        addLog('Unsubscribing device from push service...', 'info');
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // 1. Remove from MongoDB Atlas via Vercel serverless API
          await fetch('/api/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          // 2. Unsubscribe browser
          await subscription.unsubscribe();
        }
        setIsSubscribed(false);
        setEndpoint('None');
        addLog('Successfully unsubscribed device.', 'success');
      } else {
        // --- SUBSCRIBE FLOW ---
        addLog('Requesting browser notification permissions...', 'info');
        const userPerm = await Notification.requestPermission();
        setPermission(userPerm);

        if (userPerm !== 'granted') {
          addLog('Permission was denied by the browser.', 'warn');
          return;
        }

        // 1. Fetch public VAPID key from /api/vapid-public-key
        addLog('Fetching VAPID key from /api/vapid-public-key...', 'info');
        const res = await fetch('/api/vapid-public-key');
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const { publicKey } = await res.json();

        // 2. Subscribe with PushManager
        addLog('Subscribing device via PushManager...', 'info');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // 3. Save in MongoDB Atlas
        addLog('Persisting subscription to MongoDB Atlas via /api/subscribe...', 'info');
        const saveRes = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });

        if (!saveRes.ok) {
          const errData = await saveRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to save to database');
        }

        setIsSubscribed(true);
        setEndpoint(subscription.endpoint);
        addLog('Push subscription saved to MongoDB Atlas!', 'success');
      }
    } catch (err) {
      console.error(err);
      addLog(`Subscription error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-title-row">
        <h2 className="card-title">
          <ShieldCheck size={20} color="#818cf8" /> Device Push Status
        </h2>
        <span className={`status-badge badge-${permission}`}>
          {permission.toUpperCase()}
        </span>
      </div>

      <div className="status-list">
        <div className="status-row">
          <span className="status-label">Push Pipeline:</span>
          <span className={`status-badge ${isSubscribed ? 'badge-active' : 'badge-inactive'}`}>
            {isSubscribed ? 'Active (Subscribed)' : 'Not Subscribed'}
          </span>
        </div>

        <div className="status-row">
          <span className="status-label">VAPID Protocol:</span>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>RFC 8292 Standard</span>
        </div>

        <div className="endpoint-container">
          <div className="status-label" style={{ fontSize: '0.78rem', marginBottom: '0.25rem' }}>
            Active Push Endpoint:
          </div>
          <div className="endpoint-box">
            <span>{endpoint || 'None'}</span>
            {isSubscribed && (
              <button
                className="btn-icon"
                onClick={handleCopyEndpoint}
                title="Copy endpoint"
                type="button"
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading || permission === 'denied'}
        className={`btn ${isSubscribed ? 'btn-danger' : 'btn-primary'}`}
        type="button"
      >
        {loading ? (
          'Processing...'
        ) : isSubscribed ? (
          <>
            <BellOff size={18} /> Disable Notifications
          </>
        ) : (
          <>
            <Bell size={18} /> Enable Notifications
          </>
        )}
      </button>
    </div>
  );
}
