import React, { useState } from 'react';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';

import {
  Home,
  BookOpen,
  PenTool,
  Library,
  BarChart3,
  Bot,
  Settings,
  LayoutDashboard,
  Zap,
  RotateCcw,
  FileText,
  BrainCircuit,
  Sparkles,
  User,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Compass,
  NotebookPen,
  Target,
  Trophy,
  MessageSquareText,
  Flame
} from 'lucide-react';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  daysRemaining: number;
  userName?: string;
  examHistory?: any[];
  savedMistakes?: any[];
}

export interface NavCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'study_flow',
    label: 'STUDY FLOW',
    icon: Home,
    items: [
      { id: 'home', label: 'Home', icon: LayoutDashboard, badge: 'Today', badgeColor: 'bg-emerald-500/20 text-emerald-400 font-bold' },
      { id: 'learn', label: 'Learn', icon: BookOpen, badge: 'Core', badgeColor: 'bg-indigo-500/20 text-indigo-300 font-bold' },
      { id: 'practice', label: 'Practice', icon: PenTool, badge: 'MCQs', badgeColor: 'bg-amber-500/20 text-amber-300' },
      { id: 'simple_ai_quiz', label: 'AI Quiz Generator', icon: Sparkles, badge: 'AI', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
      { id: 'prism', label: 'PRISM Engine', icon: ShieldCheck, badge: 'Verified', badgeColor: 'bg-cyan-500/20 text-cyan-300 font-bold' },
      { id: 'review', label: 'Review', icon: RotateCcw, badge: 'SRS', badgeColor: 'bg-rose-500/20 text-rose-300' },
      { id: 'progress', label: 'Progress', icon: BarChart3, badge: 'Stats', badgeColor: 'bg-sky-500/20 text-sky-300' },
      { id: 'resources', label: 'Resources', icon: Library, badge: 'Library', badgeColor: 'bg-violet-500/20 text-violet-300' },
      { id: 'ai', label: 'AI Workspace', icon: Bot, badge: 'AI', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300' }
    ]
  },
  {
    id: 'account_tools',
    label: 'ACCOUNT',
    icon: Settings,
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'admin', label: 'Admin Portal', icon: ShieldCheck, badge: 'CMS', badgeColor: 'bg-emerald-500/20 text-emerald-400 font-bold' }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  daysRemaining,
  userName = 'NMDCAT Aspirant',
  examHistory = [],
  savedMistakes = []
}) => {
  const totalQuestionsSolved = examHistory.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
  const totalCorrect = examHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);
  const userPct = totalQuestionsSolved > 0 ? Math.round((totalCorrect / totalQuestionsSolved) * 100) : 0;
  const displayPct = totalQuestionsSolved > 0 ? `${userPct}%` : `Target ${NMDCAT_CONFIG.TOTAL_MCQS}+`;
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'MK';
  };
  const userInitials = getInitials(userName);
  // Category expansion states
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    settings: false
  });

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleItemClick = (itemId: string) => {
    setActiveTab(itemId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Permanent Collapsible Sidebar */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-50 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileOpen ? 'translate-x-0 shadow-2xl shadow-cyan-950/50' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <div className="flex flex-col gap-0 leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Mehran's</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 tracking-tight text-base">NMDCAT</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/20">PRO</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 truncate">Smart Prep. Higher Score. Your Future.</span>
              </div>
            )}
          </div>

          <button
            id="sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Days Remaining Target Banner */}
        {!isCollapsed && (
          <div className="mx-3 my-3 p-4 rounded-3xl bg-slate-950/90 border border-cyan-500/15 shadow-[0_24px_70px_-30px_rgba(14,165,233,0.25)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-300">
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">NMDCAT Countdown</p>
                <p className="text-sm font-bold text-slate-100">{daysRemaining} days left</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-semibold border border-cyan-500/15">
              {displayPct}
            </span>
          </div>
        )}

        {/* Navigation Categories List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar">
          {NAV_CATEGORIES.map(category => {
            const isCatCollapsed = !!collapsedCategories[category.id];
            return (
              <div key={category.id} className="space-y-1">
                {/* Section Title Header */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full px-2 py-1 flex items-center justify-between text-[11px] font-bold tracking-wider text-slate-400 hover:text-slate-200 transition-colors uppercase"
                  >
                    <span>{category.label}</span>
                    {isCatCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <div className="h-px bg-slate-800 my-2 mx-1" />
                )}

                {/* Section Navigation Items */}
                {(!isCatCollapsed || isCollapsed) && (
                  <div className="space-y-0.5">
                    {category.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          id={`nav-item-${item.id}`}
                          onClick={() => handleItemClick(item.id)}
                          title={isCollapsed ? item.label : undefined}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                          } ${isCollapsed ? 'justify-center px-0' : ''}`}
                        >
                          {/* Active Indicator Bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-400 rounded-r-full shadow-lg shadow-emerald-400/50" />
                          )}

                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />

                          {!isCollapsed && (
                            <div className="flex-1 flex items-center justify-between truncate">
                              <span className="truncate">{item.label}</span>
                              {item.badge && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold shrink-0 ml-1 ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Admin Portal Button */}
        <div className="px-3 pt-2">
          <button
            onClick={() => handleItemClick('admin')}
            title={isCollapsed ? 'Admin Portal' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-3xl text-xs font-semibold transition-all border ${
              activeTab === 'admin'
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20 shadow-lg'
                : 'bg-slate-950/80 text-cyan-300 hover:text-cyan-200 border-cyan-500/20 hover:border-cyan-500/30'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Admin CMS Portal</span>}
          </button>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md">
                {userInitials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{userName}</p>
                <p className="text-[10px] text-emerald-400 font-medium truncate">Premium Student &bull; PMDC 2026</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
