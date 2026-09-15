import React, { useState } from 'react';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import { GamificationState, LeaderboardUser, ExamAttempt } from '../types';
import { 
  Trophy, 
  Flame, 
  Award, 
  Coins, 
  Zap, 
  CheckCircle, 
  Medal, 
  Star, 
  Crown, 
  Users, 
  Sparkles,
  ShieldAlert,
  ArrowUp
} from 'lucide-react';

interface GamificationSystemProps {
  examHistory?: ExamAttempt[];
}

export const GamificationSystem: React.FC<GamificationSystemProps> = ({ examHistory = [] }) => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'achievements' | 'leaderboard'>('challenges');
  const [provinceFilter, setProvinceFilter] = useState<string>('Punjab');

  const totalQuestionsSolved = examHistory.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
  const totalCorrect = examHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);
  const hasUserActivity = totalQuestionsSolved > 0;

  const calculatedXp = totalCorrect * 10;
  const calculatedLevel = Math.max(1, Math.floor(calculatedXp / 500) + 1);
  const calculatedAccuracy = hasUserActivity ? parseFloat(((totalCorrect / totalQuestionsSolved) * 100).toFixed(1)) : 0;

  // Gamification State
  const [gamification, setGamification] = useState<GamificationState>({
    xp: calculatedXp,
    level: calculatedLevel,
    coins: totalCorrect * 2,
    streakDays: hasUserActivity ? 1 : 0,
    completedChallengesCount: examHistory.length,
    leaderboardRank: hasUserActivity ? 12 : 0,
    dailyMissions: [
      { id: 'dm1', task: 'Solve 30 Biology MCQs with >80% accuracy', xpReward: 150, completed: hasUserActivity && totalQuestionsSolved >= 30 },
      { id: 'dm2', task: 'Complete 15-minute Pomodoro focus session', xpReward: 100, completed: false },
      { id: 'dm3', task: 'Review 10 SRS Flashcards in Chemistry', xpReward: 120, completed: false }
    ],
    achievements: [
      { id: 'a1', title: 'Organic Chemistry Wizard', description: 'Solve 100 Organic Chemistry practice questions correctly', icon: '🧪', unlocked: totalCorrect >= 100, progress: Math.min(100, totalCorrect), maxProgress: 100, xpReward: 300 },
      { id: 'a2', title: '7-Day Study Flame', description: 'Maintain a 7-day continuous study streak', icon: '🔥', unlocked: false, progress: hasUserActivity ? 1 : 0, maxProgress: 7, xpReward: 500 },
      { id: 'a3', title: 'Mock Exam Crusher', description: `Score >90% in a ${NMDCAT_CONFIG.TOTAL_MCQS} MCQ PMDC Full Mock Exam`, icon: '👑', unlocked: false, progress: hasUserActivity ? Math.min(90, Math.round(calculatedAccuracy)) : 0, maxProgress: 90, xpReward: 1000 },
      { id: 'a4', title: 'Vocabulary Virtuoso', description: 'Master all 100 PMDC high-yield English vocabulary words', icon: '📚', unlocked: false, progress: 0, maxProgress: 100, xpReward: 400 }
    ]
  });

  // Provincial Leaderboard: no hardcoded demo entries. Show empty state until live leaderboard data is available.
  const leaderboardUsers: LeaderboardUser[] = [];

  const handleClaimMission = (id: string, xpReward: number) => {
    setGamification(prev => ({
      ...prev,
      xp: prev.xp + xpReward,
      coins: prev.coins + 50,
      dailyMissions: prev.dailyMissions.map(m => m.id === id ? { ...m, completed: true } : m)
    }));
    alert(`Challenge completed! Earned +${xpReward} XP and +50 Coins!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <Trophy className="w-4 h-4" />
            <span>Gamification & Rewards Engine</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            XP, Badges & Provincial Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Stay motivated with level progressions, daily study challenges, streak bonuses, and competitive provincial rankings.
          </p>
        </div>

        {/* Level & XP Cards */}
        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div className="text-center px-3 border-r border-slate-800">
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{gamification.streakDays} Days</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Streak</span>
          </div>

          <div className="text-center px-3 border-r border-slate-800">
            <div className="flex items-center gap-1 text-indigo-400 text-xs font-bold">
              <Zap className="w-4 h-4 fill-indigo-400" />
              <span>Level {gamification.level}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">{gamification.xp} XP</span>
          </div>

          <div className="text-center px-3">
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>{gamification.coins}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Coins</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'challenges' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Daily Missions
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'achievements' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Badges & Milestones
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'leaderboard' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Leaderboard 🏆
        </button>
      </div>

      {/* TAB 1: Daily Challenges */}
      {activeTab === 'challenges' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Daily Study Missions</h3>
              <p className="text-xs text-slate-400">Resets every 24 hours. Complete to earn XP and Coins.</p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              {gamification.dailyMissions.filter(m => m.completed).length} / {gamification.dailyMissions.length} Complete
            </span>
          </div>

          <div className="space-y-3">
            {gamification.dailyMissions.map((m) => (
              <div key={m.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-200">{m.task}</h4>
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-amber-400" />
                    +{m.xpReward} XP &bull; +50 Coins
                  </span>
                </div>

                {m.completed ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleClaimMission(m.id, m.xpReward)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                  >
                    Claim XP
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Badges & Milestones */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gamification.achievements.map((a) => (
            <div key={a.id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div>
                  <h4 className="font-bold text-sm text-white">{a.title}</h4>
                  <p className="text-xs text-slate-400">{a.description}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-amber-400 font-bold">{a.progress} / {a.maxProgress}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${(a.progress / a.maxProgress) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Provincial Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Provincial PMDC Aspirant Rankings</span>
              </h3>
              <p className="text-xs text-slate-400">Top medical admission candidates in Pakistan.</p>
            </div>

            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              <option value="Punjab">Punjab Province</option>
              <option value="Sindh">Sindh Province</option>
              <option value="KPK">Khyber Pakhtunkhwa</option>
              <option value="Federal">Federal & Islamabad</option>
              <option value="Balochistan">Balochistan</option>
            </select>
          </div>

          <div className="space-y-2 text-center text-slate-400">
            No leaderboard data available yet. Leaderboard will populate once enough user activity exists.
          </div>
        </div>
      )}
    </div>
  );
};
