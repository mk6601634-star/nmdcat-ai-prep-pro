import React, { useState } from 'react';
import {
  Plus,
  Zap,
  Bot,
  Sliders,
  Search,
  X,
  Sparkles
} from 'lucide-react';

export interface QuickActionFABProps {
  onNavigateToTab: (tabId: string) => void;
  onOpenSearch: () => void;
}

export const QuickActionFAB: React.FC<QuickActionFABProps> = ({
  onNavigateToTab,
  onOpenSearch
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'quick_practice',
      label: 'Quick Practice (10 Qs)',
      icon: Zap,
      color: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
      action: () => onNavigateToTab('quick_practice')
    },
    {
      id: 'ai_tutor',
      label: 'AI Tutor Assistant',
      icon: Bot,
      color: 'bg-teal-500 hover:bg-teal-400 text-slate-950',
      action: () => onNavigateToTab('ai_tutor')
    },
    {
      id: 'custom_builder',
      label: 'Generate Test',
      icon: Sliders,
      color: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      action: () => onNavigateToTab('custom_builder')
    },
    {
      id: 'search',
      label: 'Universal Search',
      icon: Search,
      color: 'bg-indigo-500 hover:bg-indigo-400 text-slate-950',
      action: () => onOpenSearch()
    }
  ];

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-6 z-40 flex flex-col items-end space-y-3">
      {/* Speed Dial Options */}
      {isOpen && (
        <div className="flex flex-col items-end space-y-2.5 mb-1 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  act.action();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold shadow-xl group-hover:scale-105 transition-transform">
                  {act.label}
                </span>
                <div className={`w-11 h-11 rounded-full ${act.color} flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5 font-bold" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all ${
          isOpen ? 'rotate-45 bg-rose-500' : ''
        }`}
        aria-label="Quick Actions"
        title="Quick Actions"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
};
