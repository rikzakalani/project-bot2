require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { fetchAllCoinsWithDelay } = require('./coingecko');
const sqlite3 = require('sqlite3').verbose();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const message = `
👋 *Selamat datang di CryptoBot!*

Gunakan perintah:
/update - Mengambil dan menyimpan data pasar crypto terbaru dari CoinGecko.
/uptrend - Melihat koin yang sedang naik daun berdasarkan data pasar.
/topath - Melihat koin yang sedang naik ath berdasarkan data pasar.

📡 Sumber data: CoinGecko
  `;
  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// /update
bot.onText(/\/update/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "⏳ Mengambil data dari CoinGecko...");
  try {
    const coins = await fetchAllCoinsWithDelay();
    await bot.sendMessage(chatId, `✅ Berhasil menyimpan ${coins.length} koin ke database.`);
  } catch (err) {
    console.error(err);
    await bot.sendMessage(chatId, "❌ Gagal mengambil atau menyimpan data.");
  }
});

// /uptrend
bot.onText(/\/uptrend/, async (msg) => {
  const chatId = msg.chat.id;

  const db = new sqlite3.Database('./coins.db');
  const query = `
    SELECT name, symbol, current_price, total_volume,
           price_change_percentage_1h,
           price_change_percentage_24h,
           ath, ath_change_percentage
    FROM coins
    WHERE price_change_percentage_1h > 0
      AND price_change_percentage_24h > 0
      AND ath_change_percentage > -15
    ORDER BY price_change_percentage_24h DESC
    LIMIT 30
  `;

  db.all(query, [], async (err, rows) => {
    if (err) {
      console.error(err);
      return bot.sendMessage(chatId, "❌ Gagal mengambil data uptrend.");
    }

    if (!rows.length) {
      return bot.sendMessage(chatId, "⚠️ Tidak ada koin yang memenuhi kriteria uptrend.");
    }

    let text = `📈 *Koin Naik Daun*\n(1h & 24h positif, ATH gap < 15%)\n\n`;

    rows.forEach((coin, i) => {
      text += `${i + 1}. *${coin.name}* (${coin.symbol})\n`;
      text += `💰 $${coin.current_price.toLocaleString()} | Vol: $${coin.total_volume.toLocaleString()}\n`;
      text += `⏱️ 1h: +${coin.price_change_percentage_1h.toFixed(2)}% | 24h: +${coin.price_change_percentage_24h.toFixed(2)}%\n`;
      text += `🏔️ ATH: $${coin.ath.toLocaleString()} (${coin.ath_change_percentage.toFixed(2)}%)\n\n`;
    });

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });
});

bot.onText(/\/topath/, async (msg) => {
  const chatId = msg.chat.id;

  const db = new sqlite3.Database('./coins.db');
  const query = `
    SELECT name, symbol, current_price, market_cap, total_volume,
           circulating_supply, max_supply,
           price_change_percentage_1h,
           price_change_percentage_24h,
           price_change_percentage_7d,
           price_change_percentage_30d,
           ath, ath_change_percentage
    FROM coins
    WHERE ath_change_percentage > 0
    ORDER BY ath_change_percentage DESC
    LIMIT 30
  `;

  db.all(query, [], async (err, rows) => {
    if (err) {
      console.error(err);
      return bot.sendMessage(chatId, "❌ Gagal mengambil data dari database.");
    }

    if (!rows.length) {
      return bot.sendMessage(chatId, "⚠️ Tidak ada koin yang sudah melewati ATH.");
    }

    let text = `🚀 *Koin Melewati ATH!*\n(ATH change positif)\n\n`;

    rows.forEach((coin, i) => {
      text += `${i + 1}. *${coin.name}* (${coin.symbol})\n`;
      text += `💰 Harga: $${coin.current_price.toLocaleString()}\n`;
      text += `💹 Market Cap: $${coin.market_cap?.toLocaleString() || 'N/A'} | Vol: $${coin.total_volume?.toLocaleString() || 'N/A'}\n`;
      text += `🪙 Supply: ${coin.circulating_supply?.toLocaleString() || 'N/A'} / ${coin.max_supply?.toLocaleString() || '∞'}\n`;
      text += `📊 1h: ${coin.price_change_percentage_1h?.toFixed(2)}% | 24h: ${coin.price_change_percentage_24h?.toFixed(2)}%\n`;
      text += `📈 7d: ${coin.price_change_percentage_7d?.toFixed(2)}% | 30d: ${coin.price_change_percentage_30d?.toFixed(2)}%\n`;
      text += `🏔️ ATH: $${coin.ath?.toLocaleString() || 'N/A'} (+${coin.ath_change_percentage.toFixed(2)}%)\n\n`;
    });

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  });
});
