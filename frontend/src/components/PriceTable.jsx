import React from 'react';

function PriceTable({ prices }) {
  const priceArray = Object.values(prices);

  if (priceArray.length === 0) {
    return (
      <div className="no-data">
        Waiting for price data...
      </div>
    );
  }

  return (
    <div className="price-table-container">
      <table className="price-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Bid</th>
            <th>Ask</th>
            <th>24h Low</th>
            <th>24h High</th>
            <th>24h Change %</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {priceArray.map((price) => (
            <tr key={price.symbol}>
              <td className="symbol">{price.symbol}</td>
              <td className="price">{price.buy ? price.buy.toFixed(5) : '-'}</td>
              <td className="price">{price.sell ? price.sell.toFixed(5) : '-'}</td>
              <td className="price">{price.low_24h ? price.low_24h.toFixed(5) : '-'}</td>
              <td className="price">{price.high_24h ? price.high_24h.toFixed(5) : '-'}</td>
              <td className={`change ${price.change_24h >= 0 ? 'positive' : 'negative'}`}>
                {price.change_24h !== undefined ? price.change_24h.toFixed(2) + '%' : '-'}
              </td>
              <td className="timestamp">
                {price.timestamp ? new Date(price.timestamp).toLocaleTimeString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PriceTable;
