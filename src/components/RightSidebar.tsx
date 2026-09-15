import React from 'react';
import {
  Sparkles,
  Flame,
  Target,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  Award,
  BookOpen,
  Bot
} from 'lucide-react';
import { ExamAttempt, SavedMistake, SyllabusTopic } from '../types';

export interface RightSidebarProps {
  onNavigateToTab: (tabId: string) => void;
  examHistory?: ExamAttempt[];
  savedMistakes?: SavedMistake[];
  topics?: SyllabusTopic[];
  daysRemaining?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ onNavigateToTab, examHistory = [], savedMistakes = [], topics = [], daysRemaining = 0 }) => {
  const totalQuestionsSolved = examHistory.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
  const totalCorrect = examHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);
  const accuracy = totalQuestionsSolved > 0 ? Math.round((totalCorrect / totalQuestionsSolved) * 100) : 0;
  const streakDays = Math.max(1, Math.min(14, savedMistakes.length + 2));

  return (
    <aside className="w-80 shrink-0 hidden xl:flex flex-col space-y-5 sticky top-20 self-start">
      <div className="p-4 rounded-[28px] border border-slate-800/70 bg-slate-950/95 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.75)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-slate-200">Your Next Best Step</h3>
          </div>
          <button onClick={() => onNavigateToTab('ai')} className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold">
            Open AI
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Target className="w-3.5 h-3.5" />
              <span>Current focus</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {savedMistakes.length > 0 ? `${savedMistakes.length} mistakes are ready for review.` : 'Your review queue is clear. Start a new drill to build momentum.'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-teal-500/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Performance snapshot</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {totalQuestionsSolved > 0 ? `Accuracy is ${accuracy}% across ${totalQuestionsSolved} solved questions.` : 'No solved questions yet. Your first practice set will populate this view.'}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Study momentum</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {topics.length > 0 ? `${topics.length} PMDC topics are available for sequential learning.` : 'No topic progress has been loaded yet.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-3xl border border-slate-800/80 bg-slate-900/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-slate-200">Study streak</h3>
          </div>
          <span className="text-xs font-bold text-emerald-400">{streakDays} days</span>
        </div>

        <div className="flex items-center justify-between px-2 pt-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${idx < 5 ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700/50'}`}>
                {idx < 5 ? <CheckCircle2 className="w-3.5 h-3.5" /> : day}
              </div>
              <span className="text-[9px] text-slate-400">{day}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Exam countdown</span>
            <span className="font-bold text-slate-200">{daysRemaining} days</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${Math.min(100, 100 - daysRemaining) }%` }} />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Lightbulb className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-[0.24em]">Daily guidance</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {daysRemaining > 0 ? `Keep the loop simple: learn one topic, revise it once, and finish with a short practice set.` : 'Use your final review window for high-yield recap, error review, and confidence-building.'}
        </p>
      </div>
    </aside>
  );
};
