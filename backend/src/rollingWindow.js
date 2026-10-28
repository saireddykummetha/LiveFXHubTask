class RollingWindow {
  constructor(windowSize) {
    this.windowSize = windowSize; // in milliseconds
    this.prices = []; // Array of { price, timestamp }
  }

  addPrice(price, timestamp) {
    // Add new price
    this.prices.push({ price, timestamp });

    // Remove prices outside the window
    const cutoff = timestamp - this.windowSize;
    this.prices = this.prices.filter(p => p.timestamp > cutoff);
  }

  getStats(currentTimestamp) {
    if (this.prices.length === 0) {
      return { low: 0, high: 0, changePercent: 0 };
    }

    const cutoff = currentTimestamp - this.windowSize;
    const windowPrices = this.prices.filter(p => p.timestamp > cutoff);

    if (windowPrices.length === 0) {
      return { low: 0, high: 0, changePercent: 0 };
    }

    const prices = windowPrices.map(p => p.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    return { low, high, changePercent };
  }

  toJSON() {
    return {
      windowSize: this.windowSize,
      prices: this.prices
    };
  }
}

module.exports = RollingWindow;
