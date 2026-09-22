import React from 'react';
import { GamificationSystem } from './GamificationSystem';
import { EcosystemAndAnalyticsSuite } from './EcosystemAndAnalyticsSuite';
import { ProductivityAndHabitHub } from './ProductivityAndHabitHub';
import { ExamAttempt, SyllabusTopic, SubjectType } from '../types';
import {
  PieChart,
  LineChart,
  TrendingUp,
  Trophy,
  Flame,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Target,
  BookOpen,
  Info
} from 'lucide-react';
import UiCard from './UiCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  calculateOverallAccuracy,
  calculateEstimatedScore,
  calculateSyllabusCoverage,
  calculateSubjectAnalytics,
  ALL_SUBJECTS
} from '../utils/analyticsCalculations';

export interface InsightsWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  examHistory: ExamAttempt[];
  topics: SyllabusTopic[];
}

export const InsightsWorkspace: React.FC<InsightsWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  examHistory,
  topics
}) => {
  // Deterministic Analytics Engine Calculations
  const accuracyResult = calculateOverallAccuracy(examHistory);
  const estimatedScoreResult = calculateEstimatedScore(examHistory);
  const syllabusResult = calculateSyllabusCoverage(topics, examHistory);
  const subjectStats = calculateSubjectAnalytics(examHistory);

  const chartData = ALL_SUBJECTS.map(sub => ({
    name: sub,
    accuracy: subjectStats[sub].accuracy,
    solved: subjectStats[sub].solved,
    correct: subjectStats[sub].correct,
    target: subjectStats[sub].target
  }));

  return (
    <div className="space-y-6">
      {/* Workspace Header Navigation */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'performance_dash', label: 'Performance Dashboard', icon: PieChart },
          { id: 'subject_analytics', label: 'Subject Analytics', icon: LineChart },
          { id: 'progress', label: 'Progress', icon: TrendingUp },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'study_streak', label: 'Study Streak', icon: Flame },
          { id: 'ai_insights', label: 'AI Insights', icon: Sparkles }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id || (activeSubTab === 'rewards' && sub.id === 'achievements') || (activeSubTab === 'ecosystem' && sub.id === 'ai_insights');

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
            </button>
          );
        })}
      </div>

      {/* Sub-view Content */}
      {(activeSubTab === 'performance_dash' || activeSubTab === 'subject_analytics' || activeSubTab === 'progress') && (
        <div className="space-y-6">
          <UiCard className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-950 to-slate-950 border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
              <BarChart3 className="w-4 h-4" />
              <span>NMDCAT Performance & Accuracy Analytics</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Subject-wise Mastery & Score Estimation</h2>
            <p className="text-xs text-slate-300">Deterministic metrics computed directly from authentic student attempts across all 5 PMDC subjects.</p>
          </UiCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Estimated NMDCAT Score */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2 relative group">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-xs text-slate-400 uppercase font-semibold">Estimated Score (Scaled)</p>
                <span className="text-[10px] text-cyan-400/80 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {estimatedScoreResult.confidenceLevel.toUpperCase()}
                </span>
              </div>
              <h3 className="text-3xl font-black text-cyan-300">
                {estimatedScoreResult.hasSufficientData ? estimatedScoreResult.estimatedScore : '—'}{' '}
                <span className="text-sm font-normal text-slate-400">/ {estimatedScoreResult.totalMarks}</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                {estimatedScoreResult.explanation}
              </p>
            </div>

            {/* 2. Overall MCQ Accuracy */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Overall MCQ Accuracy</p>
              <h3 className="text-3xl font-black text-teal-400">
                {accuracyResult.hasData ? accuracyResult.formattedAccuracy : '0%'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {accuracyResult.hasData ? `${accuracyResult.totalCorrect} / ${accuracyResult.totalSolved} Correct` : 'No Attempts Yet'}
              </p>
            </div>

            {/* 3. Truthful Syllabus Revised */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Syllabus Revised</p>
              <h3 className="text-3xl font-black text-amber-400">
                {syllabusResult.totalTopics > 0 ? `${syllabusResult.revisedPercentage}%` : '0%'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {syllabusResult.totalTopics > 0
                  ? `${syllabusResult.revisedCount} of ${syllabusResult.totalTopics} PMDC Topics Revised (${syllabusResult.totalSessionsCount} Test Sessions)`
                  : 'Syllabus Checklist Loading...'}
              </p>
            </div>
          </div>

          <UiCard className="p-6 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Subject Accuracy Breakdown (%)</h3>
                <p className="text-xs text-slate-400">Aggregated performance across individual drills and full multi-subject mock exams</p>
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Target: 85%+
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% (${item.payload.correct}/${item.payload.solved} Correct)`,
                      'Subject Accuracy'
                    ]}
                  />
                  <Bar dataKey="accuracy" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </UiCard>
        </div>
      )}

      {(activeSubTab === 'achievements' || activeSubTab === 'rewards') && (
        <GamificationSystem examHistory={examHistory} />
      )}

      {(activeSubTab === 'study_streak' || activeSubTab === 'productivity') && (
        <ProductivityAndHabitHub />
      )}

      {(activeSubTab === 'ai_insights' || activeSubTab === 'ecosystem') && (
        <EcosystemAndAnalyticsSuite />
      )}
    </div>
  );
};

