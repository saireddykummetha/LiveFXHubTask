import React, { useState, useEffect } from 'react';
import msgpack from 'msgpack-lite';
import PriceTable from './components/PriceTable';
import ConnectionStatus from './components/ConnectionStatus';

function App() {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:3011' 
      : `ws://${window.location.hostname}:3011`;
    const ws = new WebSocket(wsUrl);

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
      setLoading(false);
      
      // Subscribe to all symbols
      ws.send(JSON.stringify({ action: 'subscribeAll' }));
    };

    ws.onmessage = (event) => {
      const startTime = performance.now();
      
      try {
        // Decode MessagePack binary data
        const decodedPrices = msgpack.decode(new Uint8Array(event.data));
        
        // Convert array back to object
        const pricesObj = {};
        decodedPrices.forEach(price => {
          if (price && price.symbol) {
            pricesObj[price.symbol] = price;
          }
        });
        
        setPrices(pricesObj);
        setLoading(false);
        
        // Calculate latency
        const endTime = performance.now();
        setLatency(Math.round(endTime - startTime));
      } catch (error) {
        console.error('Error decoding message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>LiveFXHub - Real-Time Pricing Engine</h1>
        <ConnectionStatus connected={connected} latency={latency} />
      </header>
      <main className="main">
        {loading ? (
          <div className="loading"></div>
        ) : (
          <PriceTable prices={prices} />
        )}
      </main>
    </div>
  );
}

export default App;
