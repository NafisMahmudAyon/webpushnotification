import React, { useState, useEffect } from 'react';
import { Bell, Radio, Database, Cloud } from 'lucide-react';
import SubscriptionCard from './components/SubscriptionCard';
import BroadcastCard from './components/BroadcastCard';
import ActivityLog from './components/ActivityLog';

export default function App() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [endpoint, setEndpoint] = useState('None');
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    const newEntry = { id: Date.now() + Math.random(), time, msg, type };
    setLogs((prev) => [newEntry, ...prev]);
    console.log(`[PushLog] ${msg}`);
  };

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Register root service worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async (registration) => {
          addLog('Service Worker registered with root scope (/).', 'success');
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            setIsSubscribed(true);
            setEndpoint(subscription.endpoint);
            addLog('Existing active push subscription detected on device.', 'info');
          } else {
            setIsSubscribed(false);
            setEndpoint('None');
            addLog('No active push subscription found on device.', 'info');
          }
        })
        .catch((err) => {
          console.error(err);
          addLog(`Service Worker registration error: ${err.message}`, 'error');
        });
    } else {
      addLog('Push Notifications or Service Workers not supported in this browser.', 'error');
    }
  }, []);

  return (
    <main className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-badge">
          <Radio size={12} /> Live Production Pipeline
        </div>
        <h1 className="app-title">Web Push Notification</h1>
        <p className="app-subtitle">
          All-in-One React Dashboard powered by Vercel Serverless Functions, MongoDB Atlas, and native VAPID Web Push protocols.
        </p>
      </header>

      {/* Main Two-Column Grid */}
      <div className="dashboard-grid">
        <SubscriptionCard
          permission={permission}
          setPermission={setPermission}
          isSubscribed={isSubscribed}
          setIsSubscribed={setIsSubscribed}
          endpoint={endpoint}
          setEndpoint={setEndpoint}
          addLog={addLog}
        />

        <BroadcastCard addLog={addLog} />
      </div>

      {/* Real-time Activity Log */}
      <ActivityLog logs={logs} onClear={() => setLogs([])} />
    </main>
  );
}
