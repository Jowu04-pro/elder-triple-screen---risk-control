import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TripleScreenScanner } from './components/TripleScreenScanner';
import { RiskManagementDashboard } from './components/RiskManagementDashboard';
import { PortfolioTracker } from './components/PortfolioTracker';
import { ElderRuleBook } from './components/ElderRuleBook';
import { UserPortfolio, MarketType, TripleScreenAnalysis } from './types';

const INITIAL_PORTFOLIO: UserPortfolio = {
  cashTWD: 1000000,
  cashUSD: 15000,
  activeCurrency: 'TWD',
  fxRateUSDToTWD: 32.5,
  realizedLossThisMonth: 0,
  positions: [
    {
      id: 'pos-1',
      symbol: '2330.TW',
      market: 'TW',
      shares: 1000, // 1張
      purchasePrice: 940,
      currentPrice: 980,
      stopLossPrice: 940, // Break-even / Free trade
      entryDate: '2026-10-15',
    },
    {
      id: 'pos-2',
      symbol: 'NVDA',
      market: 'US',
      shares: 25,
      purchasePrice: 118,
      currentPrice: 125,
      stopLossPrice: 115,
      entryDate: '2026-10-20',
    },
    {
      id: 'pos-3',
      symbol: '0050.TW',
      market: 'TW',
      shares: 2000, // 2張
      purchasePrice: 180,
      currentPrice: 185,
      stopLossPrice: 178,
      entryDate: '2026-10-10',
    },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'risk' | 'portfolio' | 'rules' | 'ai-coach'>('scanner');

  // Load portfolio from localStorage or use initial
  const [portfolio, setPortfolio] = useState<UserPortfolio>(() => {
    try {
      const saved = localStorage.getItem('elder_portfolio_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved portfolio', e);
    }
    return INITIAL_PORTFOLIO;
  });

  // Save portfolio changes
  useEffect(() => {
    try {
      localStorage.setItem('elder_portfolio_data', JSON.stringify(portfolio));
    } catch (e) {
      console.warn('Failed to save portfolio', e);
    }
  }, [portfolio]);

  const handleUpdatePortfolio = (updated: Partial<UserPortfolio>) => {
    setPortfolio((prev) => ({ ...prev, ...updated }));
  };

  // Currently selected trade candidate for 2% sizing
  const [candidateTrade, setCandidateTrade] = useState<{
    symbol: string;
    market: MarketType;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice: number;
  } | null>(null);

  const handleApplyToRiskSizer = (candidate: {
    symbol: string;
    market: MarketType;
    entryPrice: number;
    stopLossPrice: number;
    targetPrice: number;
  }) => {
    setCandidateTrade(candidate);
    setActiveTab('risk');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickCalculate={() => {
          setActiveTab('risk');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'scanner' && (
          <TripleScreenScanner onApplyToRiskSizer={handleApplyToRiskSizer} />
        )}

        {activeTab === 'risk' && (
          <RiskManagementDashboard
            portfolio={portfolio}
            onUpdatePortfolio={handleUpdatePortfolio}
            candidateTrade={candidateTrade}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioTracker
            portfolio={portfolio}
            onUpdatePortfolio={handleUpdatePortfolio}
          />
        )}

        {(activeTab === 'rules' || activeTab === 'ai-coach') && (
          <ElderRuleBook
            portfolio={portfolio}
            selectedStock={null}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Alexander Elder 三重濾網交易系統與 2% / 6% 資金風控平台 · 支援台股及美股
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Trading for a Living</span>
            <span>·</span>
            <span>Come Into My Trading Room</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
