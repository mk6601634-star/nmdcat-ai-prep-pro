import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { FormulaItem } from '../../../types';
import { FORMULA_DATABASE } from '../../../data/nmdcatData';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface FormulasStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const FormulasStage: React.FC<FormulasStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);
  const formulaAction = useAiRequestAction();

  useEffect(() => {
    // 1. Filter local database
    const localMatches = FORMULA_DATABASE.filter(f => 
      f.subject === context.subjectName && 
      (f.chapter.toLowerCase().includes(context.chapterName.toLowerCase()) || 
       f.title.toLowerCase().includes(context.topicName.toLowerCase()) ||
       context.topicName.toLowerCase().includes(f.chapter.toLowerCase()))
    );

    if (localMatches.length > 0) {
      setFormulas(localMatches);
    } else {
      loadOrGenerateFormulas();
    }
  }, [context.topicName, context.subjectName]);

  const loadOrGenerateFormulas = async () => {
    try {
      const data = await formulaAction.runRequest(
        async (signal) =>
          await aiFetch<{ formulas?: FormulaItem[]; items?: FormulaItem[] }>('/api/generate-formulas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: context.subjectName,
              topic: context.topicName,
              chapter: context.chapterName
            })
          }, { signal }),
        {
          pending: `Generating formulas & dimensional analysis for ${context.topicName}...`,
          success: 'Formulas ready.',
          cancelled: 'Formula request cancelled.',
          failure: 'Failed to generate formulas.'
        }
      );

      const items = data.formulas || data.items || [];
      if (items.length > 0) {
        setFormulas(items);
      } else {
        // Fallback formula card
        setFormulas([
          {
            id: `f_${Date.now()}`,
            subject: context.subjectName as any,
            chapter: context.chapterName,
            title: `${context.topicName} Equation`,
            formula: 'E = h \\cdot f = \\frac{h \\cdot c}{\\lambda}',
            variables: ['E = Energy (Joules)', 'h = Planck constant (6.63 x 10^-34 J.s)', 'f = Frequency (Hz)', 'λ = Wavelength (m)'],
            derivationSummary: 'Fundamental relation connecting wave and particle properties.',
            unitsAndDimensions: 'Unit: Joules (J), Dimensions: [M L^2 T^-2]',
            applications: 'Photoelectric effect, atomic spectra, and quantum transitions.',
            commonMistakes: 'Confusing frequency with wavelength; forgetting to convert nm to meters.',
            isHighYield: true
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading formulas:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-orange-950/70 border border-amber-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Formulas & Dimensional Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-Yield Equations for <strong className="text-amber-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadOrGenerateFormulas}
          disabled={formulaAction.isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${formulaAction.isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Formulas</span>
        </button>
      </div>

      <AiActionStatus status={formulaAction.status} message={formulaAction.message} onCancel={formulaAction.cancel} />

      {formulas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formulas.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">{item.title}</span>
                {item.isHighYield && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    High Yield ★
                  </span>
                )}
              </div>

              {/* Formula Display with KaTeX */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center text-white">
                <FormattedMathContent content={`$$${item.formula}$$`} />
              </div>

              {/* Units & Dimensions */}
              {item.unitsAndDimensions && (
                <div className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                  <strong className="text-amber-300 block text-[11px] mb-0.5">Units & Dimensions:</strong>
                  <FormattedMathContent content={item.unitsAndDimensions} />
                </div>
              )}

              {/* Variables */}
              {item.variables && item.variables.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variables</span>
                  <ul className="text-xs text-slate-300 space-y-0.5 pl-2">
                    {item.variables.map((v, vIdx) => (
                      <li key={vIdx}>
                        <FormattedMathContent content={v} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Mistakes */}
              {item.commonMistakes && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <strong className="block text-[11px]">Exam Trap:</strong>
                    <span>{item.commonMistakes}</span>
                  </div>
                </div>
              )}

              {/* Ask Tutor Action */}
              <button
                onClick={() => onAskTutor(`Explain the formula "${item.title}: ${item.formula}" for ${context.topicName}. Provide step-by-step mathematical derivation and NMDCAT calculation tips.`)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Tutor About This Formula</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No formulas database record found. Click 'Refresh Formulas' to generate.
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
          {isCompleted ? 'Formulas Stage Completed ✓' : 'Mark Formulas as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('mcqs')}
            className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: MCQ Practice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
