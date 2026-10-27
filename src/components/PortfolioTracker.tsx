import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, ShieldCheck, ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { StockPosition, UserPortfolio, MarketType } from '../types';
import { calculatePortfolioRisk } from '../utils/elderRisk';

interface PortfolioTrackerProps {
  portfolio: UserPortfolio;
  onUpdatePortfolio: (updated: Partial<UserPortfolio>) => void;
  onSelectPositionForAnalysis?: (symbol: string) => void;
}

export const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({
  portfolio,
  onUpdatePortfolio,
  onSelectPositionForAnalysis,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newMarket, setNewMarket] = useState<MarketType>('TW');
  const [newShares, setNewShares] = useState<number>(1000);
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(950);
  const [newCurrentPrice, setNewCurrentPrice] = useState<number>(980);
  const [newStopLoss, setNewStopLoss] = useState<number>(930);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStopLoss, setEditStopLoss] = useState<number>(0);
  const [editCurrentPrice, setEditCurrentPrice] = useState<number>(0);

  const riskResult = calculatePortfolioRisk(portfolio);

  const handleAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const newPos: StockPosition = {
      id: `pos-${Date.now()}`,
      symbol: newSymbol.trim().toUpperCase(),
      market: newMarket,
      shares: Number(newShares) || 1,
      purchasePrice: Number(newPurchasePrice) || 1,
      currentPrice: Number(newCurrentPrice) || Number(newPurchasePrice) || 1,
      stopLossPrice: Number(newStopLoss) || Number(newPurchasePrice) * 0.95,
      entryDate: new Date().toISOString().slice(0, 10),
    };

    onUpdatePortfolio({
      positions: [newPos, ...portfolio.positions],
    });

    setIsAdding(false);
    setNewSymbol('');
  };

  const handleDeletePosition = (id: string) => {
    onUpdatePortfolio({
      positions: portfolio.positions.filter((p) => p.id !== id),
    });
  };

  const handleStartEdit = (pos: StockPosition) => {
    setEditingId(pos.id);
    setEditStopLoss(pos.stopLossPrice);
    setEditCurrentPrice(pos.currentPrice);
  };

  const handleSaveEdit = (id: string) => {
    onUpdatePortfolio({
      positions: portfolio.positions.map((p) =>
        p.id === id ? { ...p, stopLossPrice: editStopLoss, currentPrice: editCurrentPrice } : p
      ),
    });
    setEditingId(null);
  };

  const handleMoveStopToBreakEven = (id: string, purchasePrice: number) => {
    onUpdatePortfolio({
      positions: portfolio.positions.map((p) =>
        p.id === id ? { ...p, stopLossPrice: purchasePrice } : p
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>現有股票持倉與未平倉風險監控</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              監控所有在手部位的開倉風險 (Open Risk)，落實 Alexander Elder「移動停損至損益兩平點解鎖無風險交易」的資金控管技巧。
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>新增現有持股部位</span>
          </button>
        </div>

        {/* Add Position Form */}
        {isAdding && (
          <form onSubmit={handleAddPosition} className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-3">
            <div className="font-semibold text-slate-200">登記手中持股</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">股票代號</label>
                <input
                  type="text"
                  placeholder="如 2330.TW 或 NVDA"
                  value={newSymbol}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setNewSymbol(val);
                    if (val.endsWith('.TW') || /^\d+$/.test(val)) {
                      setNewMarket('TW');
                    }
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">市場類別</label>
                <select
                  value={newMarket}
                  onChange={(e) => setNewMarket(e.target.value as MarketType)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                >
                  <option value="TW">台股 (TWD)</option>
                  <option value="US">美股 (USD)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">持股數量</label>
                <input
                  type="number"
                  value={newShares}
                  onChange={(e) => setNewShares(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">買進成本價</label>
                <input
                  type="number"
                  step="any"
                  value={newPurchasePrice}
                  onChange={(e) => setNewPurchasePrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">目前市價</label>
                <input
                  type="number"
                  step="any"
                  value={newCurrentPrice}
                  onChange={(e) => setNewCurrentPrice(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-rose-400 block mb-1">保護性停損價</label>
                <input
                  type="number"
                  step="any"
                  value={newStopLoss}
                  onChange={(e) => setNewStopLoss(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-rose-300 font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 font-semibold"
              >
                儲存持股
              </button>
            </div>
          </form>
        )}

        {/* Positions Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">標的代號</th>
                <th className="py-2.5 px-3 text-right">持股數</th>
                <th className="py-2.5 px-3 text-right">成本均價</th>
                <th className="py-2.5 px-3 text-right">目前市價</th>
                <th className="py-2.5 px-3 text-right">部位總市值</th>
                <th className="py-2.5 px-3 text-right">未實現損益</th>
                <th className="py-2.5 px-3 text-right">保護性停損</th>
                <th className="py-2.5 px-3 text-right">未平倉風險量</th>
                <th className="py-2.5 px-3 text-center">風控狀態</th>
                <th className="py-2.5 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {riskResult.positionRisks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    目前尚未登記任何持股部位。點選「新增現有持股部位」開始追蹤部位風險。
                  </td>
                </tr>
              ) : (
                riskResult.positionRisks.map((pos) => {
                  const isEditing = editingId === pos.id;
                  const isTW = pos.market === 'TW';
                  const currency = isTW ? 'NT$' : '$';

                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/40 font-mono transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{pos.symbol}</span>
                          <span className="text-[10px] text-slate-400">
                            {pos.market === 'TW' ? '台' : '美'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-200">
                        {pos.shares.toLocaleString()}
                        {isTW && (
                          <div className="text-[10px] text-slate-400">
                            {Math.floor(pos.shares / 1000)}張 {pos.shares % 1000 > 0 ? `+${pos.shares % 1000}股` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-300">
                        {currency}{pos.purchasePrice}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editCurrentPrice}
                            onChange={(e) => setEditCurrentPrice(Number(e.target.value))}
                            className="w-20 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-right text-white"
                          />
                        ) : (
                          <span className="text-white font-semibold">{currency}{pos.currentPrice}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-200">
                        {currency}{Math.round(pos.marketValue).toLocaleString()}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div
                          className={`flex items-center justify-end gap-0.5 ${
                            pos.unrealizedPnL >= 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {pos.unrealizedPnL >= 0 ? '+' : ''}
                          {currency}{Math.round(pos.unrealizedPnL).toLocaleString()}
                          <span className="text-[10px]">({pos.unrealizedPnLPct.toFixed(1)}%)</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editStopLoss}
                            onChange={(e) => setEditStopLoss(Number(e.target.value))}
                            className="w-20 px-1.5 py-0.5 bg-slate-950 border border-rose-700 rounded text-right text-rose-400"
                          />
                        ) : (
                          <span className="text-rose-400 font-semibold">{currency}{pos.stopLossPrice}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-rose-300">
                        {currency}{Math.round(pos.openRiskAmount).toLocaleString()}
                        <div className="text-[10px] text-slate-400">
                          佔總資產: {pos.openRiskPctOfEquity.toFixed(2)}%
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {pos.isRiskFree ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                            ✨ 無風險部位 (Free Trade)
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                            風險敞口中
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveEdit(pos.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                              title="儲存修改"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              {!pos.isRiskFree && pos.currentPrice > pos.purchasePrice && (
                                <button
                                  onClick={() => handleMoveStopToBreakEven(pos.id, pos.purchasePrice)}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded"
                                  title="將停損提高至成本價"
                                >
                                  設保本
                                </button>
                              )}
                              <button
                                onClick={() => handleStartEdit(pos)}
                                className="p-1 text-slate-400 hover:text-slate-200"
                                title="編輯停損或市價"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeletePosition(pos.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="刪除部位"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Free Trade concept explanation */}
        <div className="mt-4 p-3.5 bg-slate-950/80 rounded-lg text-xs text-slate-300 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-blue-300">
              Alexander Elder 的「無風險交易 (Free Trade)」金律：
            </span>
            <p className="text-slate-400 leading-relaxed">
              當股票上漲、行情向你傾斜時，立即將保護性停損提高到買進成本價（保本點）。
              此時該筆交易的未平倉風險降為 0，這代表帳戶釋出 2% 的風險額度，讓你可以開立下一筆新部位，而不會讓帳戶暴露在雙重虧損風險中！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
