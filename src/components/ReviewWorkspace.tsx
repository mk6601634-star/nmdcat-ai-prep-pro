import React from 'react';
import UiCard from './UiCard';
import { MistakeVault } from './MistakeVault';
import { AdaptiveLearningEngine } from './AdaptiveLearningEngine';
import { SmartRevisionScheduler } from './SmartRevisionScheduler';
import { SavedMistake, MCQQuestion, DailyTarget, SyllabusTopic } from '../types';
import { autoClearPlannerTasks } from '../utils/aiPlanner';
import {
  AlertTriangle,
  Target,
  Bookmark,
  RotateCcw,
  ListFilter,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export interface ReviewWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  savedMistakes: SavedMistake[];
  setSavedMistakes: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  questionBank: MCQQuestion[];
  setDailyTargets?: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
  topics?: SyllabusTopic[];
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  savedMistakes,
  setSavedMistakes,
  questionBank,
  setDailyTargets,
  topics = []
}) => {
  return (
    <div className="space-y-6">
      <UiCard className="rounded-[32px] border-emerald-500/20 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-emerald-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Review loop</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100">Turn mistakes into long-term retention</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Your review experience is organized around mistakes, weak topics, and spaced repetition so that every mistake becomes a lesson.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Review queue</p>
            <p className="mt-1 font-semibold text-slate-100">{savedMistakes.length} saved mistakes ready for follow-up</p>
          </div>
        </div>
      </UiCard>

      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'mistake_book', label: 'Mistake Book', icon: AlertTriangle, badge: `${savedMistakes.length}` },
          { id: 'weak_topics', label: 'Weak Topics', icon: Target },
          { id: 'bookmarks', label: 'Bookmarked Questions', icon: Bookmark },
          { id: 'srs_review', label: 'SRS Review', icon: RotateCcw },
          { id: 'incorrect_qs', label: 'Incorrect Questions', icon: ListFilter },
          { id: 'revision_queue', label: 'Revision Queue', icon: CheckCircle2 }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id || (activeSubTab === 'mistakes' && sub.id === 'mistake_book') || (activeSubTab === 'srs' && sub.id === 'srs_review');

          return (
            <button
              key={sub.id}
              onClick={() => onNavigateToTab(sub.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {sub.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-rose-500/20 text-rose-300'}`}>
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-view Content Rendering */}
      {(activeSubTab === 'mistake_book' || activeSubTab === 'mistakes') && (
        <MistakeVault
          savedMistakes={savedMistakes}
          setSavedMistakes={(updater) => {
            setSavedMistakes(updater);
            if (setDailyTargets) {
              setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'mistake' }));
            }
          }}
          setActiveTab={onNavigateToTab}
        />
      )}

      {(activeSubTab === 'weak_topics' || activeSubTab === 'adaptive') && (
        <AdaptiveLearningEngine
          savedMistakes={savedMistakes}
          topics={topics}
          onStartRevisionQuiz={() => onNavigateToTab('quick_practice')}
        />
      )}

      {(activeSubTab === 'srs_review' || activeSubTab === 'srs') && (
        <SmartRevisionScheduler
          topics={topics}
          savedMistakes={savedMistakes}
          onStartDrill={() => onNavigateToTab('quick_practice')}
        />
      )}

      {activeSubTab === 'bookmarks' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Bookmark className="w-4 h-4" />
              <span>Bookmarked Questions & Favorites</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Saved High-Yield Questions for Revision</h2>
            <p className="text-xs text-slate-300">Quickly revisit questions you flagged during practice drills or mock exams.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionBank.slice(0, 4).map((q, idx) => (
              <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">{q.subject} &bull; {q.chapter}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">{q.difficulty}</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 line-clamp-2">{q.question}</p>
                <button
                  onClick={() => onNavigateToTab('quick_practice')}
                  className="text-xs text-emerald-400 font-bold hover:underline"
                >
                  Solve Question Again &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeSubTab === 'incorrect_qs' || activeSubTab === 'revision_queue') && (
        <MistakeVault
          savedMistakes={savedMistakes}
          setSavedMistakes={setSavedMistakes}
          setActiveTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
