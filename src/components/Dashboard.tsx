import React, { useState, useEffect } from 'react';
import {
  SyllabusTopic,
  ExamAttempt,
  SavedMistake,
  DailyTarget,
  SubjectType
} from '../types';
import {
  Flame,
  Sparkles,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlayCircle,
  Sliders,
  Layers,
  AlertTriangle,
  Bot,
  TrendingUp,
  Dna,
  FlaskConical,
  Zap,
  Languages,
  Brain,
  CheckSquare,
  Square,
  Calendar,
  Award,
  BookOpen,
  Edit3,
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import UiCard from './UiCard';
import { generateAiPlanFromActualData } from '../utils/aiPlanner';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import {
  calculateOverallAccuracy,
  calculateReadinessScore,
  calculateSubjectAnalytics
} from '../utils/analyticsCalculations';

export interface DashboardProps {
  topics: SyllabusTopic[];
  examHistory: ExamAttempt[];
  savedMistakes: SavedMistake[];
  dailyTargets: DailyTarget[];
  setDailyTargets: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
  setActiveTab: (tab: string) => void;
  daysRemaining: number;
  userName?: string;
  setUserName?: (name: string) => void;
  examDate?: string;
  setExamDate?: (date: string) => void;
  targetScore?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  topics,
  examHistory,
  savedMistakes,
  dailyTargets,
  setDailyTargets,
  setActiveTab,
  daysRemaining,
  userName = 'NMDCAT Aspirant',
  setUserName,
  examDate = '2026-08-25',
  setExamDate,
  targetScore = NMDCAT_CONFIG.TOTAL_MCQS
}) => {
  const [isEditingQuickProfile, setIsEditingQuickProfile] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [tempDate, setTempDate] = useState(examDate);

  const handleSaveQuickProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (setUserName) setUserName(tempName.trim() || 'Mehran Khan');
    if (setExamDate) setExamDate(tempDate);
    setIsEditingQuickProfile(false);
  };

  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const toggleTarget = (id: string) => {
    setDailyTargets(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedTargetsCount = dailyTargets.filter(t => t.completed).length;
  const targetPct = dailyTargets.length > 0 ? Math.round((completedTargetsCount / dailyTargets.length) * 100) : 0;

  // Deterministic calculation engine for dashboard metrics
  const accuracyResult = calculateOverallAccuracy(examHistory);
  const readinessResult = calculateReadinessScore(examHistory, savedMistakes);
  const subjectAnalytics = calculateSubjectAnalytics(examHistory);

  const hasUserActivity = accuracyResult.hasData;
  const overallProgressPct = accuracyResult.accuracyPercentage;
  const readinessPct = readinessResult.readinessScore;

  // Subject Progress Calculations dynamically from real user exam history
  const subjects: { name: SubjectType; icon: React.ElementType; color: string; pct: number }[] = (
    [
      { name: 'Biology' as SubjectType, icon: Dna, color: 'text-cyan-400' },
      { name: 'Chemistry' as SubjectType, icon: FlaskConical, color: 'text-teal-400' },
      { name: 'Physics' as SubjectType, icon: Zap, color: 'text-amber-400' },
      { name: 'English' as SubjectType, icon: Languages, color: 'text-indigo-400' },
      { name: 'Logical Reasoning' as SubjectType, icon: Brain, color: 'text-purple-400' }
    ]
  ).map(sub => {
    const stats = subjectAnalytics[sub.name];
    return { ...sub, pct: stats.accuracy };
  });

  const primaryActions = [
    {
      id: 'topic_quiz',
      title: 'Topic Quiz',
      subtitle: 'Targeted topic practice (DB or AI)',
      icon: CheckSquare,
      badge: 'Topic',
      color: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30',
      action: () => setActiveTab('practice')
    },
    {
      id: 'ai_material_studio',
      title: 'AI Textbook & Guide Extractor',
      subtitle: 'Paste textbook text -> 1-Click Database Approval',
      icon: Bot,
      badge: '1-Click DB',
      color: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30',
      action: () => setActiveTab('ai_question_gen')
    },
    {
      id: 'quick_practice_launch',
      title: 'Practice MCQs & Drills',
      subtitle: 'Instant subject-wise PMDC question bank',
      icon: Zap,
      badge: '2000+ MCQs',
      color: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30',
      action: () => setActiveTab('quick_practice')
    },
    {
      id: 'sequential_practice_launch',
      title: 'PMDC Syllabus Guide',
      subtitle: 'Chapter-wise step-by-step preparation',
      icon: PlayCircle,
      badge: 'FSc Syllabus',
      color: 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30',
      action: () => setActiveTab('sequential_practice')
    },
    {
      id: 'mock_exams_launch',
      title: 'PMDC Mock Exams',
      subtitle: `Timed full-length exam simulation (${NMDCAT_CONFIG.TOTAL_MCQS} MCQs)`,
      icon: Award,
      badge: 'Real Exam',
      color: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30',
      action: () => setActiveTab('mock_exams')
    },
    {
      id: 'review_flashcards_launch',
      title: 'Study Library & Flashcards',
      subtitle: 'Cloze cards, formulas, and mind maps',
      icon: Layers,
      badge: 'Cloze Decks',
      color: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30',
      action: () => setActiveTab('notes')
    },
    {
      id: 'mistake_book_launch',
      title: 'Mistake Book & Vault',
      subtitle: savedMistakes.length > 0 ? `${savedMistakes.length} mistakes saved for SRS review` : 'Review incorrect question history',
      icon: AlertTriangle,
      badge: `${savedMistakes.length} Logged`,
      color: 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30',
      action: () => setActiveTab('mistake_book')
    }
  ];

  const handleSyncPlanFromActualData = () => {
    const freshPlan = generateAiPlanFromActualData(topics, savedMistakes, examHistory);
    setDailyTargets(freshPlan);
  };

  useEffect(() => {
    if (dailyTargets.length === 0) {
      handleSyncPlanFromActualData();
    }
  }, [topics.length, savedMistakes.length]);

  const toggleStudyTask = (taskId: string) => {
    setDailyTargets(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: !t.completed, autoCovered: false } : t))
    );
  };

  const completedStudyPlanCount = dailyTargets.filter(t => t.completed).length;
  const studyPlanPct = dailyTargets.length > 0 ? Math.round((completedStudyPlanCount / dailyTargets.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <UiCard className="rounded-[32px] border-cyan-500/20 bg-gradient-to-br from-cyan-950/70 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Learning command center</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100">
                Good morning, {userName}
              </h2>
              <span className="rounded-full border border-cyan-500/30 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                PMDC Aspirant
              </span>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Your study flow is centered on one simple loop: learn, revise, practice, and review. You have <span className="font-semibold text-cyan-300">{daysRemaining} days</span> left until your target exam date.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setTempName(userName);
                  setTempDate(examDate);
                  setIsEditingQuickProfile(!isEditingQuickProfile);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:border-cyan-500/40"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingQuickProfile ? 'Cancel edit' : 'Edit profile & date'}</span>
              </button>
              <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-300">
                Target score: {Math.max(150, Math.min(180, targetScore || NMDCAT_CONFIG.TOTAL_MCQS))} / 180
              </div>
            </div>

            {isEditingQuickProfile && (
              <form onSubmit={handleSaveQuickProfile} className="max-w-xl rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4 text-xs shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2 font-bold text-slate-200">
                    <Edit3 className="w-4 h-4 text-cyan-300" /> Quick profile update
                  </span>
                  <button type="button" onClick={() => setIsEditingQuickProfile(false)} className="text-slate-400 hover:text-slate-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-slate-400">Full name</label>
                    <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Enter full name" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-400">Exam date</label>
                    <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} className="w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditingQuickProfile(false)} className="rounded-lg bg-slate-800 px-3 py-2 font-semibold text-slate-300">Cancel</button>
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 font-bold text-slate-950">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center gap-4 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent" />
                <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" className="text-cyan-400 transition-all duration-1000" fill="transparent" strokeDasharray={150} strokeDashoffset={hasUserActivity ? 150 - (150 * (readinessPct / 100)) : 150} />
              </svg>
              <span className="absolute text-sm font-black text-slate-100">{hasUserActivity ? `${readinessPct}%` : '0%'}</span>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Readiness</p>
              <p className="text-sm font-bold text-cyan-300">{hasUserActivity ? `Target: ${NMDCAT_CONFIG.TOTAL_MCQS}+ / 180` : 'Not started yet'}</p>
              <p className="text-xs text-slate-400">{completedTargetsCount}/{dailyTargets.length} daily tasks covered</p>
            </div>
          </div>
        </div>
      </UiCard>

      {/* Primary Action Cards (Quick Access Grid) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          What Should I Do Now?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {primaryActions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={act.action}
                className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 transition-all text-left flex items-center justify-between group shadow-2xl shadow-cyan-950/10"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-xl ${act.color} flex items-center justify-center shrink-0 shadow-lg`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{act.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 transition-colors shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Overview (Subject Breakdown) */}
      <UiCard className="p-5 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Your Progress Overview</h3>
          </div>
          <span className="text-xs font-semibold text-cyan-300">
            Overall Progress {overallProgressPct}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {subjects.map(sub => {
            const Icon = sub.icon;
            return (
              <div key={sub.name} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${sub.color}`} />
                    <span className="text-xs font-bold text-slate-200 truncate">{sub.name}</span>
                  </div>
                  <span className={`text-xs font-black ${sub.color}`}>{sub.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${sub.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </UiCard>

      {/* Two Column Layout: Today's AI Study Plan & Upcoming Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's AI Study Plan */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Today&apos;s AI Study Plan</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold flex items-center gap-1">
              </span>
            </div>
            
            <button
              onClick={handleSyncPlanFromActualData}
              className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 font-medium transition-colors"
              title="Regenerate AI study plan using your real PMDC syllabus progress and saved mistakes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync with My Data</span>
            </button>
          </div>

          <div className="space-y-2">
            {dailyTargets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No active targets in plan. Click <span className="text-cyan-300 font-semibold cursor-pointer" onClick={handleSyncPlanFromActualData}>Sync with My Data</span> to generate today&apos;s AI targets!
              </div>
            ) : (
              dailyTargets.map(task => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    task.completed 
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-75' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleStudyTask(task.id)}
                      className="text-cyan-300 shrink-0 hover:scale-110 transition-transform"
                      aria-label="Toggle task completion"
                    >
                      {task.completed ? <CheckCircle2 className="w-4 h-4 text-cyan-300" /> : <Square className="w-4 h-4 text-slate-600 hover:text-cyan-300" />}
                    </button>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                          {task.title}
                        </p>
                        {task.autoCovered && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium shrink-0 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Auto-Covered by AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-300">{task.subject}</span>
                        {task.duration && (
                          <>
                            <span>&bull;</span>
                            <span>{task.duration}</span>
                          </>
                        )}
                        {task.topicName && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[140px] text-slate-400">{task.topicName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${
                    task.priority === 'High' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {task.priority || 'Medium'} Priority
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
            <span>{completedStudyPlanCount} / {dailyTargets.length} Tasks Covered</span>
            <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${studyPlanPct}%` }} />
            </div>
          </div>
        </div>

        {/* Upcoming Section */}
        <div className="lg:col-span-1">
          <UiCard className="p-5 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Calendar className="w-4 h-4 text-cyan-300" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Upcoming Tasks & SRS</h3>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setActiveTab('flashcards')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">SRS Reviews</h4>
                    <p className="text-[10px] text-slate-400">
                      {savedMistakes.length > 0 ? `${savedMistakes.length} cards queued for spaced repetition` : 'No reviews pending'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>

              <div
                onClick={() => setActiveTab('mock_exams')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-300">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Mock Exam</h4>
                    <p className="text-[10px] text-slate-400">
                      {examHistory.length > 0 ? `${examHistory.length} attempts completed` : `Full PMDC ${NMDCAT_CONFIG.TOTAL_MCQS} MCQ Practice Ready`}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>

              <div
                onClick={() => setActiveTab('sequential_practice')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Sequential Practice</h4>
                    <p className="text-[10px] text-slate-400">Cell Biology & Organelles Unit</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>

              <div
                onClick={() => setActiveTab('weak_topics')}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Weak Topics</h4>
                    <p className="text-[10px] text-slate-400">
                      {savedMistakes.length > 0 ? `${savedMistakes.length} flagged questions to review` : '0 weak topics identified'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </UiCard>
        </div>
      </div>

      {/* Recent Activity Widget */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Recent Activity</h3>
        <div className="space-y-2">
          {examHistory.length > 0 ? (
            examHistory.slice(-3).reverse().map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-300 flex items-center justify-center font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{item.examTitle || `${item.subject} Practice Session`}</p>
                    <p className="text-[10px] text-slate-400">{item.dateCompleted ? new Date(item.dateCompleted).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-cyan-300">{item.score} / {item.totalQuestions} ({item.percentage}%)</span>
                  <button
                    onClick={() => setActiveTab('mistake_book')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              No recent exam activity recorded yet. Take a test or start sequential practice to see your activity logged here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
