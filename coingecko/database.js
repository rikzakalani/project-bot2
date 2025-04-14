const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./coins.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS coins (
    id TEXT PRIMARY KEY,
    symbol TEXT,
    name TEXT,
    current_price REAL,
    market_cap REAL,
    total_volume REAL,
    circulating_supply REAL,
    max_supply REAL,
    price_change_percentage_1h REAL,
    price_change_percentage_24h REAL,
    price_change_percentage_7d REAL,
    price_change_percentage_30d REAL,
    ath REAL,
    ath_change_percentage REAL,
    source TEXT,
    genesis_date TEXT,
    category TEXT,
    hashing_algorithm TEXT,
    last_updated TEXT
  )`);
});

async function insertCoin(data) {
  const stmt = db.prepare(`INSERT OR REPLACE INTO coins (
    id, symbol, name, current_price, market_cap, total_volume, circulating_supply, max_supply,
    price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d, price_change_percentage_30d,
    ath, ath_change_percentage, source, genesis_date, category, hashing_algorithm, last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run([
    data.id,
    data.symbol,
    data.name,
    data.current_price,
    data.market_cap,
    data.total_volume,
    data.circulating_supply,
    data.max_supply,
    data.price_change_percentage_1h,
    data.price_change_percentage_24h,
    data.price_change_percentage_7d,
    data.price_change_percentage_30d,
    data.ath,
    data.ath_change_percentage,
    data.source,
    data.genesis_date,
    data.category,
    data.hashing_algorithm,
    data.last_updated
  ]);

  stmt.finalize();
}

function insertCoinsBatch(coins) {
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare(`INSERT OR REPLACE INTO coins (
      id, symbol, name, current_price, market_cap, total_volume, circulating_supply, max_supply,
      price_change_percentage_1h, price_change_percentage_24h, price_change_percentage_7d, price_change_percentage_30d,
      ath, ath_change_percentage, source, genesis_date, category, hashing_algorithm, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const data of coins) {
      stmt.run([
        data.id,
        data.symbol,
        data.name,
        data.current_price,
        data.market_cap,
        data.total_volume,
        data.circulating_supply,
        data.max_supply,
        data.price_change_percentage_1h,
        data.price_change_percentage_24h,
        data.price_change_percentage_7d,
        data.price_change_percentage_30d,
        data.ath,
        data.ath_change_percentage,
        data.source,
        data.genesis_date,
        data.category,
        data.hashing_algorithm,
        data.last_updated
      ]);
    }

    stmt.finalize();
    db.run("COMMIT");
  });
}

module.exports = {
  insertCoin,
  insertCoinsBatch
};
