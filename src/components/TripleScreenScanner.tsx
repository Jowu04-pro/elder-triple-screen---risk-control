import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpRight, ArrowDownRight, RefreshCw, Layers, CheckCircle2, AlertCircle, Clock, ChevronRight, Calculator, SlidersHorizontal } from 'lucide-react';
import { TripleScreenAnalysis, ScannedStockSummary } from '../types';
import { TechnicalChart } from './TechnicalChart';

interface TripleScreenScannerProps {
  onApplyToRiskSizer: (candidate: {
    symbol: string;
    market: 'TW' | 'US';
    entryPrice: number;
    stopLossPrice: number;
    targetPrice: number;
  }) => void;
}

const PRESET_WATCHLISTS = [
  {
    name: '台股權值熱門',
    market: 'TW' as const,
    symbols: ['2330.TW', '2317.TW', '2454.TW', '0050.TW', '2382.TW', '2603.TW', '2881.TW', '3293.TWO'],
  },
  {
    name: '美股科技七雄 & ETF',
    market: 'US' as const,
    symbols: ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'QQQ', 'SPY'],
  },
];

export const TripleScreenScanner: React.FC<TripleScreenScannerProps> = ({ onApplyToRiskSizer }) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeMarket, setActiveMarket] = useState<'ALL' | 'TW' | 'US'>('ALL');
  const [filterSignal, setFilterSignal] = useState<'ALL' | 'BUY' | 'SETUP' | 'SHORT'>('ALL');

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [scannedList, setScannedList] = useState<ScannedStockSummary[]>([]);
  const [selectedStock, setSelectedStock] = useState<TripleScreenAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load: scan default watchlist
  useEffect(() => {
    runBatchScan(['2330.TW', '2454.TW', '0050.TW', 'NVDA', 'AAPL', 'TSLA']);
  }, []);

  const runBatchScan = async (symbolsToScan: string[]) => {
    setLoading(true);
    setErrorMsg(null);
    setLoadingMsg(`正在使用 Alexander Elder 三重濾網計算 ${symbolsToScan.length} 檔標的...`);

    try {
      const res = await fetch('/api/batch-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolsToScan }),
      });
      if (!res.ok) throw new Error('掃描失敗，伺服器錯誤');
      const data = await res.json();
      setScannedList(data.results || []);

      // Auto-load details for first stock if none selected
      if (data.results && data.results.length > 0) {
        loadStockDetails(data.results[0].symbol);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '掃描失敗');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const trimmed = searchInput.trim().toUpperCase();
    // Support comma-separated batch input e.g. "2330, NVDA, AAPL"
    if (trimmed.includes(',')) {
      const symbols = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      runBatchScan(symbols);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await loadStockDetails(trimmed);
      // Also ensure it is in the list
      const res = await fetch(`/api/stock/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const item: TripleScreenAnalysis = await res.json();
        setScannedList(prev => {
          const filtered = prev.filter(p => p.symbol !== item.symbol);
          return [
            {
              symbol: item.symbol,
              market: item.market,
              currentPrice: item.currentPrice,
              changeVal: item.changeVal,
              changePct: item.changePct,
              action: item.action,
              tide: item.tripleScreen.screen1_tide.tide,
              histSlope: item.tripleScreen.screen1_tide.histSlope,
              waveStatus: item.tripleScreen.screen2_wave.status,
              forceIndex2: item.tripleScreen.screen2_wave.forceIndex2,
              slowK: item.tripleScreen.screen2_wave.slowK,
              slowD: item.tripleScreen.screen2_wave.slowD,
              recommendedEntry: item.tripleScreen.screen3_ripple.recommendedEntry,
              recommendedStop: item.tripleScreen.screen3_ripple.recommendedStop,
              targetPrice: item.tripleScreen.screen3_ripple.targetPrice,
              rrRatio: item.tripleScreen.screen3_ripple.rrRatio,
              currency: item.currency,
            },
            ...filtered,
          ];
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || '無法取得股票資料');
    } finally {
      setLoading(false);
    }
  };

  const loadStockDetails = async (symbol: string) => {
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '無法取得該股票詳細資料');
      }
      const data: TripleScreenAnalysis = await res.json();
      setSelectedStock(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    }
  };

  // Filter scanned list
  const filteredStocks = scannedList.filter(stock => {
    if (activeMarket !== 'ALL' && stock.market !== activeMarket) return false;
    if (filterSignal === 'BUY' && stock.action !== 'BUY_SIGNAL') return false;
    if (filterSignal === 'SETUP' && stock.action !== 'BUY_SETUP') return false;
    if (filterSignal === 'SHORT' && stock.action !== 'SELL_SHORT' && stock.action !== 'SHORT_SETUP') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Search & Presets Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="輸入股票代號（例如：2330、0050、NVDA、AAPL 或批次用逗號分開）"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              <span>分析篩選</span>
            </button>
          </form>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">快速群組：</span>
            {PRESET_WATCHLISTS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => runBatchScan(preset.symbols)}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                {preset.name} ({preset.symbols.length})
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Scanner Table, Right Selected Stock Details */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Screened List (5 cols on xl) */}
        <div className="xl:col-span-5 space-y-4">
          {/* Filters Bar */}
          <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs">
            {/* Market Segment */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md">
              <button
                onClick={() => setActiveMarket('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeMarket === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setActiveMarket('TW')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeMarket === 'TW' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                台股
              </button>
              <button
                onClick={() => setActiveMarket('US')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeMarket === 'US' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                美股
              </button>
            </div>

            {/* Signal Filters */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md">
              <button
                onClick={() => setFilterSignal('ALL')}
                className={`px-2 py-1 rounded ${filterSignal === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                全部
              </button>
              <button
                onClick={() => setFilterSignal('BUY')}
                className={`px-2 py-1 rounded ${filterSignal === 'BUY' ? 'bg-emerald-600/30 text-emerald-300 font-semibold' : 'text-slate-400'}`}
              >
                買進訊號
              </button>
              <button
                onClick={() => setFilterSignal('SETUP')}
                className={`px-2 py-1 rounded ${filterSignal === 'SETUP' ? 'bg-sky-600/30 text-sky-300 font-semibold' : 'text-slate-400'}`}
              >
                拉回準備
              </button>
              <button
                onClick={() => setFilterSignal('SHORT')}
                className={`px-2 py-1 rounded ${filterSignal === 'SHORT' ? 'bg-rose-600/30 text-rose-300' : 'text-slate-400'}`}
              >
                空頭
              </button>
            </div>
          </div>

          {/* Table List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>標的清單 ({filteredStocks.length})</span>
              <span>點選以檢視三重濾網詳細圖表</span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[640px] overflow-y-auto">
              {loading && filteredStocks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                  {loadingMsg || '正在篩選計算中...'}
                </div>
              ) : filteredStocks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  無符合篩選條件的標的，請更換篩選條件或搜尋新代號。
                </div>
              ) : (
                filteredStocks.map((stock) => {
                  const isSelected = selectedStock?.symbol === stock.symbol;
                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => loadStockDetails(stock.symbol)}
                      className={`p-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected ? 'bg-slate-800/80 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 font-mono text-sm">
                            {stock.symbol}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {stock.market === 'TW' ? '台股' : '美股'}
                          </span>
                        </div>

                        {/* Screen 1 & Screen 2 indicators glance */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                          <span>
                            大潮:{' '}
                            <strong
                              className={
                                stock.tide === 'BULLISH'
                                  ? 'text-emerald-400'
                                  : stock.tide === 'BEARISH'
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }
                            >
                              {stock.tide === 'BULLISH' ? '多頭' : stock.tide === 'BEARISH' ? '空頭' : '盤整'}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            FI(2):{' '}
                            <strong className={stock.forceIndex2 < 0 ? 'text-sky-400' : 'text-slate-300'}>
                              {stock.forceIndex2}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>R:R: 1:{stock.rrRatio}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold font-mono text-slate-100">
                          {stock.currency === 'TWD' ? 'NT$' : '$'}
                          {stock.currentPrice}
                        </div>
                        <div
                          className={`text-xs font-mono flex items-center justify-end gap-0.5 ${
                            stock.changeVal >= 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {stock.changeVal >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          <span>
                            {stock.changeVal >= 0 ? '+' : ''}
                            {stock.changeVal} ({stock.changePct}%)
                          </span>
                        </div>

                        {/* Signal Badge */}
                        <div className="mt-1">
                          {stock.action === 'BUY_SIGNAL' && (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                              多頭突破買進
                            </span>
                          )}
                          {stock.action === 'BUY_SETUP' && (
                            <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/80 px-1.5 py-0.5 rounded">
                              拉回買點準備
                            </span>
                          )}
                          {stock.action === 'SELL_SHORT' && (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.5 rounded">
                              跌破放空
                            </span>
                          )}
                          {stock.action === 'SHORT_SETUP' && (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
                              反彈放空準備
                            </span>
                          )}
                          {stock.action === 'WAIT' && (
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              觀望等待
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Deep-Dive Triple Screen Diagnosis & Chart (7 cols on xl) */}
        <div className="xl:col-span-7 space-y-5">
          {selectedStock ? (
            <>
              {/* Header card of selected stock */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white font-mono">{selectedStock.symbol}</h2>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {selectedStock.market === 'TW' ? '台灣股市 (TW)' : '美國股市 (US)'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        貨幣: {selectedStock.currency}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold font-mono text-white">
                        {selectedStock.currency === 'TWD' ? 'NT$' : '$'}
                        {selectedStock.currentPrice}
                      </span>
                      <span
                        className={`text-sm font-semibold font-mono flex items-center ${
                          selectedStock.changeVal >= 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {selectedStock.changeVal >= 0 ? '+' : ''}
                        {selectedStock.changeVal} ({selectedStock.changePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Primary CTA: Apply to Risk Sizer */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        onApplyToRiskSizer({
                          symbol: selectedStock.symbol,
                          market: selectedStock.market,
                          entryPrice: selectedStock.tripleScreen.screen3_ripple.recommendedEntry,
                          stopLossPrice: selectedStock.tripleScreen.screen3_ripple.recommendedStop,
                          targetPrice: selectedStock.tripleScreen.screen3_ripple.targetPrice,
                        })
                      }
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/10"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>帶入 2% 風控試算部位</span>
                    </button>
                  </div>
                </div>

                {/* Triple Screen Verdict Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5">
                  {/* Screen 1: Market Tide */}
                  <div
                    className={`p-3.5 rounded-lg border text-xs ${
                      selectedStock.tripleScreen.screen1_tide.tide === 'BULLISH'
                        ? 'bg-emerald-950/30 border-emerald-800/60'
                        : selectedStock.tripleScreen.screen1_tide.tide === 'BEARISH'
                        ? 'bg-rose-950/30 border-rose-800/60'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-300">第 1 層：市場大潮</span>
                      <span className="text-[10px] text-slate-400">週線趨勢</span>
                    </div>
                    <div className="text-sm font-bold mb-1">
                      {selectedStock.tripleScreen.screen1_tide.tide === 'BULLISH' && (
                        <span className="text-emerald-400">🌊 多頭大潮 (只做多)</span>
                      )}
                      {selectedStock.tripleScreen.screen1_tide.tide === 'BEARISH' && (
                        <span className="text-rose-400">🔻 空頭大潮 (只做空)</span>
                      )}
                      {selectedStock.tripleScreen.screen1_tide.tide === 'NEUTRAL' && (
                        <span className="text-slate-400">⚖️ 震盪盤整 (觀望)</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                      <div>週MACD-H: {selectedStock.tripleScreen.screen1_tide.weeklyHist}</div>
                      <div>斜率: {selectedStock.tripleScreen.screen1_tide.histDirection}</div>
                      <div>週26EMA: {selectedStock.tripleScreen.screen1_tide.weeklyEma26}</div>
                    </div>
                  </div>

                  {/* Screen 2: Market Wave */}
                  <div
                    className={`p-3.5 rounded-lg border text-xs ${
                      selectedStock.tripleScreen.screen2_wave.status === 'OVERSOLD_PULLBACK'
                        ? 'bg-sky-950/30 border-sky-800/60'
                        : selectedStock.tripleScreen.screen2_wave.status === 'OVERBOUGHT_RALLY'
                        ? 'bg-amber-950/30 border-amber-800/60'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-300">第 2 層：市場波浪</span>
                      <span className="text-[10px] text-slate-400">日線震盪指標</span>
                    </div>
                    <div className="text-sm font-bold mb-1">
                      {selectedStock.tripleScreen.screen2_wave.status === 'OVERSOLD_PULLBACK' && (
                        <span className="text-sky-400">🎯 拉回超賣 (買進準備)</span>
                      )}
                      {selectedStock.tripleScreen.screen2_wave.status === 'OVERBOUGHT_RALLY' && (
                        <span className="text-amber-400">⚠️ 反彈超買 (放空準備)</span>
                      )}
                      {selectedStock.tripleScreen.screen2_wave.status === 'NEUTRAL' && (
                        <span className="text-slate-400">⏳ 常態波動中</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                      <div>2日強力指數: {selectedStock.tripleScreen.screen2_wave.forceIndex2}</div>
                      <div>KD指標: K={selectedStock.tripleScreen.screen2_wave.slowK} / D={selectedStock.tripleScreen.screen2_wave.slowD}</div>
                      <div>狀態: {selectedStock.tripleScreen.screen2_wave.kStatus}</div>
                    </div>
                  </div>

                  {/* Screen 3: Market Ripple */}
                  <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-300">第 3 層：市場漣漪</span>
                      <span className="text-[10px] text-slate-400">動態突破掛單</span>
                    </div>
                    <div className="text-sm font-bold text-blue-400 mb-1">
                      進場點: {selectedStock.tripleScreen.screen3_ripple.recommendedEntry}
                    </div>
                    <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                      <div>停損點: <strong className="text-rose-400">{selectedStock.tripleScreen.screen3_ripple.recommendedStop}</strong></div>
                      <div>目標價: <strong className="text-emerald-400">{selectedStock.tripleScreen.screen3_ripple.targetPrice}</strong></div>
                      <div>賺賠比: <strong>1:{selectedStock.tripleScreen.screen3_ripple.rrRatio}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Alexander Elder Rule Explanation Text */}
                <div className="mt-4 p-3 bg-slate-950/80 rounded-lg text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-blue-300">【Elder 操作執行指引】</div>
                  <div className="text-slate-400 leading-relaxed">
                    {selectedStock.tripleScreen.screen3_ripple.entryLogic}
                  </div>
                  <div className="text-slate-400 leading-relaxed">
                    {selectedStock.tripleScreen.screen3_ripple.stopLossLogic}
                  </div>
                </div>
              </div>

              {/* Technical Chart */}
              <TechnicalChart analysis={selectedStock} />
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm">
              請從左側點選標的或在上方輸入股票代號進行三重濾網診斷。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
