const axios = require('axios');
const { insertCoinsBatch } = require('./database');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min = 3000, max = 5000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomRetryDelay(min = 60000, max = 120000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchAllCoinsWithDelay() {
  const allCoins = [];
  const perPage = 250;
  const maxPerMinute = 45;
  const MAX_RETRIES = 3;
  let page = 1;
  let requestCount = 0;
  let startTime = Date.now();

  while (true) {
    if (requestCount >= maxPerMinute) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 60000) {
        const wait = 60000 - elapsed;
        console.log(`⏳ Batas 45 request tercapai. Tunggu ${Math.round(wait / 1000)} detik...`);
        await delay(wait);
      }
      requestCount = 0;
      startTime = Date.now();
    }

    console.log(`📦 Mengambil halaman pasar ${page}...`);

    let coins = null;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_asc',
            per_page: perPage,
            page,
            price_change_percentage: '1h,24h,7d,30d'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CryptoBot/1.0; +https://yourbot.com)'
          }
        });
        coins = res.data;
        break;
      } catch (err) {
        attempts++;
        console.warn(`⚠️ Gagal request halaman ${page} (percobaan ${attempts}): ${err.message}`);
        if (attempts < MAX_RETRIES) {
          const wait = getRandomRetryDelay();
          console.log(`🔁 Menunggu ${Math.round(wait / 1000)} detik sebelum mencoba ulang...`);
          await delay(wait);
        } else {
          console.error(`❌ Gagal mengambil data setelah ${MAX_RETRIES} kali. Stop.`);
          return allCoins;
        }
      }
    }

    if (!coins.length) break;

    const batch = coins.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      total_volume: coin.total_volume,
      circulating_supply: coin.circulating_supply,
      max_supply: coin.max_supply,
      price_change_percentage_1h: coin.price_change_percentage_1h_in_currency ?? 0,
      price_change_percentage_24h: coin.price_change_percentage_24h_in_currency ?? 0,
      price_change_percentage_7d: coin.price_change_percentage_7d_in_currency ?? 0,
      price_change_percentage_30d: coin.price_change_percentage_30d_in_currency ?? 0,
      ath: coin.ath,
      ath_change_percentage: coin.ath_change_percentage,
      source: "CoinGecko",
      genesis_date: null,
      category: null,
      hashing_algorithm: null,
      last_updated: coin.last_updated
    }));

    insertCoinsBatch(batch);
    allCoins.push(...batch);

    requestCount++;
    const delayTime = getRandomDelay();
    console.log(`⏱️ Delay ${Math.round(delayTime / 1000)} detik`);
    await delay(delayTime);
    page++;
  }

  console.log(`✅ Total coin tersimpan: ${allCoins.length}`);
  return allCoins;
}

module.exports = { fetchAllCoinsWithDelay };
