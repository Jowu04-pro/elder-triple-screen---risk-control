import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI if key is present
const aiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (aiApiKey && aiApiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({ apiKey: aiApiKey });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Indicator math helpers
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  if (data.length === 0) return ema;

  // Initial seed with SMA
  let sum = 0;
  const seedPeriod = Math.min(period, data.length);
  for (let i = 0; i < seedPeriod; i++) {
    sum += data[i];
  }
  let currentEma = sum / seedPeriod;
  ema.push(currentEma);

  for (let i = 1; i < data.length; i++) {
    if (i < seedPeriod) {
      ema.push(currentEma);
    } else {
      currentEma = data[i] * k + currentEma * (1 - k);
      ema.push(currentEma);
    }
  }
  return ema;
}

function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i]);
    } else {
      const window = data.slice(i - period + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / period;
      sma.push(avg);
    }
  }
  return sma;
}

function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const fastEMA = calculateEMA(closes, fast);
  const slowEMA = calculateEMA(closes, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }
  const signalLine = calculateEMA(macdLine, signal);
  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  return { macdLine, signalLine, histogram };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod = 14, kSmooth = 3, dPeriod = 3) {
  const rawK: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(50);
      continue;
    }
    const highWindow = highs.slice(i - kPeriod + 1, i + 1);
    const lowWindow = lows.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...highWindow);
    const lowestLow = Math.min(...lowWindow);
    const denom = highestHigh - lowestLow;
    const k = denom === 0 ? 50 : ((closes[i] - lowestLow) / denom) * 100;
    rawK.push(k);
  }
  const slowK = calculateSMA(rawK, kSmooth);
  const slowD = calculateSMA(slowK, dPeriod);
  return { slowK, slowD };
}

function calculateForceIndex(closes: number[], volumes: number[], period = 2) {
  const rawFI: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const fi = volumes[i] * (closes[i] - closes[i - 1]);
    rawFI.push(fi);
  }
  return calculateEMA(rawFI, period);
}

// Resample daily bars to weekly bars (Screen 1 requires weekly timeframe)
function aggregateWeeklyBars(dailyBars: PriceBar[]): PriceBar[] {
  if (dailyBars.length === 0) return [];
  const weeklyMap = new Map<string, PriceBar>();

  for (const bar of dailyBars) {
    const d = new Date(bar.date);
    // Find Monday of the current week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        date: weekKey,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });
    } else {
      const current = weeklyMap.get(weekKey)!;
      current.high = Math.max(current.high, bar.high);
      current.low = Math.min(current.low, bar.low);
      current.close = bar.close;
      current.volume += bar.volume;
    }
  }

  return Array.from(weeklyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Normalize ticker (e.g. 2330 -> 2330.TW, AAPL -> AAPL)
function normalizeTicker(raw: string): { symbol: string; market: 'TW' | 'US'; clean: string } {
  let sym = raw.trim().toUpperCase();
  // Check if it's pure numeric (Taiwan stock)
  if (/^\d{4,6}$/.test(sym)) {
    return { symbol: `${sym}.TW`, market: 'TW', clean: sym };
  }
  if (sym.endsWith('.TW') || sym.endsWith('.TWO')) {
    return { symbol: sym, market: 'TW', clean: sym.split('.')[0] };
  }
  return { symbol: sym, market: 'US', clean: sym };
}

// Synthetic realistic generator in case Yahoo is blocked / offline
function generateMockBars(symbol: string, days = 150): PriceBar[] {
  let basePrice = 100;
  if (symbol.includes('2330')) basePrice = 980;
  else if (symbol.includes('2454')) basePrice = 1250;
  else if (symbol.includes('0050')) basePrice = 180;
  else if (symbol.includes('NVDA')) basePrice = 125;
  else if (symbol.includes('AAPL')) basePrice = 225;
  else if (symbol.includes('TSLA')) basePrice = 210;
  else {
    // Generate deterministic base from char codes
    const sum = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    basePrice = 50 + (sum % 300);
  }

  const bars: PriceBar[] = [];
  const now = new Date();
  let currentPrice = basePrice * 0.85;

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().slice(0, 10);
    const trendCycle = Math.sin((days - i) / 14);
    const changePct = trendCycle * 0.012 + (Math.random() - 0.48) * 0.025;
    const open = currentPrice;
    currentPrice = Math.max(1, currentPrice * (1 + changePct));
    const high = Math.max(open, currentPrice) * (1 + Math.random() * 0.015);
    const low = Math.min(open, currentPrice) * (1 - Math.random() * 0.015);
    const volume = Math.floor(100000 + Math.random() * 800000);

    bars.push({
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(currentPrice.toFixed(2)),
      volume,
    });
  }

  return bars;
}

// Fetch historical bars from Yahoo Finance
async function fetchYahooBars(symbol: string): Promise<PriceBar[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      // If .TW fails, try .TWO for OTC Taiwan stocks
      if (symbol.endsWith('.TW')) {
        const otcSymbol = symbol.replace('.TW', '.TWO');
        const otcRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(otcSymbol)}?interval=1d&range=1y`, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });
        if (otcRes.ok) {
          const otcData = await otcRes.json();
          return parseYahooChart(otcData);
        }
      }
      throw new Error(`Yahoo Finance returned status ${res.status}`);
    }

    const data = await res.json();
    return parseYahooChart(data);
  } catch (err: any) {
    console.warn(`Falling back to generated historical bars for ${symbol}:`, err.message);
    return generateMockBars(symbol);
  }
}

function parseYahooChart(data: any): PriceBar[] {
  const result = data.chart?.result?.[0];
  if (!result || !result.timestamp) throw new Error('No chart data found');

  const timestamps: number[] = result.timestamp;
  const quote = result.indicators.quote[0];
  const opens = quote.open;
  const highs = quote.high;
  const lows = quote.low;
  const closes = quote.close;
  const volumes = quote.volume;

  const bars: PriceBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null || opens[i] == null || highs[i] == null || lows[i] == null) continue;
    const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    bars.push({
      date,
      open: Number(opens[i].toFixed(2)),
      high: Number(highs[i].toFixed(2)),
      low: Number(lows[i].toFixed(2)),
      close: Number(closes[i].toFixed(2)),
      volume: volumes[i] || 0,
    });
  }

  return bars.length > 0 ? bars : generateMockBars('DEFAULT');
}

// Analyze single stock using Alexander Elder's Triple Screen System
function analyzeTripleScreen(symbol: string, dailyBars: PriceBar[], market: 'TW' | 'US') {
  if (dailyBars.length < 30) {
    throw new Error('Not enough historical bars for indicator calculation');
  }

  // 1. Screen 1: Market Tide (大潮) - Weekly MACD Histogram Slope
  const weeklyBars = aggregateWeeklyBars(dailyBars);
  const weeklyCloses = weeklyBars.map(b => b.close);
  const weeklyMacd = calculateMACD(weeklyCloses, 12, 26, 9);
  const weeklyEma26 = calculateEMA(weeklyCloses, 26);
  const weeklyEma13 = calculateEMA(weeklyCloses, 13);

  const curWIdx = weeklyBars.length - 1;
  const prevWIdx = Math.max(0, curWIdx - 1);
  const curWeeklyHist = weeklyMacd.histogram[curWIdx] ?? 0;
  const prevWeeklyHist = weeklyMacd.histogram[prevWIdx] ?? 0;
  const histSlope = curWeeklyHist - prevWeeklyHist;
  const curWeeklyPrice = weeklyCloses[curWIdx];
  const curWeeklyEma26 = weeklyEma26[curWIdx];

  // Tide status
  let tide: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let tideScore = 0; // -2 to +2
  if (histSlope > 0) tideScore += 1;
  else if (histSlope < 0) tideScore -= 1;
  if (curWeeklyPrice > curWeeklyEma26) tideScore += 1;
  else if (curWeeklyPrice < curWeeklyEma26) tideScore -= 1;

  if (tideScore >= 1) tide = 'BULLISH';
  else if (tideScore <= -1) tide = 'BEARISH';
  else tide = 'NEUTRAL';

  // 2. Screen 2: Market Wave (波浪) - Daily Oscillators
  const dailyCloses = dailyBars.map(b => b.close);
  const dailyHighs = dailyBars.map(b => b.high);
  const dailyLows = dailyBars.map(b => b.low);
  const dailyVolumes = dailyBars.map(b => b.volume);

  const forceIndex2 = calculateForceIndex(dailyCloses, dailyVolumes, 2);
  const forceIndex13 = calculateForceIndex(dailyCloses, dailyVolumes, 13);
  const stoch = calculateStochastic(dailyHighs, dailyLows, dailyCloses, 14, 3, 3);
  const dailyEma13 = calculateEMA(dailyCloses, 13);
  const dailyEma26 = calculateEMA(dailyCloses, 26);

  const curDIdx = dailyBars.length - 1;
  const prevDIdx = Math.max(0, curDIdx - 1);

  const curFI2 = forceIndex2[curDIdx];
  const prevFI2 = forceIndex2[prevDIdx];
  const curK = stoch.slowK[curDIdx];
  const curD = stoch.slowD[curDIdx];
  const prevK = stoch.slowK[prevDIdx];
  const prevD = stoch.slowD[prevDIdx];

  // Elder-Ray Bull / Bear Power
  const bullPower = dailyHighs[curDIdx] - dailyEma13[curDIdx];
  const bearPower = dailyLows[curDIdx] - dailyEma13[curDIdx];

  let waveStatus: 'OVERSOLD_PULLBACK' | 'OVERBOUGHT_RALLY' | 'NEUTRAL' = 'NEUTRAL';
  let waveSignal = '中性震盪';

  if (tide === 'BULLISH') {
    // In bull tide, wave going down gives buy setup
    if (curFI2 < 0 || curK < 35 || (prevK < prevD && curK >= curD && curK < 50)) {
      waveStatus = 'OVERSOLD_PULLBACK';
      waveSignal = curFI2 < 0 ? '強力指數拉回負值 (波浪買點準備)' : 'KD指標處於超賣拉回區 (買進契機)';
    } else {
      waveSignal = '多頭大潮推進中，等待短線拉回';
    }
  } else if (tide === 'BEARISH') {
    // In bear tide, wave going up gives short setup
    if (curFI2 > 0 || curK > 65 || (prevK > prevD && curK <= curD && curK > 50)) {
      waveStatus = 'OVERBOUGHT_RALLY';
      waveSignal = curFI2 > 0 ? '強力指數反彈正值 (放空準備)' : 'KD指標處於超買反彈區 (空頭阻力)';
    } else {
      waveSignal = '空頭大潮宣洩中，等待反彈';
    }
  }

  // 3. Screen 3: Ripple & Order Placement (漣漪與掛單突破)
  const currentPrice = dailyCloses[curDIdx];
  const todayHigh = dailyHighs[curDIdx];
  const todayLow = dailyLows[curDIdx];
  const yesterdayHigh = dailyHighs[prevDIdx];
  const yesterdayLow = dailyLows[prevDIdx];

  // Calculate minimum tick size based on price and market
  let tick = 0.01;
  if (market === 'TW') {
    if (currentPrice < 10) tick = 0.01;
    else if (currentPrice < 50) tick = 0.05;
    else if (currentPrice < 100) tick = 0.1;
    else if (currentPrice < 500) tick = 0.5;
    else if (currentPrice < 1000) tick = 1.0;
    else tick = 5.0;
  } else {
    tick = currentPrice > 1 ? 0.01 : 0.001;
  }

  // Elder's Trailing Stop Entry Technique:
  // For Buy: Place Buy-Stop 1 tick above yesterday's High
  const buyStopEntry = Number((yesterdayHigh + tick).toFixed(2));
  // Stop loss: Lowest low of the last 3 days
  const recent3DaysLows = dailyLows.slice(Math.max(0, curDIdx - 2), curDIdx + 1);
  const stopLossLong = Number((Math.min(...recent3DaysLows) - tick).toFixed(2));

  // For Short: Place Sell-Stop 1 tick below yesterday's Low
  const sellStopEntry = Number((yesterdayLow - tick).toFixed(2));
  const recent3DaysHighs = dailyHighs.slice(Math.max(0, curDIdx - 2), curDIdx + 1);
  const stopLossShort = Number((Math.max(...recent3DaysHighs) + tick).toFixed(2));

  // Determine overall action signal
  let action: 'BUY_SIGNAL' | 'BUY_SETUP' | 'SELL_SHORT' | 'SHORT_SETUP' | 'WAIT';
  let recommendedEntry = 0;
  let recommendedStop = 0;
  let targetPrice = 0;
  let riskPerShare = 0;
  let rewardPerShare = 0;
  let rrRatio = 0;

  if (tide === 'BULLISH') {
    recommendedEntry = buyStopEntry;
    recommendedStop = stopLossLong;
    riskPerShare = Math.max(tick, Number((recommendedEntry - recommendedStop).toFixed(2)));
    // Target: At least 2.5x risk or EMA extension
    rewardPerShare = Number((riskPerShare * 2.5).toFixed(2));
    targetPrice = Number((recommendedEntry + rewardPerShare).toFixed(2));
    rrRatio = Number((rewardPerShare / riskPerShare).toFixed(2));

    if (waveStatus === 'OVERSOLD_PULLBACK') {
      // If current price already exceeded yesterday's high, it is triggered!
      if (currentPrice >= buyStopEntry) {
        action = 'BUY_SIGNAL';
      } else {
        action = 'BUY_SETUP';
      }
    } else {
      action = 'WAIT';
    }
  } else if (tide === 'BEARISH') {
    recommendedEntry = sellStopEntry;
    recommendedStop = stopLossShort;
    riskPerShare = Math.max(tick, Number((recommendedStop - recommendedEntry).toFixed(2)));
    rewardPerShare = Number((riskPerShare * 2.5).toFixed(2));
    targetPrice = Number((recommendedEntry - rewardPerShare).toFixed(2));
    rrRatio = Number((rewardPerShare / riskPerShare).toFixed(2));

    if (waveStatus === 'OVERBOUGHT_RALLY') {
      if (currentPrice <= sellStopEntry) {
        action = 'SELL_SHORT';
      } else {
        action = 'SHORT_SETUP';
      }
    } else {
      action = 'WAIT';
    }
  } else {
    action = 'WAIT';
    recommendedEntry = currentPrice;
    recommendedStop = Number((currentPrice * 0.95).toFixed(2));
    riskPerShare = Number((recommendedEntry - recommendedStop).toFixed(2));
    targetPrice = Number((currentPrice * 1.1).toFixed(2));
    rrRatio = 2.0;
  }

  // Previous day comparison for daily change
  const prevClose = dailyCloses[prevDIdx];
  const changeVal = Number((currentPrice - prevClose).toFixed(2));
  const changePct = Number(((changeVal / prevClose) * 100).toFixed(2));

  return {
    symbol,
    market,
    currentPrice,
    changeVal,
    changePct,
    currency: market === 'TW' ? 'TWD' : 'USD',
    action,
    tripleScreen: {
      screen1_tide: {
        name: '第 1 層：市場大潮 (週線長期趨勢)',
        timeframe: 'Weekly (週線)',
        tide,
        weeklyHist: Number(curWeeklyHist.toFixed(2)),
        prevWeeklyHist: Number(prevWeeklyHist.toFixed(2)),
        histSlope: Number(histSlope.toFixed(3)),
        histDirection: histSlope > 0 ? '斜率向上 (柱狀圖翻揚)' : histSlope < 0 ? '斜率向下 (柱狀圖走跌)' : '持平',
        weeklyEma26: Number(curWeeklyEma26.toFixed(2)),
        priceVsEma: curWeeklyPrice >= curWeeklyEma26 ? '價格高於 26 週 EMA' : '價格低於 26 週 EMA',
        ruleSummary:
          tide === 'BULLISH'
            ? '大潮多頭：週線 MACD-H 向上，交易規則只准做多或空手，嚴禁做空。'
            : tide === 'BEARISH'
            ? '大潮空頭：週線 MACD-H 向下，交易規則只准做空或空手，嚴禁做多。'
            : '大潮中性：趨勢震盪未明，建議觀望等待方向。',
      },
      screen2_wave: {
        name: '第 2 層：市場波浪 (日線逆勢震盪指標)',
        timeframe: 'Daily (日線)',
        status: waveStatus,
        explanation: waveSignal,
        forceIndex2: Number(curFI2.toFixed(0)),
        forceIndex13: Number(forceIndex13[curDIdx].toFixed(0)),
        forceIndexSign: curFI2 < 0 ? '強力指數小於 0 (拉回蓄勢)' : '強力指數大於 0 (多頭發力/超買)',
        slowK: Number(curK.toFixed(1)),
        slowD: Number(curD.toFixed(1)),
        kStatus: curK < 30 ? '超賣區 (<30)' : curK > 70 ? '超買區 (>70)' : '常態區 (30-70)',
        bullPower: Number(bullPower.toFixed(2)),
        bearPower: Number(bearPower.toFixed(2)),
        ruleSummary:
          tide === 'BULLISH'
            ? waveStatus === 'OVERSOLD_PULLBACK'
              ? '【買進準備】大潮上漲但波浪拉回（強力指數<0 或 KD超賣），尋找進場買點。'
              : '波浪已在波段高位或尚未拉回，耐心等待逢低布局點。'
            : tide === 'BEARISH'
            ? waveStatus === 'OVERBOUGHT_RALLY'
              ? '【放空準備】大潮下跌但波浪反彈（強力指數>0 或 KD超買），尋找高檔放空點。'
              : '波浪在低檔，不宜追空，等待反彈。'
            : '等待第一層大潮確認後再捕捉第二層波浪。',
      },
      screen3_ripple: {
        name: '第 3 層：市場漣漪 (動態突破買進與停損點)',
        technique: tide === 'BULLISH' ? '動態突破買進停損單 (Trailing Buy-Stop)' : '動態突破放空停損單 (Trailing Sell-Stop)',
        recommendedEntry,
        recommendedStop,
        targetPrice,
        riskPerShare,
        rewardPerShare,
        rrRatio,
        tick,
        entryLogic:
          tide === 'BULLISH'
            ? `掛突破買單於昨日最高價上方一檔 (${buyStopEntry})。若今日突破即成交；若續跌未破則明日下移至新高點上一檔。`
            : `掛突破空單於昨日最低價下方一檔 (${sellStopEntry})。若今日跌破即成交；若續漲未破則明日上移至新低點下一檔。`,
        stopLossLogic:
          tide === 'BULLISH'
            ? `保護性停損設於近 3 日最低價 (${stopLossLong})，跌破無條件離場。`
            : `保護性停損設於近 3 日最高價 (${stopLossShort})，突破無條件回補。`,
      },
    },
    dailyBars: dailyBars.slice(-60), // recent 60 bars for charting
    weeklyBars: weeklyBars.slice(-30), // recent 30 weekly bars
    indicators: {
      weeklyMacd: {
        dates: weeklyBars.slice(-30).map(b => b.date),
        macd: weeklyMacd.macdLine.slice(-30),
        signal: weeklyMacd.signalLine.slice(-30),
        histogram: weeklyMacd.histogram.slice(-30),
      },
      dailyForceIndex: {
        dates: dailyBars.slice(-60).map(b => b.date),
        fi2: forceIndex2.slice(-60),
        fi13: forceIndex13.slice(-60),
      },
      dailyStoch: {
        dates: dailyBars.slice(-60).map(b => b.date),
        slowK: stoch.slowK.slice(-60),
        slowD: stoch.slowD.slice(-60),
      },
      dailyEma: {
        dates: dailyBars.slice(-60).map(b => b.date),
        ema13: dailyEma13.slice(-60),
        ema26: dailyEma26.slice(-60),
      },
    },
  };
}

// API Routes
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const rawSymbol = req.params.symbol;
    if (!rawSymbol) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    const { symbol, market } = normalizeTicker(rawSymbol);
    const bars = await fetchYahooBars(symbol);
    const analysis = analyzeTripleScreen(symbol, bars, market);

    res.json(analysis);
  } catch (err: any) {
    console.error('Error analyzing stock:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// Batch scanning endpoint
app.post('/api/batch-scan', async (req, res) => {
  try {
    const { symbols } = req.body;
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'symbols array is required' });
    }

    // Limit to 20 per request to ensure fast response
    const targetSymbols = symbols.slice(0, 20);
    const results = [];

    for (const raw of targetSymbols) {
      try {
        const { symbol, market } = normalizeTicker(raw);
        const bars = await fetchYahooBars(symbol);
        const analysis = analyzeTripleScreen(symbol, bars, market);
        // Include summary fields for list table
        results.push({
          symbol: analysis.symbol,
          market: analysis.market,
          currentPrice: analysis.currentPrice,
          changeVal: analysis.changeVal,
          changePct: analysis.changePct,
          action: analysis.action,
          tide: analysis.tripleScreen.screen1_tide.tide,
          histSlope: analysis.tripleScreen.screen1_tide.histSlope,
          waveStatus: analysis.tripleScreen.screen2_wave.status,
          forceIndex2: analysis.tripleScreen.screen2_wave.forceIndex2,
          slowK: analysis.tripleScreen.screen2_wave.slowK,
          slowD: analysis.tripleScreen.screen2_wave.slowD,
          recommendedEntry: analysis.tripleScreen.screen3_ripple.recommendedEntry,
          recommendedStop: analysis.tripleScreen.screen3_ripple.recommendedStop,
          targetPrice: analysis.tripleScreen.screen3_ripple.targetPrice,
          rrRatio: analysis.tripleScreen.screen3_ripple.rrRatio,
          currency: analysis.currency,
        });
      } catch (err: any) {
        console.warn(`Failed scanning ${raw}:`, err.message);
      }
    }

    res.json({ results });
  } catch (err: any) {
    console.error('Batch scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Dr. Alexander Elder AI Coach analysis
app.post('/api/elder-coach', async (req, res) => {
  try {
    const { stockData, portfolioData } = req.body;

    if (!aiClient) {
      return res.json({
        advice: `【Alexander Elder 導師紀律叮嚀】\n1. 「大潮決定方向，波浪尋找轉折，漣漪精確進場」：絕不在大潮走空時撈底買進。\n2. 「2% 法則保護生命，6% 法則保護本月利潤」：沒有任何一筆交易值得承擔超過總資產 2% 的風險。\n3. 進場前必須先確定停損點，停損點不是隨便填的數字，而是這波行情若是虛假時市場證明你錯誤的客觀價位。`,
      });
    }

    const prompt = `
你現在是暢銷投資名著《操作生涯不是夢》(Trading for a Living) 與《走進我的交易室》(Come Into My Trading Room) 的作者亞歷山大·艾爾德博士 (Dr. Alexander Elder)。
請根據專業的三重濾網交易系統 (Triple Screen Trading System) 與 2% / 6% 資金風險控管法則，用嚴謹、犀利且充滿啟發性的語氣，評估這筆潛在交易或投資組合狀態：

股票分析數據：
${JSON.stringify(stockData || {}, null, 2)}

投資人資金與持倉狀況：
${JSON.stringify(portfolioData || {}, null, 2)}

請提供結構清晰的分析：
1. 【三重濾網診斷 (大潮、波浪、漣漪)】：目前是否構成合規的交易機會？技術訊號背後的市場群體心理是什麼？
2. 【2% 與 6% 資金風控紀律檢視】：資金規模與停損配置是否符合 2% 單筆上限？帳戶是否面臨 6% 停火線風險？
3. 【Elder 操盤執行守則】：給交易者的 3 點具體下單與心態建議（掛單方式、移動停損、獲利出場策略）。
請使用繁體中文，語氣冷靜專業、強調風控與紀律第一。
`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ advice: response.text });
  } catch (err: any) {
    console.error('Elder coach error:', err);
    res.status(500).json({ error: err.message || 'AI coach failed' });
  }
});

// Mount Vite or static files
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
