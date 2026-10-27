import React, { useState } from 'react';
import { TripleScreenAnalysis } from '../types';

interface TechnicalChartProps {
  analysis: TripleScreenAnalysis;
}

export const TechnicalChart: React.FC<TechnicalChartProps> = ({ analysis }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const bars = analysis.dailyBars;
  if (!bars || bars.length === 0) return null;

  // Chart layout dimensions
  const width = 850;
  const candlePaneHeight = 220;
  const macdPaneHeight = 90;
  const fiPaneHeight = 90;
  const totalHeight = candlePaneHeight + macdPaneHeight + fiPaneHeight + 40;
  const paddingLeft = 55;
  const paddingRight = 65;
  const chartWidth = width - paddingLeft - paddingRight;

  const count = bars.length;
  const barWidth = Math.max(3, (chartWidth / count) * 0.7);
  const step = chartWidth / count;

  // Min and max for candles
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const minPrice = Math.min(...lows) * 0.985;
  const maxPrice = Math.max(...highs) * 1.015;
  const priceRange = maxPrice - minPrice || 1;

  const getY = (val: number) => {
    return candlePaneHeight - ((val - minPrice) / priceRange) * (candlePaneHeight - 20) - 10;
  };

  // Entry, Stop Loss, Target lines
  const { recommendedEntry, recommendedStop, targetPrice } = analysis.tripleScreen.screen3_ripple;
  const entryY = getY(recommendedEntry);
  const stopY = getY(recommendedStop);
  const targetY = getY(targetPrice);

  // EMA lines coordinates
  const ema13 = analysis.indicators.dailyEma?.ema13 || [];
  const ema26 = analysis.indicators.dailyEma?.ema26 || [];

  const ema13Points = ema13
    .map((val, idx) => {
      const x = paddingLeft + idx * step + step / 2;
      const y = getY(val);
      return `${x},${y}`;
    })
    .join(' ');

  const ema26Points = ema26
    .map((val, idx) => {
      const x = paddingLeft + idx * step + step / 2;
      const y = getY(val);
      return `${x},${y}`;
    })
    .join(' ');

  // Weekly MACD Histogram calculations for Pane 2
  const macdHist = analysis.indicators.weeklyMacd?.histogram || [];
  const maxHistAbs = Math.max(0.01, ...macdHist.map(h => Math.abs(h)));
  const macdTop = candlePaneHeight + 20;
  const macdCenterY = macdTop + macdPaneHeight / 2;

  // Force Index 2-day calculations for Pane 3
  const fi2 = analysis.indicators.dailyForceIndex?.fi2 || [];
  const maxFiAbs = Math.max(1, ...fi2.map(f => Math.abs(f)));
  const fiTop = macdTop + macdPaneHeight + 20;
  const fiCenterY = fiTop + fiPaneHeight / 2;

  // Active bar under hover
  const activeBar = hoverIndex !== null ? bars[hoverIndex] : bars[bars.length - 1];
  const activeEMA13 = hoverIndex !== null ? ema13[hoverIndex] : ema13[ema13.length - 1];
  const activeEMA26 = hoverIndex !== null ? ema26[hoverIndex] : ema26[ema26.length - 1];
  const activeFI2 = hoverIndex !== null ? fi2[hoverIndex] : fi2[fi2.length - 1];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 overflow-hidden">
      {/* Legend & Hover Info Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-2 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">
            {analysis.symbol} ({analysis.market === 'TW' ? '台股' : '美股'})
          </span>
          <span className="text-slate-400 font-mono">{activeBar?.date}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span>
            開: <strong className="text-slate-200">{activeBar?.open}</strong>
          </span>
          <span>
            高: <strong className="text-slate-200">{activeBar?.high}</strong>
          </span>
          <span>
            低: <strong className="text-slate-200">{activeBar?.low}</strong>
          </span>
          <span>
            收:{' '}
            <strong className={activeBar?.close >= activeBar?.open ? 'text-red-400' : 'text-emerald-400'}>
              {activeBar?.close}
            </strong>
          </span>
          <span className="text-blue-400">EMA13: {activeEMA13 ? activeEMA13.toFixed(2) : '-'}</span>
          <span className="text-amber-400">EMA26: {activeEMA26 ? activeEMA26.toFixed(2) : '-'}</span>
          <span className="text-purple-400">FI(2): {activeFI2 ? activeFI2.toLocaleString() : '-'}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          className="w-full min-w-[720px] h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          <line x1={paddingLeft} y1={10} x2={width - paddingRight} y2={10} stroke="#334155" strokeDasharray="2 4" strokeWidth="0.5" />
          <line x1={paddingLeft} y1={candlePaneHeight / 2} x2={width - paddingRight} y2={candlePaneHeight / 2} stroke="#334155" strokeDasharray="2 4" strokeWidth="0.5" />
          <line x1={paddingLeft} y1={candlePaneHeight} x2={width - paddingRight} y2={candlePaneHeight} stroke="#475569" strokeWidth="1" />

          {/* Target Price Guide Line */}
          {targetY >= 10 && targetY <= candlePaneHeight && (
            <g>
              <line
                x1={paddingLeft}
                y1={targetY}
                x2={width - paddingRight}
                y2={targetY}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text x={width - paddingRight + 6} y={targetY + 4} fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="600">
                目標 {targetPrice}
              </text>
            </g>
          )}

          {/* Recommended Entry Guide Line */}
          {entryY >= 10 && entryY <= candlePaneHeight && (
            <g>
              <line
                x1={paddingLeft}
                y1={entryY}
                x2={width - paddingRight}
                y2={entryY}
                stroke="#38bdf8"
                strokeDasharray="4 2"
                strokeWidth="1.5"
              />
              <text x={width - paddingRight + 6} y={entryY + 4} fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="600">
                掛單進場 {recommendedEntry}
              </text>
            </g>
          )}

          {/* Stop Loss Guide Line */}
          {stopY >= 10 && stopY <= candlePaneHeight && (
            <g>
              <line
                x1={paddingLeft}
                y1={stopY}
                x2={width - paddingRight}
                y2={stopY}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <text x={width - paddingRight + 6} y={stopY + 4} fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="600">
                停損點 {recommendedStop}
              </text>
            </g>
          )}

          {/* Candlesticks */}
          {bars.map((bar, idx) => {
            const x = paddingLeft + idx * step + step / 2;
            const isUp = bar.close >= bar.open;
            // In Taiwan, Red is UP, Green is DOWN. For US, Green is UP, Red is DOWN.
            // Elder was based in US, but we honor market locale or standard universal:
            const color = analysis.market === 'TW' ? (isUp ? '#ef4444' : '#10b981') : (isUp ? '#10b981' : '#ef4444');
            const highY = getY(bar.high);
            const lowY = getY(bar.low);
            const openY = getY(bar.open);
            const closeY = getY(bar.close);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              >
                {/* Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" />
                {/* Candle body */}
                <rect
                  x={x - barWidth / 2}
                  y={bodyTop}
                  width={barWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* EMA Curves */}
          {ema13.length > 0 && (
            <polyline fill="none" stroke="#60a5fa" strokeWidth="1.5" points={ema13Points} />
          )}
          {ema26.length > 0 && (
            <polyline fill="none" stroke="#fbbf24" strokeWidth="1.5" points={ema26Points} />
          )}

          {/* Price Y-Axis Labels */}
          <text x={paddingLeft - 8} y={20} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {maxPrice.toFixed(1)}
          </text>
          <text x={paddingLeft - 8} y={candlePaneHeight / 2} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {((maxPrice + minPrice) / 2).toFixed(1)}
          </text>
          <text x={paddingLeft - 8} y={candlePaneHeight - 5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {minPrice.toFixed(1)}
          </text>

          {/* ---------------- PANE 2: SCREEN 1 WEEKLY MACD HISTOGRAM ---------------- */}
          {/* Pane 2 Title */}
          <text x={paddingLeft} y={macdTop - 6} fill="#cbd5e1" fontSize="11" fontWeight="600">
            第 1 層：週線 MACD 柱狀圖 (斜率判別市場大潮)
          </text>
          <line x1={paddingLeft} y1={macdCenterY} x2={width - paddingRight} y2={macdCenterY} stroke="#475569" strokeWidth="1" />

          {/* MACD Histogram Bars */}
          {macdHist.map((hist, idx) => {
            const stepW = chartWidth / macdHist.length;
            const x = paddingLeft + idx * stepW + stepW / 2;
            const h = (Math.abs(hist) / maxHistAbs) * (macdPaneHeight / 2 - 8);
            const isPos = hist >= 0;
            const isSlopeUp = idx > 0 && hist >= macdHist[idx - 1];
            // Elder's MACD color: green when rising, red/muted when falling
            const barFill = isSlopeUp ? '#38bdf8' : '#94a3b8';
            const y = isPos ? macdCenterY - h : macdCenterY;

            return (
              <g key={`macd-${idx}`}>
                <rect
                  x={x - (stepW * 0.6) / 2}
                  y={y}
                  width={Math.max(2, stepW * 0.6)}
                  height={Math.max(1, h)}
                  fill={barFill}
                  rx="0.5"
                />
              </g>
            );
          })}
          <text x={width - paddingRight + 6} y={macdCenterY + 3} fill="#94a3b8" fontSize="10" fontFamily="monospace">
            0 軸
          </text>

          {/* ---------------- PANE 3: SCREEN 2 DAILY FORCE INDEX (2-DAY) ---------------- */}
          <text x={paddingLeft} y={fiTop - 6} fill="#cbd5e1" fontSize="11" fontWeight="600">
            第 2 層：日線 2 日強力指數 Force Index (負值代表拉回買點)
          </text>
          <line x1={paddingLeft} y1={fiCenterY} x2={width - paddingRight} y2={fiCenterY} stroke="#475569" strokeWidth="1" />

          {/* FI bars */}
          {fi2.map((val, idx) => {
            const x = paddingLeft + idx * step + step / 2;
            const h = (Math.abs(val) / maxFiAbs) * (fiPaneHeight / 2 - 8);
            const isPos = val >= 0;
            // Elder's rule: When weekly trend is up, BUY when 2-day Force Index drops BELOW zero!
            const fill = isPos ? '#f43f5e' : '#38bdf8';
            const y = isPos ? fiCenterY - h : fiCenterY;

            return (
              <rect
                key={`fi-${idx}`}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={Math.max(1, h)}
                fill={fill}
                opacity={0.85}
              />
            );
          })}
          <text x={width - paddingRight + 6} y={fiCenterY + 3} fill="#94a3b8" fontSize="10" fontFamily="monospace">
            0 軸
          </text>
        </svg>
      </div>

      {/* Footer Notes on Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 shrink-0"></span>
          <span>大潮：週線 MACD 柱狀圖向上 = 多頭大潮</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 shrink-0"></span>
          <span>波浪：多頭大潮中 2日強力指數 &lt; 0 = 逢低拉回</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 border border-dashed border-sky-400 shrink-0"></span>
          <span>漣漪：掛突破買單於昨日最高點 + 1檔</span>
        </div>
      </div>
    </div>
  );
};
