import React from 'react';

function ConnectionStatus({ connected, latency }) {
  return (
    <div className="connection-status">
      <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot"></span>
        <span className="status-text">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      {connected && (
        <div className="latency">
          {latency}ms
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
