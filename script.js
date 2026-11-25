
"use strict";

// XAUUSD PRO - Market Analysis Engine

const CONFIG = {
  symbol: "XAUUSD",
  timeframe: "M15",
  indicators: {
    emaFast: 9,
    emaSlow: 21,
    emaTrend: 50,
    rsi: 14
  }
};

// Application state
const marketState = {
  price: null,
  signal: "WAIT",
  lastUpdated: null,
  dataProvider: "biquote"
};

// Calculate Exponential Moving Average
function calculateEMA(prices, period) {
  if (prices.length < period) return null;

  const multiplier = 2 / (period + 1);

  let ema = prices
    .slice(0, period)
    .reduce((sum, price) => sum + price, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Calculate Relative Strength Index
function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];

    if (change > 0) gains += change;
    else losses -= change;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];

    averageGain =
      (averageGain * (period - 1) + Math.max(change, 0)) / period;

    averageLoss =
      (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) return 100;

  const relativeStrength = averageGain / averageLoss;

  return 100 - (100 / (1 + relativeStrength));
}

// Generate market signal
function generateSignal(price, ema9, ema21, ema50, rsi) {
  if ([price, ema9, ema21, ema50, rsi].some(
    value => !Number.isFinite(value)
  )) {
    return "WAIT";
  }

  if (
    price > ema50 &&
    ema9 > ema21 &&
    rsi > 50 &&
    rsi < 70
  ) {
    return "BUY";
  }

  if (
    price < ema50 &&
    ema9 < ema21 &&
    rsi < 50 &&
    rsi > 30
  ) {
    return "SELL";
  }

  return "WAIT";
}

console.log("XAUUSD PRO analysis engine initialized.");
console.log("Timeframe:", CONFIG.timeframe);
console.log("Data provider:", marketState.dataProvider);
// BiQuote API endpoints
const QUOTE_API = "https://biquote.io/api/XAUUSD";
const CANDLES_API = "https://biquote.io/api/XAUUSD/ohlc?interval=15m&limit=100";

// Check whether the live quote is valid
function isValidQuote(quote) {
  return (
    quote &&
    quote.symbol === "XAUUSD" &&
    Number.isFinite(quote.mid) &&
    quote.mid > 0 &&
    quote.stale === false &&
    quote.marketState === "open" &&
    Number.isFinite(quote.quoteAgeSeconds) &&
    quote.quoteAgeSeconds <= 30
  );
}
async function fetchCandles() {
  const response = await fetch(CANDLES_API, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch XAUUSD candles");
  }

  const data = await response.json();

  if (
    data.symbol !== "XAUUSD" ||
    !Array.isArray(data.bars)
  ) {
    throw new Error("Invalid candle data");
  }

  return data.bars
    .filter(bar =>
      bar.isOpen === false &&
      Number.isFinite(bar.close) &&
      bar.close > 0 &&
      !Number.isNaN(Date.parse(bar.openTime))
    )
    .sort((a, b) =>
      Date.parse(a.openTime) - Date.parse(b.openTime)
    );
}
async function fetchLiveQuote() {
  const response = await fetch(QUOTE_API, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch live XAUUSD quote");
  }

  const quote = await response.json();

  if (quote && quote.marketState === "closed") {
    throw new Error("MARKET_CLOSED");
  }

  if (!isValidQuote(quote)) {
    throw new Error("Live quote is stale or invalid");
  }

  document.getElementById("marketStatus").textContent = "LIVE";

  return quote;
}
async function updateMarketData() {
  try {
    const [quote, candles] = await Promise.all([
      fetchLiveQuote(),
      fetchCandles()
    ]);

    if (candles.length < CONFIG.indicators.emaTrend) {
      throw new Error("Not enough completed candles");
    }

    const prices = candles.map(bar => bar.close);
prices.push(quote.mid);
    const price = quote.mid;

    const ema9 = calculateEMA(
      prices,
      CONFIG.indicators.emaFast
    );

    const ema21 = calculateEMA(
      prices,
      CONFIG.indicators.emaSlow
    );

    const ema50 = calculateEMA(
      prices,
      CONFIG.indicators.emaTrend
    );

    const rsi = calculateRSI(
      prices,
      CONFIG.indicators.rsi
    );

    const signal = generateSignal(
      price,
      ema9,
      ema21,
      ema50,
      rsi
    );

    marketState.price = price;
    marketState.signal = signal;
    marketState.lastUpdated = quote.timestamp;
    document.getElementById("lastUpdated").textContent =
  "Last updated: " +
  new Date(quote.timestamp).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi"
  });

    document.getElementById("price").textContent =
      price.toFixed(2);

    document.getElementById("ema9").textContent =
      ema9.toFixed(2);

    document.getElementById("ema21").textContent =
      ema21.toFixed(2);

    document.getElementById("ema50").textContent =
      ema50.toFixed(2);

    document.getElementById("rsi").textContent =
      rsi.toFixed(2);

    const signalElement = document.getElementById("signal");

    signalElement.textContent = signal;
    signalElement.className = "value " + signal.toLowerCase();

    console.log("XAUUSD market updated:", marketState);

  } catch (error) {
  marketState.signal = "WAIT";

  document.getElementById("signal").textContent = "WAIT";
  document.getElementById("signal").className = "value wait";

  const statusElement = document.getElementById("marketStatus");

  if (error.message === "MARKET_CLOSED") {
    statusElement.textContent = "CLOSED";
  } else {
    statusElement.textContent = "STALE";
  }

  console.error("Market update failed:", error.message);
}
}
// Start market data updates
updateMarketData();
setInterval(updateMarketData, 60000);
