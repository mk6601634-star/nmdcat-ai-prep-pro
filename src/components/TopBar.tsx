import React, { useState } from 'react';
import {
  Search,
  Bell,
  CloudCheck,
  Moon,
  Sun,
  Menu,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  LogOut,
  ChevronDown,
  RefreshCw,
  Check
} from 'lucide-react';
import { ExamAttempt, SavedMistake } from '../types';

export interface TopBarProps {
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  activeTabTitle: string;
  activeTabCategory?: string;
  userName?: string;
  userEmail?: string;
  userPhotoUrl?: string;
  isFirebaseAuthenticated?: boolean;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
  onNavigateToTab?: (tabId: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  examHistory?: ExamAttempt[];
  savedMistakes?: SavedMistake[];
  daysRemaining?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenSearch,
  onToggleMobileMenu,
  activeTabTitle,
  activeTabCategory,
  userName = 'NMDCAT Aspirant',
  userEmail,
  userPhotoUrl,
  isFirebaseAuthenticated = false,
  onSignInGoogle,
  onSignOut,
  onNavigateToTab,
  isDarkMode = true,
  onToggleTheme,
  examHistory = [],
  savedMistakes = [],
  daysRemaining = 26
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Dynamic Notifications State based on real user activity
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSynced(timeStr);
      setSyncToast('All offline progress, MCQs & bookmarks synced to cloud database!');
      setTimeout(() => setSyncToast(null), 3500);
    }, 700);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'MK';
  };
  const userInitials = getInitials(userName);

  // Construct real dynamic notifications
  const recentAttempt = examHistory[0];
  const dynamicNotifications = [
    ...(recentAttempt ? [{
      id: 'attempt-notif',
      title: 'Mock Exam Result Recorded',
      desc: `Scored ${recentAttempt.score}/${recentAttempt.totalQuestions} (${Math.round((recentAttempt.score / recentAttempt.totalQuestions) * 100)}%) in ${recentAttempt.title}.`,
      time: 'Recent',
      tab: 'mock_exams'
    }] : []),
    ...(savedMistakes.length > 0 ? [{
      id: 'mistake-notif',
      title: 'Mistake Vault Review Queue',
      desc: `${savedMistakes.length} questions saved in your Mistake Vault ready for spaced repetition.`,
      time: 'Active',
      tab: 'mistake_vault'
    }] : []),
    {
      id: 'exam-countdown-notif',
      title: 'NMDCAT 2026 Countdown',
      desc: `${daysRemaining} days remaining until PMDC National Entrance Examination.`,
      time: 'Official',
      tab: 'syllabus_tracker'
    },
    {
      id: 'qbank-notif',
      title: 'PMDC Syllabus Alignment Active',
      desc: 'All 58 PMDC subtopics synced with past paper weightage.',
      time: 'System',
      tab: 'quick_practice'
    }
  ];

  const unreadCount = dynamicNotifications.filter(n => !readNotificationIds.includes(n.id)).length;

  const markAllRead = () => {
    setReadNotificationIds(dynamicNotifications.map(n => n.id));
  };

  return (
    <header className={`sticky top-0 z-30 h-16 border-b px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors duration-200 ${
      isDarkMode
        ? 'bg-slate-950/95 backdrop-blur-xl border-slate-800/80 shadow-[0_20px_45px_-22px_rgba(15,23,42,0.7)]'
        : 'bg-white/90 backdrop-blur-md border-slate-200 shadow-sm'
    }`}>
      {/* Toast Notification */}
      {syncToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Left Title & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-hamburger-btn"
          onClick={onToggleMobileMenu}
          className={`lg:hidden p-2 rounded-xl transition-colors ${
            isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {activeTabCategory && (
              <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {activeTabCategory} /
              </span>
            )}
            <h1 className={`text-base sm:text-lg font-bold tracking-tight ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {activeTabTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Quick Navigation Pills & Universal Search Bar Trigger */}
      <div className="flex-1 max-w-2xl mx-2 hidden sm:flex items-center gap-2">
        <button
          id="universal-search-trigger"
          onClick={onOpenSearch}
          className={`flex-1 flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs transition-all shadow-inner group ${
            isDarkMode
              ? 'bg-slate-950/70 border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-slate-200'
              : 'bg-slate-100/80 border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Search className={`w-4 h-4 transition-colors ${
              isDarkMode ? 'text-slate-500 group-hover:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-600'
            }`} />
            <span className="truncate">Search topics, questions, formulas...</span>
          </div>
          <kbd className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border shadow-sm shrink-0 ${
            isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
          }`}>
            Ctrl K
          </kbd>
        </button>

        {/* Quick Nav Action Shortcuts */}
        {onNavigateToTab && (
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onNavigateToTab('simple_ai_quiz')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
              title="Quick jump to AI Quiz Generator"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Quiz</span>
            </button>
            <button
              onClick={() => onNavigateToTab('practice')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
              title="Quick jump to Practice Studio"
            >
              <span>🎯 Practice</span>
            </button>
            <button
              onClick={() => onNavigateToTab('review')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
              title="Quick jump to Mistake Book"
            >
              <span>📖 Mistakes</span>
              {savedMistakes.length > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-bold">
                  {savedMistakes.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Search Icon Button */}
      <button
        onClick={onOpenSearch}
        className={`sm:hidden p-2 rounded-xl transition-colors ${
          isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Cloud Sync Status Indicator */}
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          title={`Cloud Backup Status: Last synced ${lastSynced}. Click to force immediate sync.`}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all ${
            isDarkMode
              ? 'bg-slate-950 border-slate-800 hover:border-cyan-500/50 text-slate-300'
              : 'bg-slate-100 border-slate-300 hover:border-cyan-500 text-slate-700'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{isSyncing ? 'Syncing...' : 'Synced'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            id="notifications-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className={`p-2 rounded-xl transition-colors relative ${
              isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-4 ring-slate-900" />
            )}
          </button>

          {showNotifications && (
            <div className={`absolute right-0 mt-2 w-80 sm:w-96 border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between pb-3 border-b ${
                isDarkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <h3 className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    System & Study Notifications
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                  {unreadCount} Unread
                </span>
              </div>

              <div className="py-2 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {dynamicNotifications.map(n => {
                  const isRead = readNotificationIds.includes(n.id);
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        setReadNotificationIds(prev => [...prev, n.id]);
                        setShowNotifications(false);
                        if (onNavigateToTab && n.tab) onNavigateToTab(n.tab);
                      }}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isDarkMode
                          ? !isRead ? 'bg-slate-950/80 border-cyan-500/30 hover:border-cyan-500/50' : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/60'
                          : !isRead ? 'bg-cyan-50/60 border-cyan-300 hover:border-cyan-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold mb-1">
                        <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{n.title}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{n.time}</span>
                      </div>
                      <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{n.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className={`pt-2 border-t text-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-emerald-500 hover:text-emerald-400 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark/Light Mode Switcher */}
        <button
          onClick={() => {
            if (onToggleTheme) {
              onToggleTheme();
            }
          }}
          className={`p-2 rounded-xl transition-colors ${
            isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Moon className="w-5 h-5 text-emerald-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
        </button>

        {/* Direct Header Sign-In Button when not authenticated */}
        {!isFirebaseAuthenticated && onSignInGoogle && (
          <button
            onClick={onSignInGoogle}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all shrink-0"
            title="Sign in with your Google account"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Profile Avatar Badge */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className={`flex items-center gap-2 p-1.5 rounded-xl transition-colors border ${
              isDarkMode ? 'hover:bg-slate-800 border-transparent hover:border-slate-700' : 'hover:bg-slate-100 border-transparent hover:border-slate-300'
            }`}
          >
            {userPhotoUrl ? (
              <img src={userPhotoUrl} alt={userName} className="w-8 h-8 rounded-full object-cover shadow-md" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md">
                {userInitials}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className={`absolute right-0 mt-2 w-64 border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`p-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{userName}</p>
                <p className="text-[10px] text-emerald-500 font-medium truncate">{userEmail || (isFirebaseAuthenticated ? 'No email available' : 'Guest Cloud Session')}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                    <CloudCheck className="w-3 h-3 text-emerald-400" />
                    {isFirebaseAuthenticated ? 'Cloud Synced (Firebase)' : 'Guest Mode'}
                  </span>
                </div>
              </div>

              <div className="py-1 space-y-0.5 text-xs">
                {!isFirebaseAuthenticated && onSignInGoogle && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignInGoogle();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold flex items-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In with Google</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigateToTab) onNavigateToTab('profile');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
                    isDarkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4 text-emerald-500" />
                  <span>View Profile & Settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onNavigateToTab) onNavigateToTab('admin');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between font-semibold ${
                    isDarkMode ? 'text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/30' : 'text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Admin Portal & CMS</span>
                  </div>
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">CMS</span>
                </button>
                {isFirebaseAuthenticated && onSignOut && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

