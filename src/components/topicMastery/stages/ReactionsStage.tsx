import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { ReactionItem } from '../../../types';
import { REACTION_DATABASE } from '../../../data/nmdcatData';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface ReactionsStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const ReactionsStage: React.FC<ReactionsStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const reactionAction = useAiRequestAction();

  useEffect(() => {
    // 1. Filter local database
    const localMatches = REACTION_DATABASE.filter(r => 
      r.chapter.toLowerCase().includes(context.chapterName.toLowerCase()) || 
      r.reactionName.toLowerCase().includes(context.topicName.toLowerCase()) ||
      context.topicName.toLowerCase().includes(r.chapter.toLowerCase())
    );

    if (localMatches.length > 0) {
      setReactions(localMatches);
    } else {
      loadOrGenerateReactions();
    }
  }, [context.topicName, context.subjectName]);

  const loadOrGenerateReactions = async () => {
    try {
      const data = await reactionAction.runRequest(
        async (signal) =>
          await aiFetch<{ reactions?: ReactionItem[]; items?: ReactionItem[] }>('/api/generate-reactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: context.subjectName,
              topic: context.topicName,
              chapter: context.chapterName
            })
          }, { signal }),
        {
          pending: `Generating chemical reactions & mechanisms for ${context.topicName}...`,
          success: 'Chemical reactions ready.',
          cancelled: 'Reaction request cancelled.',
          failure: 'Failed to generate reactions.'
        }
      );

      const items = data.reactions || data.items || [];
      if (items.length > 0) {
        setReactions(items);
      } else {
        setReactions([
          {
            id: `r_${Date.now()}`,
            subject: 'Chemistry',
            category: 'Organic',
            chapter: context.chapterName,
            reactionName: `${context.topicName} Transformation`,
            chemicalEquation: 'R-CH=CH_2 + HBr -> R-CH(Br)-CH_3',
            mechanism: 'Electrophilic addition via most stable carbocation intermediate (Markovnikov Rule).',
            conditions: 'Room temperature, dark or non-polar solvent.',
            catalysts: 'Acid catalyst (H+)',
            importantExceptions: 'Anti-Markovnikov addition occurs in presence of peroxides (Kharasch effect with HBr only).',
            isHighYield: true
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading reactions:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900/90 to-purple-950/70 border border-rose-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Reactions, Mechanisms & Conditions</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chemical Equations for <strong className="text-rose-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadOrGenerateReactions}
          disabled={reactionAction.isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${reactionAction.isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Reactions</span>
        </button>
      </div>

      <AiActionStatus status={reactionAction.status} message={reactionAction.message} onCancel={reactionAction.cancel} />

      {reactions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reactions.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition-all space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">{item.reactionName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  {item.category}
                </span>
              </div>

              {/* Chemical Equation with KaTeX */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center text-white">
                <FormattedMathContent content={`$$${item.chemicalEquation}$$`} />
              </div>

              {/* Mechanism */}
              <div className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 space-y-1">
                <strong className="text-rose-300 block text-[11px]">Mechanism:</strong>
                <FormattedMathContent content={item.mechanism} />
              </div>

              {/* Conditions & Catalysts */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Conditions</span>
                  <span className="text-slate-200 font-medium">{item.conditions || 'Standard'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Catalyst / Reagent</span>
                  <span className="text-slate-200 font-medium">{item.catalysts || 'None'}</span>
                </div>
              </div>

              {/* Exceptions */}
              {item.importantExceptions && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="block text-[11px]">Exception / NMDCAT Trap:</strong>
                    <span>{item.importantExceptions}</span>
                  </div>
                </div>
              )}

              {/* Ask Tutor Action */}
              <button
                onClick={() => onAskTutor(`Explain the reaction "${item.reactionName}: ${item.chemicalEquation}" in detail. Show electron pushing mechanism, intermediate stability, and PMDC question patterns.`)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Tutor About This Mechanism</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No reactions database record found. Click 'Refresh Reactions' to generate.
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
          {isCompleted ? 'Reactions Stage Completed ✓' : 'Mark Reactions as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('mcqs')}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: MCQ Practice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
