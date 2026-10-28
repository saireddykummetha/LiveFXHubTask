const fs = require('fs').promises;
const path = require('path');

class StateManager {
  constructor() {
    this.stateFilePath = path.join(__dirname, '../data/state.json');
    this.mongoDBAvailable = false;
    this.Price = null;

    // Only try to load MongoDB if MONGODB_URI is set
    if (process.env.MONGODB_URI) {
      try {
        this.Price = require('./models/Price');
        this.mongoDBAvailable = true;
      } catch (error) {
        console.log('MongoDB model not available, using file-only persistence');
      }
    } else {
      console.log('MongoDB not configured, using file-only persistence');
    }
  }

  async saveState(prices, rollingWindows, lastTimestamps) {
    try {
      // Save to file (fast, for rolling windows)
      const dataDir = path.dirname(this.stateFilePath);
      await fs.mkdir(dataDir, { recursive: true });

      const state = {
        prices,
        rollingWindows: this.serializeRollingWindows(rollingWindows),
        lastTimestamps,
        savedAt: Date.now()
      };

      await fs.writeFile(this.stateFilePath, JSON.stringify(state, null, 2));

      // Save latest prices to MongoDB (if available)
      if (this.mongoDBAvailable) {
        await this.saveToMongoDB(prices);
      }
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  async saveToMongoDB(prices) {
    if (!this.mongoDBAvailable || !this.Price) return;

    try {
      const bulkOps = Object.values(prices).map(price => ({
        updateOne: {
          filter: { symbol: price.symbol },
          update: {
            $set: {
              buy: price.buy,
              sell: price.sell,
              low_24h: price.low_24h,
              high_24h: price.high_24h,
              change_24h: price.change_24h,
              timestamp: price.timestamp,
              lastUpdate: price.lastUpdate
            }
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await this.Price.bulkWrite(bulkOps);
      }
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
    }
  }

  async loadState() {
    try {
      // Try to load from file first (for rolling windows)
      const data = await fs.readFile(this.stateFilePath, 'utf8');
      const state = JSON.parse(data);
      
      // Check if state is too old (older than 24 hours)
      const stateAge = Date.now() - state.savedAt;
      if (stateAge > 24 * 60 * 60 * 1000) {
        console.log('State is too old, starting fresh');
        return null;
      }

      // Load latest prices from MongoDB (if available)
      if (this.mongoDBAvailable && this.Price) {
        try {
          const mongoPrices = await this.Price.find({});
          const pricesObj = {};
          mongoPrices.forEach(doc => {
            pricesObj[doc.symbol] = {
              symbol: doc.symbol,
              buy: doc.buy,
              sell: doc.sell,
              low_24h: doc.low_24h,
              high_24h: doc.high_24h,
              change_24h: doc.change_24h,
              timestamp: doc.timestamp,
              lastUpdate: doc.lastUpdate
            };
          });

          // Merge MongoDB prices with file state
          state.prices = pricesObj;
        } catch (mongoError) {
          console.log('Could not load from MongoDB, using file state only');
        }
      }

      return state;
    } catch (error) {
      console.error('Error loading state:', error);
      
      // If file doesn't exist, try to load from MongoDB only
      if (this.mongoDBAvailable && this.Price) {
        try {
          const mongoPrices = await this.Price.find({});
          const pricesObj = {};
          mongoPrices.forEach(doc => {
            pricesObj[doc.symbol] = {
              symbol: doc.symbol,
              buy: doc.buy,
              sell: doc.sell,
              low_24h: doc.low_24h,
              high_24h: doc.high_24h,
              change_24h: doc.change_24h,
              timestamp: doc.timestamp,
              lastUpdate: doc.lastUpdate
            };
          });

          return {
            prices: pricesObj,
            rollingWindows: {},
            lastTimestamps: {},
            savedAt: Date.now()
          };
        } catch (mongoError) {
          console.error('Error loading from MongoDB:', mongoError);
        }
      }
      
      return null;
    }
  }

  serializeRollingWindows(rollingWindows) {
    const serialized = {};
    for (const symbol in rollingWindows) {
      if (rollingWindows[symbol] && typeof rollingWindows[symbol].toJSON === 'function') {
        serialized[symbol] = rollingWindows[symbol].toJSON();
      } else {
        serialized[symbol] = rollingWindows[symbol];
      }
    }
    return serialized;
  }
}

module.exports = StateManager;
