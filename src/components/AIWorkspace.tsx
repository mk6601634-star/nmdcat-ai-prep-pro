import React from 'react';
import { AdvancedAiAndExamStrategy } from './AdvancedAiAndExamStrategy';
import { AiTutor } from './AiTutor';
import { StudyPlanner } from './StudyPlanner';
import { PrismWorkspace } from './prism/PrismWorkspace';
import { MCQQuestion, SyllabusTopic, SavedMistake, ExamAttempt, DailyTarget } from '../types';
import {
  MessageSquare,
  Sparkles,
  Bot,
  SlidersHorizontal,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import UiCard from './UiCard';

export interface AIWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  onApproveStagedMcq?: (newMcq: MCQQuestion) => void;
  topics?: SyllabusTopic[];
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  examHistory?: ExamAttempt[];
  setExamHistory?: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
  dailyTargets?: DailyTarget[];
  setDailyTargets?: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
  daysRemaining?: number;
}

export const AIWorkspace: React.FC<AIWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  topics = [],
  savedMistakes = [],
  setSavedMistakes,
  examHistory = [],
  setExamHistory,
  dailyTargets = [],
  setDailyTargets = () => {},
  daysRemaining = 30
}) => {
  return (
    <div className="space-y-6">
      {/* Workspace Sub Navigation */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'prism', label: 'PRISM Engine', icon: ShieldCheck, badge: 'Source-Verified' },
          { id: 'ai_chat', label: 'AI Tutor & Assistant', icon: MessageSquare, badge: '24/7' },
          { id: 'ai_strategy', label: 'PMDC Exam Strategy', icon: Sparkles, badge: 'High-Yield' },
          { id: 'ai_study_planner', label: 'AI Study Planner', icon: SlidersHorizontal }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id || (activeSubTab === 'advanced_ai' && sub.id === 'ai_strategy');

          return (
            <button
              key={sub.id}
              onClick={() => onNavigateToTab(sub.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {sub.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isActive ? 'bg-slate-950 text-cyan-400' : 'bg-purple-500/20 text-purple-300'}`}>
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Content */}
      {activeSubTab === 'prism' && (
        <PrismWorkspace
          savedMistakes={savedMistakes}
          setSavedMistakes={setSavedMistakes}
          setExamHistory={setExamHistory}
        />
      )}

      {(activeSubTab === 'ai_chat' || activeSubTab === 'ai_recommendations' || !activeSubTab || activeSubTab === 'default') && (
        <AiTutor savedMistakes={savedMistakes} topics={topics} examHistory={examHistory} />
      )}

      {(activeSubTab === 'ai_strategy' || activeSubTab === 'advanced_ai') && (
        <AdvancedAiAndExamStrategy />
      )}

      {(activeSubTab === 'ai_question_gen' || activeSubTab === 'studio') && (
        <UiCard className="max-w-xl mx-auto p-8 text-center space-y-4 border-cyan-500/20 bg-slate-950/95">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-300">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">AI Content Studio Moved to Admin CMS</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Material extraction, question batch generation, quality scoring, and publishing controls have been securely migrated to the dedicated Admin Panel.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('admin')}
            className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg transition-all"
          >
            <span>Open Dedicated Admin Panel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </UiCard>
      )}

      {activeSubTab === 'ai_study_planner' && (
        <StudyPlanner
          dailyTargets={dailyTargets}
          setDailyTargets={setDailyTargets}
          daysRemaining={daysRemaining}
          topics={topics}
          savedMistakes={savedMistakes}
          examHistory={examHistory}
        />
      )}
    </div>
  );
};


