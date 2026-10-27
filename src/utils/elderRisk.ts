import { StockPosition, UserPortfolio, MarketType } from '../types';

export interface PositionRiskItem {
  id: string;
  symbol: string;
  market: MarketType;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  stopLossPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  openRiskAmount: number;
  openRiskPctOfEquity: number;
  isRiskFree: boolean; // Stop loss >= purchase price
}

export interface RiskAnalysisResult {
  totalEquityTWD: number;
  totalEquityUSD: number;
  cashTWD: number;
  cashUSD: number;
  portfolioMarketValueTWD: number;
  activeCurrency: 'TWD' | 'USD';
  displayTotalEquity: number;
  
  // 2% Rule Metrics
  maxRiskPerTrade2Pct: number;
  
  // 6% Rule Metrics
  monthlyRiskLimit6Pct: number;
  totalCurrentOpenRisk: number;
  realizedLossThisMonth: number;
  totalMonthRiskCommitted: number;
  monthRiskCommittedPct: number;
  remainingMonthlyRiskBudget: number;
  remainingRiskPct: number;
  rule6Status: 'SAFE' | 'CAUTION' | 'BREACHED'; // SAFE < 4%, CAUTION 4%-6%, BREACHED >= 6%
  canOpenNewTrade: boolean;

  // Breakdown of positions
  positionRisks: PositionRiskItem[];
}

export interface TradeSizingCalculation {
  symbol: string;
  market: MarketType;
  currency: 'TWD' | 'USD';
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskPerShare: number;
  rewardPerShare: number;
  riskRewardRatio: number;

  // 2% Rule calculations
  maxRiskAllowance2Pct: number;
  effectiveRiskAllowance: number; // bounded by remaining 6% budget
  maxSharesByRisk: number;
  capitalRequiredByRisk: number;
  positionWeightByRiskPct: number;

  // Cash constraint
  availableCash: number;
  maxSharesByCash: number;
  finalRecommendedShares: number;
  finalCapitalRequired: number;
  finalRiskAmount: number;
  finalRiskPctOfEquity: number;
  finalPositionWeightPct: number;

  // Taiwan lot breakdown
  taiwanLots?: {
    fullLots: number; // 張數 (1張 = 1000股)
    oddShares: number; // 零股
  };

  // Warnings / Advice
  isCashConstrained: boolean;
  isPositionOverConcentrated: boolean; // > 25% of total capital
  isRule6Violated: boolean;
  notes: string[];
}

export function calculatePortfolioRisk(portfolio: UserPortfolio): RiskAnalysisResult {
  const fx = portfolio.fxRateUSDToTWD || 32.5;
  const isTWD = portfolio.activeCurrency === 'TWD';

  let portfolioMarketValueTWD = 0;
  const positionRisks: PositionRiskItem[] = [];

  for (const pos of portfolio.positions) {
    const isPosUSD = pos.market === 'US';
    const rateToTWD = isPosUSD ? fx : 1;
    const marketValNative = pos.shares * pos.currentPrice;
    const marketValTWD = marketValNative * rateToTWD;
    portfolioMarketValueTWD += marketValTWD;

    const pnlNative = (pos.currentPrice - pos.purchasePrice) * pos.shares;
    const pnlPct = pos.purchasePrice > 0 ? ((pos.currentPrice - pos.purchasePrice) / pos.purchasePrice) * 100 : 0;

    // Elder's Open Risk = max(0, (Current Price - Stop Loss) * Shares)
    // If stop loss is above purchase price (or at break-even), risk is 0 (Free Trade)
    const riskPerShare = Math.max(0, pos.currentPrice - pos.stopLossPrice);
    const openRiskNative = riskPerShare * pos.shares;
    const openRiskTWD = openRiskNative * rateToTWD;

    positionRisks.push({
      id: pos.id,
      symbol: pos.symbol,
      market: pos.market,
      shares: pos.shares,
      purchasePrice: pos.purchasePrice,
      currentPrice: pos.currentPrice,
      stopLossPrice: pos.stopLossPrice,
      marketValue: marketValNative,
      unrealizedPnL: pnlNative,
      unrealizedPnLPct: pnlPct,
      openRiskAmount: isTWD ? openRiskTWD : openRiskTWD / fx,
      openRiskPctOfEquity: 0, // will compute after total equity
      isRiskFree: pos.stopLossPrice >= pos.purchasePrice,
    });
  }

  // Total Equity in TWD
  const cashInTWD = portfolio.cashTWD + portfolio.cashUSD * fx;
  const totalEquityTWD = cashInTWD + portfolioMarketValueTWD;
  const totalEquityUSD = totalEquityTWD / fx;
  const displayTotalEquity = isTWD ? totalEquityTWD : totalEquityUSD;

  // 2% and 6% Rules
  const maxRiskPerTrade2Pct = displayTotalEquity * 0.02;
  const monthlyRiskLimit6Pct = displayTotalEquity * 0.06;

  // Sum open risks
  let totalCurrentOpenRisk = 0;
  for (const pr of positionRisks) {
    totalCurrentOpenRisk += pr.openRiskAmount;
    pr.openRiskPctOfEquity = displayTotalEquity > 0 ? (pr.openRiskAmount / displayTotalEquity) * 100 : 0;
  }

  const realizedLossNative = portfolio.realizedLossThisMonth;
  const totalMonthRiskCommitted = totalCurrentOpenRisk + realizedLossNative;
  const monthRiskCommittedPct = displayTotalEquity > 0 ? (totalMonthRiskCommitted / displayTotalEquity) * 100 : 0;
  const remainingMonthlyRiskBudget = Math.max(0, monthlyRiskLimit6Pct - totalMonthRiskCommitted);
  const remainingRiskPct = Math.max(0, 6 - monthRiskCommittedPct);

  let rule6Status: 'SAFE' | 'CAUTION' | 'BREACHED' = 'SAFE';
  if (monthRiskCommittedPct >= 6.0) {
    rule6Status = 'BREACHED';
  } else if (monthRiskCommittedPct >= 4.0) {
    rule6Status = 'CAUTION';
  }

  const canOpenNewTrade = rule6Status !== 'BREACHED' && remainingMonthlyRiskBudget > 0;

  return {
    totalEquityTWD,
    totalEquityUSD,
    cashTWD: portfolio.cashTWD,
    cashUSD: portfolio.cashUSD,
    portfolioMarketValueTWD,
    activeCurrency: portfolio.activeCurrency,
    displayTotalEquity,
    maxRiskPerTrade2Pct,
    monthlyRiskLimit6Pct,
    totalCurrentOpenRisk,
    realizedLossThisMonth: realizedLossNative,
    totalMonthRiskCommitted,
    monthRiskCommittedPct,
    remainingMonthlyRiskBudget,
    remainingRiskPct,
    rule6Status,
    canOpenNewTrade,
    positionRisks,
  };
}

export function calculateTradeSizing(
  riskResult: RiskAnalysisResult,
  candidate: {
    symbol: string;
    market: MarketType;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice?: number;
  }
): TradeSizingCalculation {
  const { symbol, market, entryPrice, stopLossPrice } = candidate;
  const currency: 'TWD' | 'USD' = market === 'TW' ? 'TWD' : 'USD';
  const targetPrice = candidate.targetPrice || Number((entryPrice + Math.abs(entryPrice - stopLossPrice) * 2.5).toFixed(2));

  const riskPerShare = Math.max(0.01, Math.abs(entryPrice - stopLossPrice));
  const rewardPerShare = Math.max(0.01, Math.abs(targetPrice - entryPrice));
  const riskRewardRatio = Number((rewardPerShare / riskPerShare).toFixed(2));

  // 2% Rule Dollar Allowance
  // If active currency matches trade currency, use display equity, else convert
  const equityInTradeCurrency =
    riskResult.activeCurrency === currency
      ? riskResult.displayTotalEquity
      : currency === 'TWD'
      ? riskResult.totalEquityTWD
      : riskResult.totalEquityUSD;

  const maxRiskAllowance2Pct = equityInTradeCurrency * 0.02;

  // Check against remaining 6% rule budget
  const remainingBudgetInTradeCurrency =
    riskResult.activeCurrency === currency
      ? riskResult.remainingMonthlyRiskBudget
      : currency === 'TWD'
      ? riskResult.remainingMonthlyRiskBudget * 32.5
      : riskResult.remainingMonthlyRiskBudget / 32.5;

  const effectiveRiskAllowance = Math.min(maxRiskAllowance2Pct, remainingBudgetInTradeCurrency);

  // Shares calculation
  const maxSharesByRisk = Math.max(0, Math.floor(effectiveRiskAllowance / riskPerShare));
  const capitalRequiredByRisk = maxSharesByRisk * entryPrice;
  const positionWeightByRiskPct = equityInTradeCurrency > 0 ? (capitalRequiredByRisk / equityInTradeCurrency) * 100 : 0;

  // Cash constraint check
  const availableCash = currency === 'TWD' ? riskResult.cashTWD : riskResult.cashUSD;
  const maxSharesByCash = entryPrice > 0 ? Math.floor(availableCash / entryPrice) : 0;

  // Final recommended shares (constrained by both 2% risk and available cash)
  const finalRecommendedShares = Math.min(maxSharesByRisk, maxSharesByCash);
  const finalCapitalRequired = finalRecommendedShares * entryPrice;
  const finalRiskAmount = finalRecommendedShares * riskPerShare;
  const finalRiskPctOfEquity = equityInTradeCurrency > 0 ? (finalRiskAmount / equityInTradeCurrency) * 100 : 0;
  const finalPositionWeightPct = equityInTradeCurrency > 0 ? (finalCapitalRequired / equityInTradeCurrency) * 100 : 0;

  const isCashConstrained = maxSharesByCash < maxSharesByRisk;
  const isPositionOverConcentrated = finalPositionWeightPct > 25; // Elder 25% single stock cap
  const isRule6Violated = !riskResult.canOpenNewTrade || effectiveRiskAllowance <= 0;

  const notes: string[] = [];
  if (isRule6Violated) {
    notes.push('⚠️ 已達 Elder 6% 停火線限制，當月禁止新增風險倉位！');
  }
  if (isCashConstrained) {
    notes.push(`現有可用現金不足以購足 2% 風險上限股數 (${maxSharesByRisk} 股)，已依現金上限調整為 ${finalRecommendedShares} 股。`);
  }
  if (isPositionOverConcentrated) {
    notes.push(`此單筆交易佔總資金高達 ${finalPositionWeightPct.toFixed(1)}% (超過 Elder 建議的 20~25% 單一標的集中度上限)。建議縮小部位以防非系統性黑天鵝。`);
  }
  if (riskRewardRatio < 2.0) {
    notes.push(`目前賺賠比為 1:${riskRewardRatio}，低於 Elder 建議的 1:2 最低門檻。`);
  }

  // Taiwan lot calculations (1張 = 1000股)
  let taiwanLots: { fullLots: number; oddShares: number } | undefined;
  if (market === 'TW') {
    taiwanLots = {
      fullLots: Math.floor(finalRecommendedShares / 1000),
      oddShares: finalRecommendedShares % 1000,
    };
  }

  return {
    symbol,
    market,
    currency,
    entryPrice,
    stopLossPrice,
    targetPrice,
    riskPerShare,
    rewardPerShare,
    riskRewardRatio,
    maxRiskAllowance2Pct,
    effectiveRiskAllowance,
    maxSharesByRisk,
    capitalRequiredByRisk,
    positionWeightByRiskPct,
    availableCash,
    maxSharesByCash,
    finalRecommendedShares,
    finalCapitalRequired,
    finalRiskAmount,
    finalRiskPctOfEquity,
    finalPositionWeightPct,
    taiwanLots,
    isCashConstrained,
    isPositionOverConcentrated,
    isRule6Violated,
    notes,
  };
}
