import React, { useState } from 'react';
import { SequentialPracticeMode } from './SequentialPracticeMode';
import { StudyPlanner } from './StudyPlanner';
import { AiTutor } from './AiTutor';
import { MCQQuestion, SyllabusTopic, DailyTarget, SavedMistake, ExamAttempt } from '../types';
import { autoClearPlannerTasks } from '../utils/aiPlanner';
import {
  Compass,
  GitCommit,
  Calendar,
  Bot,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react';
import UiCard from './UiCard';

export interface LearnWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  questionBank: MCQQuestion[];
  topics: SyllabusTopic[];
  dailyTargets: DailyTarget[];
  setDailyTargets: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
  daysRemaining: number;
  savedMistakes?: SavedMistake[];
  examHistory?: ExamAttempt[];
}

export const LearnWorkspace: React.FC<LearnWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  questionBank,
  topics,
  dailyTargets,
  setDailyTargets,
  daysRemaining,
  savedMistakes = [],
  examHistory = []
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');

  const filteredTopics = selectedSubjectFilter === 'All'
    ? topics
    : topics.filter(t => t.subject === selectedSubjectFilter);

  return (
    <div className="space-y-6">
      <UiCard className="rounded-[32px] border-cyan-500/20 bg-gradient-to-br from-cyan-950/85 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              <Compass className="w-3.5 h-3.5" />
              <span>Sequential learning</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100">Learn in a guided, repeatable flow</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Follow your PMDC topics from study, to recall, to practice, and end with AI-guided review for the next best step.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Active topics</p>
              <p className="mt-1 text-lg font-bold text-slate-100">{topics.length}</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Study plan</p>
              <p className="mt-1 text-lg font-bold text-slate-100">{dailyTargets.length}</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Days left</p>
              <p className="mt-1 text-lg font-bold text-slate-100">{daysRemaining}</p>
            </div>
          </div>
        </div>
      </UiCard>

      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'sequential_practice', label: 'Sequential Practice', icon: GitCommit, badge: 'PMDC' },
          { id: 'study_plan', label: 'Study Plan', icon: Calendar },
          { id: 'learning_paths', label: 'Learning Paths', icon: Compass },
          { id: 'ai_tutor', label: 'AI Tutor', icon: Bot, badge: '24/7' }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id;

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
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Content Switching */}
      {activeSubTab === 'sequential_practice' && (
        <SequentialPracticeMode
          questionBank={questionBank}
          onNavigateToTab={onNavigateToTab}
          onCompleteObjective={(objId) => {
            setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'objective', objectiveId: objId }));
          }}
        />
      )}

      {activeSubTab === 'study_plan' && (
        <StudyPlanner
          dailyTargets={dailyTargets}
          setDailyTargets={setDailyTargets}
          daysRemaining={daysRemaining}
          topics={topics}
          savedMistakes={savedMistakes}
          examHistory={examHistory}
        />
      )}

      {activeSubTab === 'ai_tutor' && (
        <AiTutor />
      )}

      {activeSubTab === 'learning_paths' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>PMDC Official Learning Paths & Syllabus Tree</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Structured Chapter-by-Chapter Learning Roadmaps</h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Master every topic in sequence. Follow PMDC weightage guidelines from Biology Cell Structure to Physics Electromagnetism.
            </p>
          </div>

          {/* Subject Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {['All', 'Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'].map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubjectFilter(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedSubjectFilter === sub
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Topic Tree Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((t, idx) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {t.subject} &bull; Unit {idx + 1}
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {t.weightagePercentage}% Weight
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {t.topic}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {t.keyPoints.join(', ')}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Status: <strong className="text-slate-300">{t.status}</strong>
                  </span>
                  <button
                    onClick={() => onNavigateToTab('sequential_practice')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    <span>Start Path</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
