import React from 'react';
import { Layers, ShieldAlert, BarChart3, BookOpen, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'scanner' | 'risk' | 'portfolio' | 'rules' | 'ai-coach';
  setActiveTab: (tab: 'scanner' | 'risk' | 'portfolio' | 'rules' | 'ai-coach') => void;
  onQuickCalculate?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onQuickCalculate }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('scanner');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-blue-400 transition-colors"
        >
          Elder Triple Screen & Risk
        </a>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'scanner'
                ? 'text-blue-400 font-semibold border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            三重濾網篩選
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'risk'
                ? 'text-blue-400 font-semibold border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2%與6%風控試算
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'portfolio'
                ? 'text-blue-400 font-semibold border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            持股部位監控
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'rules'
                ? 'text-blue-400 font-semibold border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Elder 交易法則
          </button>
          <button
            onClick={() => setActiveTab('ai-coach')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'ai-coach'
                ? 'text-blue-400 font-semibold border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI 導師診斷
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (onQuickCalculate) {
                onQuickCalculate();
              } else {
                setActiveTab('risk');
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 active:bg-blue-700 transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-blue-500/20"
          >
            計算交易規模
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'scanner' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          三重濾網
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'risk' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          2% / 6% 資金風控
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'portfolio' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          持股部位
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'rules' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          交易心法
        </button>
        <button
          onClick={() => setActiveTab('ai-coach')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'ai-coach' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400'
          }`}
        >
          AI 導師
        </button>
      </div>
    </header>
  );
};
