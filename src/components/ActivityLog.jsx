import React from 'react';
import { Terminal, Trash2 } from 'lucide-react';

export default function ActivityLog({ logs, onClear }) {
  return (
    <div className="glass-card log-card">
      <div className="card-title-row" style={{ marginBottom: '0.75rem' }}>
        <h3 className="card-title" style={{ fontSize: '0.9rem' }}>
          <Terminal size={16} color="#94a3b8" /> Real-Time Pipeline Activity
        </h3>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="btn-icon"
            title="Clear logs"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="log-terminal">
        {logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>No activity yet. Logs will appear here in real-time.</div>
        ) : (
          logs.map((item) => (
            <div key={item.id} className={`log-entry ${item.type}`}>
              <span className="log-time">[{item.time}]</span>
              {item.msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
