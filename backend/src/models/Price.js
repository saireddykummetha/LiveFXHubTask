const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  buy: {
    type: Number,
    required: true
  },
  sell: {
    type: Number,
    required: true
  },
  low_24h: {
    type: Number,
    default: 0
  },
  high_24h: {
    type: Number,
    default: 0
  },
  change_24h: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Number,
    required: true
  },
  lastUpdate: {
    type: Number,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries (symbol is already indexed due to unique: true)
priceSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Price', priceSchema);
