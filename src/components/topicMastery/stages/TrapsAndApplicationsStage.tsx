import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Check, 
  X,
  Stethoscope
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { FormattedMathContent } from '../../FormattedMathContent';

interface TrapsAndApplicationsStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const TrapsAndApplicationsStage: React.FC<TrapsAndApplicationsStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const traps = [
    {
      title: 'Common Term Confusion Trap',
      description: `Students frequently confuse the physiological role vs anatomical structure in ${context.topicName}.`,
      incorrectThought: 'Assuming both processes have identical energy / enzymatic requirements.',
      correctRule: 'Always verify the exact cofactor, direction of flow, and cellular compartment.',
      trapType: 'Conceptual Distractor'
    },
    {
      title: 'Sign Convention & Unit Trap',
      description: 'Calculations or equations often involve missing unit conversions (e.g. cm to m, kJ to J, or positive vs negative signs).',
      incorrectThought: 'Plugging numbers directly without checking SI units.',
      correctRule: 'Standardize all values into SI units before applying formulas.',
      trapType: 'Numerical / Calculation'
    },
    {
      title: 'Negative Phrased Questions',
      description: `Questions containing "ALL of the following are true EXCEPT" or "Which is INCORRECT".`,
      incorrectThought: 'Picking the first factually correct option without noticing the negative prompt.',
      correctRule: 'Underline the word EXCEPT / NOT and identify the sole incorrect statement.',
      trapType: 'Question Stem Trap'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900/90 to-orange-950/70 border border-red-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Exam Traps & Clinical Applications</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-Yield Pitfalls & Diagnostic Context for <strong className="text-red-300">{context.topicName}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {traps.map((t, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-all space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400">{t.title}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                {t.trapType}
              </span>
            </div>

            <p className="text-xs text-slate-300">{t.description}</p>

            <div className="space-y-2 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <strong className="block text-[11px] text-rose-400">Common Student Error:</strong>
                  <span>{t.incorrectThought}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <strong className="block text-[11px] text-emerald-400">Exam-Winning Rule:</strong>
                  <span>{t.correctRule}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onAskTutor(`What are the most dangerous trick questions PMDC has asked on ${context.topicName}? Teach me how to spot and eliminate every distractor.`)}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Tutor to Drill This Trap</span>
            </button>
          </div>
        ))}
      </div>

      {/* Clinical / Practical Context */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-cyan-400" />
          <span>Clinical & Practical Relevance</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          In medical diagnostics and clinical medicine, <strong>{context.topicName}</strong> serves as a direct foundation for interpreting pathology reports, pharmacological mechanisms, or physiological homeostasis in patients.
        </p>
        <button
          onClick={() => onAskTutor(`Explain the real-world medical / clinical application of ${context.topicName} in human physiology and patient care.`)}
          className="py-2 px-4 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ask Tutor for Clinical Case Scenario</span>
        </button>
      </div>

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
          {isCompleted ? 'Exam Traps Stage Completed ✓' : 'Mark Traps as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('flashcards')}
            className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Flashcards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
