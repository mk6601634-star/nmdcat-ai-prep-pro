import React from 'react';
import {
  Home,
  BookOpen,
  PenTool,
  Search,
  User
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
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'sequential_practice', label: 'Learn', icon: BookOpen },
    { id: 'quick_practice', label: 'Practice', icon: PenTool },
    { id: 'search', label: 'Search', icon: Search, isAction: true },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 z-40 px-2 flex items-center justify-around shadow-[0_-12px_32px_-20px_rgba(15,23,42,0.8)]">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

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
            className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-3xl transition-all ${
              isActive ? 'bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-500/10' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-cyan-300' : ''}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
