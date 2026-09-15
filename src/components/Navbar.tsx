import React from 'react';
import { 
  GraduationCap, 
  LayoutDashboard, 
  CheckSquare, 
  BookOpen, 
  BrainCircuit, 
  Sparkles, 
  Bookmark, 
  Calculator, 
  Library, 
  Timer,
  Flame,
  Atom,
  Layers,
  Network,
  FileUp,
  Trophy,
  Search,
  Brain,
  ShieldCheck,
  Target,
  GitBranch,
  Sliders,
  GitCommit
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  daysRemaining: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, daysRemaining }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sequential_practice', label: 'Sequential Practice', icon: GitCommit, badge: 'PMDC' },
    { id: 'custom_builder', label: 'Custom Test Builder', icon: Sliders, badge: 'Pro' },
    { id: 'search', label: 'Smart Search', icon: Search, badge: 'AI' },
    { id: 'advanced_ai', label: 'AI Strategy & Tools', icon: Brain, badge: 'New' },
    { id: 'content_pipeline', label: 'Pipeline & Offline', icon: GitBranch, badge: 'Offline' },
    { id: 'ecosystem', label: 'Merit & Ecosystem', icon: GraduationCap, badge: 'Rank' },
    { id: 'srs', label: 'Smart Revision', icon: Timer, badge: 'SRS' },
    { id: 'syllabus', label: 'PMDC Syllabus', icon: CheckSquare },
    { id: 'notes', label: 'Concept Notes', icon: Layers },
    { id: 'vault', label: 'Reference Vault', icon: Atom },
    { id: 'adaptive', label: 'Adaptive Engine', icon: Network, badge: 'AI' },
    { id: 'practice', label: 'Practice Drills', icon: BookOpen },
    { id: 'mock', label: 'Mock Exam', icon: Flame, badge: 'Live' },
    { id: 'aitutor', label: 'AI Tutor', icon: Sparkles, badge: 'AI' },
    { id: 'studio', label: 'PDF Quiz Studio', icon: FileUp, badge: 'AI' },
    { id: 'mistakes', label: 'Mistake Vault', icon: Bookmark },
    { id: 'flashcards', label: 'Flashcards & Vocab', icon: Library },
    { id: 'productivity', label: 'Habit & Focus', icon: Target },
    { id: 'rewards', label: 'Rewards & Ranks', icon: Trophy, badge: 'XP' },
    { id: 'admin', label: 'Admin & Blueprints', icon: ShieldCheck },
    { id: 'calculator', label: 'Aggregate Calculator', icon: Calculator },
    { id: 'planner', label: 'Study Planner', icon: Timer },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 font-bold" />
            </div>
            <div>
              <div className="flex flex-col gap-0 leading-tight">
                <span className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Mehran's</span>
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  NMDCAT Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">PMDC Complete Learning Ecosystem</p>
            </div>
          </div>

          {/* Exam Countdown Badge */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-inner">
            <Timer className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              NMDCAT in <span className="font-bold text-emerald-400">{daysRemaining}</span> Days
            </span>
          </div>
        </div>

        {/* Scrollable Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-800/60 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    isActive 
                      ? 'bg-slate-950/20 text-slate-950' 
                      : item.badge === 'AI' 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

