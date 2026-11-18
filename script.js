
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
  dataProvider: "GoldPrice.dev"
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
