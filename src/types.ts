export type MarketType = 'TW' | 'US';

export type TideDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type WaveStatus = 'OVERSOLD_PULLBACK' | 'OVERBOUGHT_RALLY' | 'NEUTRAL';
export type ActionSignal = 'BUY_SIGNAL' | 'BUY_SETUP' | 'SELL_SHORT' | 'SHORT_SETUP' | 'WAIT';

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Screen1Tide {
  name: string;
  timeframe: string;
  tide: TideDirection;
  weeklyHist: number;
  prevWeeklyHist: number;
  histSlope: number;
  histDirection: string;
  weeklyEma26: number;
  priceVsEma: string;
  ruleSummary: string;
}

export interface Screen2Wave {
  name: string;
  timeframe: string;
  status: WaveStatus;
  explanation: string;
  forceIndex2: number;
  forceIndex13: number;
  forceIndexSign: string;
  slowK: number;
  slowD: number;
  kStatus: string;
  bullPower: number;
  bearPower: number;
  ruleSummary: string;
}

export interface Screen3Ripple {
  name: string;
  technique: string;
  recommendedEntry: number;
  recommendedStop: number;
  targetPrice: number;
  riskPerShare: number;
  rewardPerShare: number;
  rrRatio: number;
  tick: number;
  entryLogic: string;
  stopLossLogic: string;
}

export interface TripleScreenAnalysis {
  symbol: string;
  market: MarketType;
  currentPrice: number;
  changeVal: number;
  changePct: number;
  currency: 'TWD' | 'USD';
  action: ActionSignal;
  tripleScreen: {
    screen1_tide: Screen1Tide;
    screen2_wave: Screen2Wave;
    screen3_ripple: Screen3Ripple;
  };
  dailyBars: PriceBar[];
  weeklyBars: PriceBar[];
  indicators: {
    weeklyMacd: {
      dates: string[];
      macd: number[];
      signal: number[];
      histogram: number[];
    };
    dailyForceIndex: {
      dates: string[];
      fi2: number[];
      fi13: number[];
    };
    dailyStoch: {
      dates: string[];
      slowK: number[];
      slowD: number[];
    };
    dailyEma: {
      dates: string[];
      ema13: number[];
      ema26: number[];
    };
  };
}

export interface ScannedStockSummary {
  symbol: string;
  market: MarketType;
  currentPrice: number;
  changeVal: number;
  changePct: number;
  action: ActionSignal;
  tide: TideDirection;
  histSlope: number;
  waveStatus: WaveStatus;
  forceIndex2: number;
  slowK: number;
  slowD: number;
  recommendedEntry: number;
  recommendedStop: number;
  targetPrice: number;
  rrRatio: number;
  currency: string;
}

// Portfolio & Position types
export interface StockPosition {
  id: string;
  symbol: string;
  market: MarketType;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  stopLossPrice: number;
  entryDate?: string;
  note?: string;
}

export interface UserPortfolio {
  cashTWD: number;
  cashUSD: number;
  activeCurrency: 'TWD' | 'USD';
  fxRateUSDToTWD: number; // e.g. 32.5
  positions: StockPosition[];
  realizedLossThisMonth: number;
  startOfMonthEquity?: number;
}
