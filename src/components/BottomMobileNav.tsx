import React from 'react';
import {
  Home,
  Sparkles,
  PenTool,
  RotateCcw,
  Search
} from 'lucide-react';

export interface BottomMobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSearch: () => void;
}

export const BottomMobileNav: React.FC<BottomMobileNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSearch
}) => {
  const isTabActive = (id: string) => {
    if (activeTab === id) return true;
    if (id === 'dashboard' && (activeTab === 'home' || activeTab === 'continue_learning' || activeTab === 'todays_plan')) return true;
    if (id === 'practice' && ['quick_practice', 'custom_builder', 'mock_exams', 'past_papers', 'challenge_mode', 'mock'].includes(activeTab)) return true;
    if (id === 'review' && ['mistake_book', 'weak_topics', 'bookmarks', 'srs_review', 'incorrect_qs', 'revision_queue', 'mistakes', 'srs', 'adaptive'].includes(activeTab)) return true;
    return false;
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'simple_ai_quiz', label: 'AI Quiz', icon: Sparkles },
    { id: 'practice', label: 'Practice', icon: PenTool },
    { id: 'review', label: 'Mistakes', icon: RotateCcw },
    { id: 'search', label: 'Search', icon: Search, isAction: true }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 z-40 px-2 flex items-center justify-around shadow-[0_-12px_32px_-20px_rgba(15,23,42,0.8)]">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = isTabActive(item.id);

        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.isAction) {
                onOpenSearch();
              } else {
                setActiveTab(item.id);
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl transition-all ${
              isActive 
                ? 'bg-emerald-500/20 text-emerald-300 font-bold shadow-sm shadow-emerald-500/10' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'scale-110 text-emerald-400' : ''}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
