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
  Target
} from 'lucide-react';
import UiCard from './UiCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const totalQuestionsSolved = examHistory.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
  const totalCorrect = examHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);
  const hasUserActivity = totalQuestionsSolved > 0;

  const overallAccuracy = hasUserActivity ? Math.round((totalCorrect / totalQuestionsSolved) * 100) : 0;
  const predictedScore = hasUserActivity ? Math.round((totalCorrect / totalQuestionsSolved) * 200) : 0;

  const subjectNames: SubjectType[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
  
  const chartData = subjectNames.map(sub => {
    const subAttempts = examHistory.filter(a => a.subject === sub);
    const subSolved = subAttempts.reduce((s, a) => s + (a.totalQuestions || 0), 0);
    const subScore = subAttempts.reduce((s, a) => s + (a.score || 0), 0);
    const accuracy = subSolved > 0 ? Math.round((subScore / subSolved) * 100) : 0;
    return { name: sub, accuracy, target: 85 };
  });

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
            <h2 className="text-xl font-bold text-slate-100">Subject-wise Mastery & Predictive Score</h2>
            <p className="text-xs text-slate-300">Track your progress across Biology, Chemistry, Physics, English, and Logical Reasoning.</p>
          </UiCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Predicted NMDCAT Score</p>
              <h3 className="text-3xl font-black text-cyan-300">
                {hasUserActivity ? predictedScore : '0'} <span className="text-sm font-normal text-slate-400">/ 180</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {hasUserActivity ? `Based on ${examHistory.length} test attempts` : 'No test attempts recorded'}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Overall MCQ Accuracy</p>
              <h3 className="text-3xl font-black text-teal-400">
                {hasUserActivity ? `${overallAccuracy}%` : '0%'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {hasUserActivity ? `${totalCorrect} / ${totalQuestionsSolved} Correct` : 'No Data Yet'}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400 uppercase font-semibold">Syllabus Revised</p>
              <h3 className="text-3xl font-black text-amber-400">
                {hasUserActivity ? `${Math.min(100, Math.round((examHistory.length / 10) * 100))}%` : '0%'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {hasUserActivity ? `${examHistory.length} Sessions Completed` : 'No Units Completed Yet'}
              </p>
            </div>
          </div>

          <UiCard className="p-6 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Subject Accuracy Breakdown (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} />
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
