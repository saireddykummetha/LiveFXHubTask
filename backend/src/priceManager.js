const RollingWindow = require('./rollingWindow');

class PriceManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.prices = {};
    this.rollingWindows = {};
    this.lastTimestamps = {};
  }

  async processPriceUpdate(data) {
    const { symbol, buy, sell, timestamp } = data;

    if (!symbol || !buy || !sell || !timestamp) {
      return;
    }

    // Check for duplicate (out-of-order detection)
    const lastTimestamp = this.lastTimestamps[symbol] || 0;
    if (timestamp <= lastTimestamp) {
      return; // Ignore old/duplicate data
    }

    this.lastTimestamps[symbol] = timestamp;

    // Initialize rolling window if needed
    if (!this.rollingWindows[symbol]) {
      this.rollingWindows[symbol] = new RollingWindow(24 * 60 * 60 * 1000); // 24 hours
    }

    // Add price to rolling window
    const midPrice = (parseFloat(buy) + parseFloat(sell)) / 2;
    this.rollingWindows[symbol].addPrice(midPrice, timestamp);

    // Calculate 24h stats
    const stats = this.rollingWindows[symbol].getStats(timestamp);

    // Store price data
    this.prices[symbol] = {
      symbol,
      buy: parseFloat(buy),
      sell: parseFloat(sell),
      low_24h: stats.low,
      high_24h: stats.high,
      change_24h: stats.changePercent,
      timestamp,
      lastUpdate: Date.now()
    };

    // Persist state periodically
    if (Math.random() < 0.01) { // 1% chance to save state
      this.stateManager.saveState(this.prices, this.rollingWindows, this.lastTimestamps);
    }
  }

  getAllPrices() {
    return this.prices;
  }

  getPrice(symbol) {
    return this.prices[symbol];
  }

  async restoreState() {
    const state = await this.stateManager.loadState();
    if (state) {
      this.prices = state.prices || {};
      this.rollingWindows = state.rollingWindows || {};
      this.lastTimestamps = state.lastTimestamps || {};
      
      // Reconstruct RollingWindow objects
      for (const symbol in this.rollingWindows) {
        if (this.rollingWindows[symbol] && typeof this.rollingWindows[symbol] === 'object') {
          const rw = new RollingWindow(24 * 60 * 60 * 1000);
          if (this.rollingWindows[symbol].prices) {
            rw.prices = this.rollingWindows[symbol].prices;
          }
          this.rollingWindows[symbol] = rw;
        }
      }
      
      console.log('State restored successfully');
    }
  }
}

module.exports = PriceManager;
