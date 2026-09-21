import React from 'react';
import { PracticeDrill } from './PracticeDrill';
import { CustomTestBuilder } from './CustomTestBuilder';
import { MockExam } from './MockExam';
import TopicQuizBuilder from './TopicQuizBuilder';
import TopicQuizRunner from './TopicQuizRunner';
import UiCard from './UiCard';
import { MCQQuestion, SavedMistake, ExamAttempt, SyllabusTopic, SubjectType, DailyTarget } from '../types';
import { autoClearPlannerTasks } from '../utils/aiPlanner';
import {
  Zap,
  Sliders,
  Award,
  FileCheck,
  Flame,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export interface PracticeWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  questionBank: MCQQuestion[];
  savedMistakes: SavedMistake[];
  setSavedMistakes: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  examHistory: ExamAttempt[];
  setExamHistory: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
  topics: SyllabusTopic[];
  drillSubject: SubjectType;
  drillTopic?: string;
  setDailyTargets?: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
}

export const PracticeWorkspace: React.FC<PracticeWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  questionBank,
  savedMistakes,
  setSavedMistakes,
  examHistory,
  setExamHistory,
  topics,
  drillSubject,
  drillTopic,
  setDailyTargets
}) => {
  const [showTopicBuilder, setShowTopicBuilder] = React.useState(false);
  const [runningQuiz, setRunningQuiz] = React.useState<{ questions: any[]; source: 'DATABASE' | 'AI'; meta: any } | null>(null);
  return (
    <div className="space-y-6">
      <UiCard className="rounded-[32px] border-cyan-500/20 bg-gradient-to-br from-cyan-950/85 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Practice studio</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100">Turn revision into high-yield practice</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose the mode that fits your current weakness, then move straight into timed questions, custom tests, or AI-assisted review.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Available modes</p>
            <p className="mt-1 font-semibold text-slate-100">Quick practice, mock exams, custom builder, and past papers</p>
          </div>
        </div>
      </UiCard>

      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'quick_practice', label: 'Quick Practice', icon: Zap },
          { id: 'custom_builder', label: 'Custom Test Builder', icon: Sliders, badge: 'Pro' },
          { id: 'mock_exams', label: 'Mock Exams', icon: Award },
          { id: 'past_papers', label: 'Past Papers', icon: FileCheck },
          { id: 'challenge_mode', label: 'Challenge Mode', icon: Flame, badge: 'Hot' }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id || (activeSubTab === 'practice' && sub.id === 'quick_practice');

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
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Content Switching */}
      {(activeSubTab === 'quick_practice' || activeSubTab === 'practice') && (
        <PracticeDrill
          questionBank={questionBank}
          savedMistakes={savedMistakes}
          setSavedMistakes={setSavedMistakes}
          initialSubject={drillSubject}
          initialTopic={drillTopic}
        />
      )}
      <div className="mt-4">
        <button onClick={() => setShowTopicBuilder(true)} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-900 font-bold">Start Topic Quiz</button>
      </div>

      {showTopicBuilder && (
        <TopicQuizBuilder
          questionBank={questionBank}
          onStartQuiz={(questions, source, meta) => {
            setRunningQuiz({ questions, source, meta });
            setShowTopicBuilder(false);
          }}
          onClose={() => setShowTopicBuilder(false)}
        />
      )}

      {runningQuiz && (
        <TopicQuizRunner questions={runningQuiz.questions} source={runningQuiz.source} meta={runningQuiz.meta} onClose={() => setRunningQuiz(null)} />
      )}

      {activeSubTab === 'custom_builder' && (
        <CustomTestBuilder
          questionBank={questionBank}
          savedMistakes={savedMistakes}
          examHistory={examHistory}
          topics={topics}
          setSavedMistakes={setSavedMistakes}
          onSaveExamAttempt={(attempt) => {
            setExamHistory(prev => [attempt, ...prev]);
            if (setDailyTargets) {
              setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'exam' }));
            }
          }}
        />
      )}

      {(activeSubTab === 'mock_exams' || activeSubTab === 'mock') && (
        <MockExam
          questionBank={questionBank}
          savedMistakes={savedMistakes}
          setSavedMistakes={setSavedMistakes}
          examHistory={examHistory}
          setExamHistory={(updater) => {
            setExamHistory(updater);
            if (setDailyTargets) {
              setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'exam' }));
            }
          }}
        />
      )}

      {activeSubTab === 'past_papers' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <FileCheck className="w-4 h-4" />
              <span>PMDC Official Past Papers Vault (2018 - 2025)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Solve Authentic NMDCAT Past Paper Questions</h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Practice verified past paper MCQs with step-by-step solutions, examiner notes, and frequency weightage tags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { year: '2025 PMDC National Paper', qs: 200, time: '210 mins', difficulty: 'Hard', attempts: 1420 },
              { year: '2024 PMDC Paper (UHS/KHMU)', qs: 200, time: '210 mins', difficulty: 'Medium', attempts: 2100 },
              { year: '2023 PMDC Paper (DUHS/SZABMU)', qs: 200, time: '210 mins', difficulty: 'Hard', attempts: 1890 },
              { year: '2022 PMC Past Paper', qs: 200, time: '210 mins', difficulty: 'Medium', attempts: 1650 },
              { year: '2021 PMC Past Paper', qs: 210, time: '210 mins', difficulty: 'Medium', attempts: 1400 },
              { year: 'High Yield Topic-Wise Past Paper Vault', qs: 450, time: 'Self-Paced', difficulty: 'Mixed', attempts: 3200 }
            ].map((p, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {p.difficulty}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {p.time}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{p.year}</h3>
                <p className="text-xs text-slate-400">{p.qs} Questions &bull; {p.attempts} Students Completed</p>

                <button
                  onClick={() => onNavigateToTab('mock_exams')}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/10"
                >
                  <span>Launch Past Paper</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'challenge_mode' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <Flame className="w-4 h-4 animate-pulse" />
              <span>Speed Sprint Challenge Mode</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Test Your Speed & Accuracy Under Pressure</h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              20 High-yield MCQs in 12 minutes. Earn bonus streak points, unlock badges, and climb the leaderboard!
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <Flame className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Daily Speed Challenge</h3>
            <p className="text-xs text-slate-400">
              Random mix of Physics, Chemistry, and Biology questions with tight timer constraints.
            </p>
            <button
              onClick={() => onNavigateToTab('quick_practice')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform"
            >
              Start Speed Challenge Now ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
