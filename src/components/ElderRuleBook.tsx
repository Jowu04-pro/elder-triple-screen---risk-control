import React, { useState } from 'react';
import { BookOpen, Sparkles, Shield, Compass, TrendingUp, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import { UserPortfolio, TripleScreenAnalysis } from '../types';

interface ElderRuleBookProps {
  portfolio: UserPortfolio;
  selectedStock: TripleScreenAnalysis | null;
}

export const ElderRuleBook: React.FC<ElderRuleBookProps> = ({ portfolio, selectedStock }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchElderCoach = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/elder-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockData: selectedStock
            ? {
                symbol: selectedStock.symbol,
                currentPrice: selectedStock.currentPrice,
                tide: selectedStock.tripleScreen.screen1_tide,
                wave: selectedStock.tripleScreen.screen2_wave,
                ripple: selectedStock.tripleScreen.screen3_ripple,
              }
            : null,
          portfolioData: {
            cashTWD: portfolio.cashTWD,
            cashUSD: portfolio.cashUSD,
            positionsCount: portfolio.positions.length,
            realizedLossThisMonth: portfolio.realizedLossThisMonth,
          },
        }),
      });
      const data = await res.json();
      setAiAdvice(data.advice || '無法取得導師建議');
    } catch (err: any) {
      setAiAdvice(`取得建議失敗: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Coach Banner / Interactive Consultation */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/40 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Alexander Elder 交易導師 AI 即時診斷
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                整合您目前篩選的標的 {selectedStock ? selectedStock.symbol : '(尚未選擇)'} 與投資組合資金狀態，進行艾爾德博士式紀律覆盤。
              </p>
            </div>
          </div>

          <button
            onClick={fetchElderCoach}
            disabled={isAiLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-sm"
          >
            {isAiLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>生成 Elder 紀律分析報告</span>
          </button>
        </div>

        {aiAdvice && (
          <div className="mt-4 p-4 bg-slate-950/90 border border-blue-900/50 rounded-lg text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
            {aiAdvice}
          </div>
        )}
      </div>

      {/* Triple Screen System Core Manual */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            <span>Alexander Elder 三重濾網交易系統核心架構 (Triple Screen)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            由精神醫學博士與頂級交易員 Alexander Elder 於 1985 年提出，解決「單一指標給出矛盾訊號」的市場痛點。
            核心在於依據 5:1 的時間架構階層，依序通過大潮、波浪、漣漪三道過濾。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Screen 1 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">第一層：市場大潮 (Tide)</span>
              <span className="text-[10px] text-slate-400 font-mono">週線 (Weekly)</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">長期趨勢跟隨</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              使用<strong>週線 MACD 柱狀圖 (Histogram) 斜率</strong>。當本週柱狀圖高於上週（斜率向上），代表多頭大潮；只准做多或空手，嚴禁做空。
              反之當斜率向下，只准放空或空手。大潮決定了唯一的作戰方向。
            </p>
          </div>

          {/* Screen 2 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">第二層：市場波浪 (Wave)</span>
              <span className="text-[10px] text-slate-400 font-mono">日線 (Daily)</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">逆勢震盪拉回</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              在多頭大潮中，不盲目追高，而是利用<strong>2 日 EMA 強力指數 (Force Index)</strong> 或<strong>慢速 KD / Williams %R</strong>
              尋找拉回買點。當多頭趨勢中強力指數跌破 0（負值超賣），代表波浪向後退，迎來進場準備！
            </p>
          </div>

          {/* Screen 3 */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">第三層：市場漣漪 (Ripple)</span>
              <span className="text-[10px] text-slate-400 font-mono">盤中 / 突破掛單</span>
            </div>
            <div className="text-sm font-semibold text-slate-200">動態突破買單與停損</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              不使用市價單追價，而是掛<strong>動態突破買進停損單 (Trailing Buy-Stop)</strong> 於昨日最高價上方一檔。
              若行情確認向上突破即成交；若續跌未破則明日下移至新高點上方。初始停損設於近 3 日最低價。
            </p>
          </div>
        </div>
      </div>

      {/* 2% & 6% Risk Management Rules Manual */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span>Alexander Elder 資金控管金律：2% 法則與 6% 法則</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            「業餘者思考能賺多少錢；專業交易員則時刻專注於能承受多少風險。」
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 2% Rule Card */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-sm font-bold text-blue-300">2% 法則：防範「鯊魚咬噬」</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>定義：</strong>任何單筆交易在市場被證明錯誤時，最大允許虧損絕不能超過帳戶總淨值的 2%。
            </p>
            <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300">
              可買股數 = ⌊ (總資產 × 2%) ÷ |進場價 - 停損點| ⌋
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              這條法則能確保即便遇到黑天鵝連續失誤 5 次，帳戶總資本耗損依然不到 10%，依然擁有充沛實力隨時翻身。
            </p>
          </div>

          {/* 6% Rule Card */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <h3 className="text-sm font-bold text-rose-300">6% 法則：防範「食人魚群噬」</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>定義：</strong>單一月份內，所有未平倉風險加上已實現虧損之總和，一旦觸及 6%，立即啟動「強制停火機制」。
            </p>
            <div className="bg-slate-900 p-3 rounded font-mono text-xs text-slate-300">
              若 (未平倉風險 + 當月已實現虧損) ≥ 總資產 × 6% ➔ 全面停開新倉
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              許多交易員不是死於單一重擊，而是死於連續一連串小虧損（食人魚）。
              6% 法則強迫交易員在連續不順時暫停下單、退場深呼吸，等待下個月市場節奏回穩。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
