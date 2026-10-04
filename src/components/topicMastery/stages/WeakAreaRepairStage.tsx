import React from 'react';
import { 
  Zap, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle,
  Trophy
} from 'lucide-react';
import { TopicMasteryContext, TopicMasteryMCQResult, TopicMasteryFlashcardResult } from '../../../types/topicMastery';
import { identifyWeakAreasFromResults } from '../../../utils/topicMasteryUtils';
import { FormattedMathContent } from '../../FormattedMathContent';

interface WeakAreaRepairStageProps {
  context: TopicMasteryContext;
  mcqResults: TopicMasteryMCQResult[];
  flashcardResults: TopicMasteryFlashcardResult[];
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const WeakAreaRepairStage: React.FC<WeakAreaRepairStageProps> = ({
  context,
  mcqResults,
  flashcardResults,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const weakAreas = identifyWeakAreasFromResults(mcqResults, flashcardResults);
  const incorrectMcqs = mcqResults.filter(r => !r.isCorrect);
  const missedCards = flashcardResults.filter(r => !r.recalled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-rose-950/70 border border-amber-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Weak Area Diagnostic & Repair</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized Misconception Analysis for <strong className="text-amber-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="p-2.5 px-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300">
            Identified Gaps: <strong className="text-amber-400 font-bold">{weakAreas.length}</strong>
          </span>
        </div>
      </div>

      {weakAreas.length > 0 ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <strong className="block text-sm font-bold text-amber-300">Targeted Remediation Plan</strong>
              Based on your MCQ attempts and active recall, we identified the following conceptual areas needing reinforcement before your final test. Click 'Revisit with Tutor' on any item.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakAreas.map((area, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Weak Area #{idx + 1}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Needs Review</span>
                </div>

                <div className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  <FormattedMathContent content={area} />
                </div>

                <p className="text-[11px] text-slate-400">
                  Misconception flagged from recent practice session.
                </p>

                <button
                  onClick={() => onAskTutor(`I made a mistake on this specific concept during my ${context.topicName} practice: "${area}". Please teach this concept step-by-step, explain why students get confused, and test me with a new question.`)}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Revisit with AI Tutor</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3 max-w-lg mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">No Critical Weak Areas Detected!</h3>
          <p className="text-xs text-slate-400">
            You achieved strong accuracy across all practice questions and flashcards for {context.topicName}. You are ready for the Final Mastery Test!
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={onToggleComplete}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isCompleted ? 'Weak Area Repair Stage Completed ✓' : 'Mark Weak Area Repair as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('final_test')}
            className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next: Final Topic Mastery Test</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
