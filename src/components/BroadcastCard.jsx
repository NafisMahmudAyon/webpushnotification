import React, { useState } from 'react';
import { Send, Eye, Sparkles, ExternalLink } from 'lucide-react';

export default function BroadcastCard({ addLog }) {
  const [title, setTitle] = useState('Hello from React & Vercel!');
  const [body, setBody] = useState('Real-time Web Push delivered seamlessly without third-party fees.');
  const [url, setUrl] = useState('/');
  const [secret, setSecret] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const headers = { 'Content-Type': 'application/json' };
    if (secret) {
      headers['Authorization'] = `Bearer ${secret}`;
    }

    try {
      addLog('Dispatching broadcast request to /api/send-notification...', 'info');
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, body, url })
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.summary);
        addLog(
          `Broadcast sent! Successful: ${data.summary.successful}, Failed: ${data.summary.failed}, Purged: ${data.summary.purged}`,
          'success'
        );
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      addLog(`Broadcast error: ${err.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="card-title-row">
        <h2 className="card-title">
          <Send size={20} color="#818cf8" /> Push Control Center
        </h2>
        <span style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={13} /> Live Preview
        </span>
      </div>

      {/* Realistic Native Notification Preview Card */}
      <div className="preview-box">
        <div className="preview-top">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3602/3602145.png"
            alt="Push Icon"
            className="preview-icon"
          />
          <span className="preview-app-name">Web Push Service</span>
          <span className="preview-time">Just now</span>
        </div>
        <div className="preview-title">{title || 'Notification Title'}</div>
        <div className="preview-body">{body || 'Notification message description...'}</div>
      </div>

      <form onSubmit={handleBroadcast}>
        <div className="form-group">
          <label className="form-label">Notification Title</label>
          <input
            type="text"
            className="input-field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Message Body</label>
          <input
            type="text"
            className="input-field"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target Destination URL (on click)</label>
          <input
            type="text"
            className="input-field"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/"
          />
        </div>

        <div className="form-group">
          <label className="form-label">CRON_SECRET / Bearer Token</label>
          <input
            type="password"
            className="input-field"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="From your .env (optional if testing locally)"
          />
        </div>

        <button type="submit" disabled={sending} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          {sending ? 'Dispatching...' : 'Dispatch Broadcast Push'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: '#10b981', textAlign: 'center' }}>
          ✅ Delivered to {result.successful} device(s) ({result.purged} purged)
        </div>
      )}
    </div>
  );
}
