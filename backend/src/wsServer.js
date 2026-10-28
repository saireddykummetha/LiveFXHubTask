const WebSocket = require('ws');
const msgpack = require('msgpack-lite');

class WSServer {
  constructor(port, priceManager) {
    this.port = port;
    this.priceManager = priceManager;
    this.clients = new Set();
    this.clientSubscriptions = new Map();
    
    this.server = new WebSocket.Server({ port });
    this.setupServer();
  }

  setupServer() {
    this.server.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);
      this.clientSubscriptions.set(ws, new Set());

      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
        this.clientSubscriptions.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('Client error:', error);
      });

      // Send initial prices for all symbols
      this.sendAllPrices(ws);
    });

    // Broadcast price updates every 100ms
    this.broadcastInterval = setInterval(() => {
      this.broadcastUpdates();
    }, 100);

    console.log(`WebSocket server listening on port ${this.port}`);
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());

      if (message.action === 'subscribe') {
        const symbols = message.symbols || [];
        const subscriptions = this.clientSubscriptions.get(ws);
        symbols.forEach(symbol => subscriptions.add(symbol));
        console.log(`Client subscribed to symbols:`, symbols);
      } else if (message.action === 'unsubscribe') {
        const symbols = message.symbols || [];
        const subscriptions = this.clientSubscriptions.get(ws);
        symbols.forEach(symbol => subscriptions.delete(symbol));
      } else if (message.action === 'subscribeAll') {
        const subscriptions = this.clientSubscriptions.get(ws);
        subscriptions.clear(); // Clear previous subscriptions
        // No specific symbols means subscribe to all
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  sendAllPrices(ws) {
    const prices = this.priceManager.getAllPrices();
    const optimized = this.optimizePayload(prices);
    this.sendOptimized(ws, optimized);
  }

  broadcastUpdates() {
    const prices = this.priceManager.getAllPrices();
    const optimized = this.optimizePayload(prices);

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendOptimized(client, optimized);
      }
    });
  }

  optimizePayload(prices) {
    // Convert to array and use delta encoding
    const priceArray = Object.values(prices);
    
    // Use MessagePack for binary encoding (reduces size significantly)
    return msgpack.encode(priceArray);
  }

  sendOptimized(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data, { binary: true });
    }
  }

  close() {
    clearInterval(this.broadcastInterval);
    this.server.close();
  }
}

module.exports = WSServer;
