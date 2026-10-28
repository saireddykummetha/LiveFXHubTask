require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const PriceManager = require('./priceManager');
const StateManager = require('./stateManager');
const WSServer = require('./wsServer');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Initialize managers
const stateManager = new StateManager();
const priceManager = new PriceManager(stateManager);
let wsServer = null;

// MongoDB connection (optional - app works without it)
if (process.env.MONGODB_URI) {
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      // Restore state on startup
      try {
        await priceManager.restoreState();
      } catch (err) {
        console.log('No previous state found, starting fresh');
      }
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Continuing without MongoDB (using file-only persistence)');
    });
} else {
  console.log('MongoDB not configured, using file-only persistence');
}

// Start the server immediately regardless of MongoDB status
console.log('Starting servers...');

// LiveFXHub WebSocket connection
const SYMBOLS = [
  "AUDUSD", "AUDCAD", "AUDCHF", "AUDJPY", "AUDNZD", "AUDSGD",
  "CADCHF", "CADJPY", "CHFJPY", "CHFSGD",
  "EURAUD", "EURCAD", "EURCHF", "EURGBP", "EURJPY", "EURNZD", "EURUSD",
  "GBPAUD", "GBPCAD", "GBPCHF", "GBPJPY", "GBPNZD", "GBPUSD",
  "NZDCAD", "NZDCHF", "NZDJPY", "NZDUSD",
  "USDCAD", "USDCHF", "USDCNH", "USDJPY", "USDMXN", "USDNOK", "USDPLN", "USDSEK", "USDSGD", "USDTRY", "USDZAR",
  "EURTRY", "GBPTRY",
  "NOKJPY", "SEKJPY", "SGDJPY", "ZARJPY",
  "XAUUSD", "XAGUSD",
  "BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOGUSD", "DOTUSD", "LTCUSD",
  "BCHUSD", "XLMUSD", "TRXUSD", "UNIUSD", "FILUSD", "AVXUSD"
];

function connectToLiveFXHub() {
  const ws = new WebSocket(process.env.LIVEFXHUB_WS_URL);

  ws.on('open', () => {
    console.log('Connected to LiveFXHub WebSocket');

    // Authenticate
    const authMessage = {
      action: 'auth',
      api_key: process.env.API_KEY,
      secret: process.env.SECRET_KEY
    };
    console.log('Sending auth message:', JSON.stringify(authMessage));
    ws.send(JSON.stringify(authMessage));
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', JSON.stringify(message).substring(0, 200));

      if (message.status === 'success' && message.action === 'auth') {
        console.log('Authentication successful');
        
        // Subscribe to market prices
        const subscribeMessage = {
          action: 'subscribeMarketPrice',
          symbols: SYMBOLS
        };
        ws.send(JSON.stringify(subscribeMessage));
      } else if (message.status === 'error') {
        console.error('Authentication error:', message);
      } else if (message.status === 'success' && message.action === 'subscribeMarketPrice') {
        console.log('Successfully subscribed to market prices');
      } else if (message.symbol) {
        // Process market data
        await priceManager.processPriceUpdate(message);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('LiveFXHub WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('LiveFXHub WebSocket closed, reconnecting in 5 seconds...');
    setTimeout(connectToLiveFXHub, 5000);
  });

  return ws;
}

// Demo mode for testing without valid API credentials
function startDemoMode() {
  const SYMBOLS = [
    "AUDUSD", "AUDCAD", "AUDCHF", "AUDJPY", "AUDNZD", "AUDSGD",
    "CADCHF", "CADJPY", "CHFJPY", "CHFSGD",
    "EURAUD", "EURCAD", "EURCHF", "EURGBP", "EURJPY", "EURNZD", "EURUSD",
    "GBPAUD", "GBPCAD", "GBPCHF", "GBPJPY", "GBPNZD", "GBPUSD",
    "NZDCAD", "NZDCHF", "NZDJPY", "NZDUSD",
    "USDCAD", "USDCHF", "USDCNH", "USDJPY", "USDMXN", "USDNOK", "USDPLN", "USDSEK", "USDSGD", "USDTRY", "USDZAR",
    "EURTRY", "GBPTRY",
    "NOKJPY", "SEKJPY", "SGDJPY", "ZARJPY",
    "XAUUSD", "XAGUSD",
    "BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOGUSD", "DOTUSD", "LTCUSD",
    "BCHUSD", "XLMUSD", "TRXUSD", "UNIUSD", "FILUSD", "AVXUSD"
  ];

  // Base prices for demo
  const basePrices = {
    AUDUSD: 0.6543, EURUSD: 1.0876, GBPUSD: 1.2654, USDJPY: 149.52,
    BTCUSD: 43250.50, ETHUSD: 2280.75, XAUUSD: 2345.60, XAGUSD: 28.45
  };

  const prices = {};

  // Initialize prices
  SYMBOLS.forEach(symbol => {
    if (basePrices[symbol]) {
      prices[symbol] = basePrices[symbol];
    } else {
      // Generate random base price for other symbols
      prices[symbol] = Math.random() * 100 + 0.5;
    }
  });

  // Generate price updates every 500ms
  setInterval(() => {
    SYMBOLS.forEach(symbol => {
      const basePrice = prices[symbol];
      const change = (Math.random() - 0.5) * 0.001; // Small random change
      const newPrice = basePrice * (1 + change);
      prices[symbol] = newPrice;

      const spread = newPrice * 0.0002; // Small spread
      const buy = newPrice - spread / 2;
      const sell = newPrice + spread / 2;

      const message = {
        symbol,
        buy,
        sell,
        timestamp: Date.now()
      };

      priceManager.processPriceUpdate(message);
    });
  }, 500);

  console.log('Demo mode started - generating simulated price data for', SYMBOLS.length, 'symbols');
}

// Start LiveFXHub connection or demo mode
if (process.env.DEMO_MODE === 'true') {
  console.log('Running in DEMO MODE - generating simulated price data');
  startDemoMode();
} else {
  connectToLiveFXHub();
}

// Start Express server
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/prices', async (req, res) => {
  try {
    const prices = await priceManager.getAllPrices();
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  
  // Initialize WebSocket server after HTTP server starts
  wsServer = new WSServer(WS_PORT, priceManager);
  console.log(`WebSocket server running on port ${WS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await stateManager.saveState();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await stateManager.saveState();
  process.exit(0);
});
