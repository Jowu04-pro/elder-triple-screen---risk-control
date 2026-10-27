import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, DollarSign, Calculator, HelpCircle, ArrowRight, Check, Info } from 'lucide-react';
import { UserPortfolio, MarketType } from '../types';
import { calculatePortfolioRisk, calculateTradeSizing, RiskAnalysisResult, TradeSizingCalculation } from '../utils/elderRisk';

interface RiskManagementDashboardProps {
  portfolio: UserPortfolio;
  onUpdatePortfolio: (updated: Partial<UserPortfolio>) => void;
  candidateTrade: {
    symbol: string;
    market: MarketType;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice: number;
  } | null;
}

export const RiskManagementDashboard: React.FC<RiskManagementDashboardProps> = ({
  portfolio,
  onUpdatePortfolio,
  candidateTrade,
}) => {
  // Input form state for candidate trade
  const [symbol, setSymbol] = useState(candidateTrade?.symbol || '2330.TW');
  const [market, setMarket] = useState<MarketType>(candidateTrade?.market || 'TW');
  const [entryPrice, setEntryPrice] = useState<number>(candidateTrade?.entryPrice || 980);
  const [stopLossPrice, setStopLossPrice] = useState<number>(candidateTrade?.stopLossPrice || 950);
  const [targetPrice, setTargetPrice] = useState<number>(candidateTrade?.targetPrice || 1055);

  // Sync when candidateTrade prop changes
  useEffect(() => {
    if (candidateTrade) {
      setSymbol(candidateTrade.symbol);
      setMarket(candidateTrade.market);
      setEntryPrice(candidateTrade.entryPrice);
      setStopLossPrice(candidateTrade.stopLossPrice);
      setTargetPrice(candidateTrade.targetPrice);
    }
  }, [candidateTrade]);

  // Risk results
  const riskResult: RiskAnalysisResult = calculatePortfolioRisk(portfolio);

  const sizing: TradeSizingCalculation = calculateTradeSizing(riskResult, {
    symbol,
    market,
    entryPrice: Number(entryPrice) || 0.01,
    stopLossPrice: Number(stopLossPrice) || 0.01,
    targetPrice: Number(targetPrice) || 0.01,
  });

  const currencySymbol = portfolio.activeCurrency === 'TWD' ? 'NT$' : '$';
  const isTWStock = market === 'TW';

  return (
    <div className="space-y-6">
      {/* Overview Header & Capital Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Alexander Elder 資金風險管理控制中心</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              實踐《走進我的交易室》嚴格的 2% 法則（單筆最大風險）與 6% 法則（月度強制停火線）。
            </p>
          </div>

          {/* Quick Capital Inputs */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">可用台幣現金：</span>
              <span className="font-mono text-slate-200">NT$</span>
              <input
                type="number"
                value={portfolio.cashTWD}
                onChange={(e) => onUpdatePortfolio({ cashTWD: Math.max(0, Number(e.target.value)) })}
                className="w-28 bg-transparent font-mono text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">可用美金現金：</span>
              <span className="font-mono text-slate-200">$</span>
              <input
                type="number"
                value={portfolio.cashUSD}
                onChange={(e) => onUpdatePortfolio({ cashUSD: Math.max(0, Number(e.target.value)) })}
                className="w-24 bg-transparent font-mono text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">當月已實現虧損：</span>
              <input
                type="number"
                value={portfolio.realizedLossThisMonth}
                onChange={(e) => onUpdatePortfolio({ realizedLossThisMonth: Math.max(0, Number(e.target.value)) })}
                className="w-24 bg-transparent font-mono text-rose-400 text-xs focus:outline-none"
              />
            </div>

            {/* Currency toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => onUpdatePortfolio({ activeCurrency: 'TWD' })}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  portfolio.activeCurrency === 'TWD' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
                }`}
              >
                TWD 計價
              </button>
              <button
                onClick={() => onUpdatePortfolio({ activeCurrency: 'USD' })}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  portfolio.activeCurrency === 'USD' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400'
                }`}
              >
                USD 計價
              </button>
            </div>
          </div>
        </div>

        {/* 4 Core Risk Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Card 1: Total Equity */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">帳戶總資產 (Total Capital)</div>
            <div className="text-2xl font-bold font-mono text-white">
              {currencySymbol}
              {Math.round(riskResult.displayTotalEquity).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>現有股票現值:</span>
              <span className="font-mono">
                {currencySymbol}
                {Math.round(
                  portfolio.activeCurrency === 'TWD'
                    ? riskResult.portfolioMarketValueTWD
                    : riskResult.portfolioMarketValueTWD / (portfolio.fxRateUSDToTWD || 32.5)
                ).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 2: 2% Rule Limit */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-blue-400 font-medium mb-1">
              Elder 2% 法則 (單筆最大風險限額)
            </div>
            <div className="text-2xl font-bold font-mono text-blue-400">
              {currencySymbol}
              {Math.round(riskResult.maxRiskPerTrade2Pct).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              任何單筆交易虧損絕不可超過此金額
            </div>
          </div>

          {/* Card 3: 6% Monthly Rule Limit */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs text-amber-400 font-medium mb-1">
              Elder 6% 法則 (當月總風險停火線)
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {currencySymbol}
              {Math.round(riskResult.monthlyRiskLimit6Pct).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              當月累積未平倉風險 + 已實現虧損上限
            </div>
          </div>

          {/* Card 4: Remaining Monthly Budget */}
          <div
            className={`rounded-lg p-4 border ${
              riskResult.rule6Status === 'BREACHED'
                ? 'bg-rose-950/30 border-rose-800'
                : riskResult.rule6Status === 'CAUTION'
                ? 'bg-amber-950/30 border-amber-800'
                : 'bg-slate-950/60 border-slate-800/80'
            }`}
          >
            <div className="text-xs text-slate-400 mb-1">本月剩餘可用風險額度</div>
            <div
              className={`text-2xl font-bold font-mono ${
                riskResult.rule6Status === 'BREACHED'
                  ? 'text-rose-400'
                  : riskResult.rule6Status === 'CAUTION'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {currencySymbol}
              {Math.round(riskResult.remainingMonthlyRiskBudget).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              剩餘比例: {riskResult.remainingRiskPct.toFixed(2)}% / 6.00%
            </div>
          </div>
        </div>

        {/* 6% Monthly Circuit Breaker Visual Gauge */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">當月風險動用進度儀表板 (0% ~ 6%)</span>
              {riskResult.rule6Status === 'SAFE' && (
                <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                  🟢 安全正常 (可開新倉)
                </span>
              )}
              {riskResult.rule6Status === 'CAUTION' && (
                <span className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                  🟡 風險警戒 (限縮部位)
                </span>
              )}
              {riskResult.rule6Status === 'BREACHED' && (
                <span className="text-[11px] text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded font-bold">
                  🚨 觸發 6% 停火線 (強制停止新開倉)
                </span>
              )}
            </div>
            <span className="font-mono text-slate-300">
              已動用 {riskResult.monthRiskCommittedPct.toFixed(2)}% / 上限 6.00%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                riskResult.rule6Status === 'BREACHED'
                  ? 'bg-rose-500'
                  : riskResult.rule6Status === 'CAUTION'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (riskResult.monthRiskCommittedPct / 6) * 100)}%` }}
            />
          </div>

          {riskResult.rule6Status === 'BREACHED' && (
            <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <strong>【Alexander Elder 嚴正警告：已達到 6% 月度安全停火線】</strong>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  依據交易紀律，當月帳戶累積風險已達到 6% 熔斷極限。請立即執行停火程序：本月完全停止任何新開倉！
                  對於現有未平倉部位，應收緊停損點至損益兩平點（成本價）或離場，以保護資本存活。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Sizing Calculator (檢視單筆交易使用資金量) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              <span>單筆交易規模即時估算器 (2% Position Sizer)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              輸入進場價與停損點，精確計算符合 Elder 2% 風險法則的單筆可用資金量與購買股數。
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">股票代號</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setSymbol(val);
                if (val.endsWith('.TW') || /^\d+$/.test(val)) {
                  setMarket('TW');
                } else {
                  setMarket('US');
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">市場類別</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as MarketType)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="TW">台股 (TWD / 每張1000股)</option>
              <option value="US">美股 (USD / 整股交易)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">預計進場價</label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              保護性停損價 <span className="text-rose-400 font-bold">*關鍵</span>
            </label>
            <input
              type="number"
              step="any"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-rose-400 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">預期目標價</label>
            <input
              type="number"
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Calculation Result Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Output 1: Recommended Shares */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">Elder 2% 建議買進股數</div>
            <div className="text-2xl font-bold font-mono text-blue-400">
              {sizing.finalRecommendedShares.toLocaleString()}{' '}
              <span className="text-xs text-slate-400 font-normal">股</span>
            </div>
            {isTWStock && sizing.taiwanLots && (
              <div className="text-xs text-slate-300 font-mono mt-1">
                相當於: <strong>{sizing.taiwanLots.fullLots} 張</strong>{' '}
                {sizing.taiwanLots.oddShares > 0 && `+ ${sizing.taiwanLots.oddShares} 股(零股)`}
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">
              每股承擔風險: {sizing.currency === 'TWD' ? 'NT$' : '$'}
              {sizing.riskPerShare.toFixed(2)}
            </div>
          </div>

          {/* Output 2: Total Capital Required */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">此筆交易使用資金量 (部位總值)</div>
            <div className="text-2xl font-bold font-mono text-white">
              {sizing.currency === 'TWD' ? 'NT$' : '$'}
              {Math.round(sizing.finalCapitalRequired).toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              佔總資金比例:{' '}
              <strong
                className={sizing.finalPositionWeightPct > 25 ? 'text-amber-400' : 'text-slate-200'}
              >
                {sizing.finalPositionWeightPct.toFixed(1)}%
              </strong>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {sizing.finalPositionWeightPct > 25 ? '⚠️ 超過 25% 建議上限' : '符合適度分散原則'}
            </div>
          </div>

          {/* Output 3: Total Risk Amount & Risk % */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">若觸發停損之最大虧損金額</div>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {sizing.currency === 'TWD' ? 'NT$' : '$'}
              {Math.round(sizing.finalRiskAmount).toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              實際風險佔比: <strong>{sizing.finalRiskPctOfEquity.toFixed(2)}%</strong> (上限 2.0%)
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              受 2% 上限與可用現金雙重守護
            </div>
          </div>

          {/* Output 4: Risk / Reward */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-1">潛在報酬與賺賠比 (R:R)</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              1 : {sizing.riskRewardRatio}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              潛在獲利: {sizing.currency === 'TWD' ? 'NT$' : '$'}
              {Math.round(sizing.finalRecommendedShares * sizing.rewardPerShare).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {sizing.riskRewardRatio >= 2.0 ? '✅ 符合 1:2 以上標準' : '⚠️ 低於 1:2 門檻'}
            </div>
          </div>
        </div>

        {/* Dynamic Risk Warnings and Notes */}
        {sizing.notes.length > 0 && (
          <div className="mt-5 space-y-2">
            {sizing.notes.map((note, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-300 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step-by-Step Mathematical Formula Explanation (Educational & Transparent) */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-200">【Alexander Elder 2% 部位規模公式解析】</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-lg font-mono text-[11px]">
            <div>
              <div className="text-slate-300 font-semibold mb-1">步驟 1：計算 2% 最大容許虧損額</div>
              <p>最大風險額 = 總資產 {Math.round(riskResult.displayTotalEquity).toLocaleString()} × 2% = {Math.round(sizing.maxRiskAllowance2Pct).toLocaleString()}</p>
            </div>
            <div>
              <div className="text-slate-300 font-semibold mb-1">步驟 2：計算每股風險差距</div>
              <p>每股風險 = |進場價 {entryPrice} - 停損點 {stopLossPrice}| = {sizing.riskPerShare.toFixed(2)}</p>
            </div>
            <div>
              <div className="text-slate-300 font-semibold mb-1">步驟 3：計算 2% 規則允許股數</div>
              <p>股數 = ⌊ {Math.round(sizing.effectiveRiskAllowance).toLocaleString()} ÷ {sizing.riskPerShare.toFixed(2)} ⌋ = {sizing.maxSharesByRisk.toLocaleString()} 股</p>
            </div>
            <div>
              <div className="text-slate-300 font-semibold mb-1">步驟 4：現金可用性驗證</div>
              <p>可用現金限制股數 = ⌊ {sizing.availableCash.toLocaleString()} ÷ {entryPrice} ⌋ = {sizing.maxSharesByCash.toLocaleString()} 股</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
