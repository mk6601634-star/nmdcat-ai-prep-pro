import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Lightbulb, 
  RotateCw
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface MnemonicsStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const MnemonicsStage: React.FC<MnemonicsStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [mnemonics, setMnemonics] = useState<any[]>([]);
  const mnemonicAction = useAiRequestAction();

  useEffect(() => {
    loadOrGenerateMnemonics();
  }, [context.topicName, context.subjectName]);

  const loadOrGenerateMnemonics = async () => {
    try {
      const data = await mnemonicAction.runRequest(
        async (signal) =>
          await aiFetch<{ mnemonics?: any[]; items?: any[]; title?: string }>('/api/generate-mnemonics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: context.subjectName,
              topic: context.topicName,
              concept: context.topicName,
              chapter: context.chapterName
            })
          }, { signal }),
        {
          pending: `Generating memory hooks and mnemonics for ${context.topicName}...`,
          success: 'Mnemonics ready.',
          cancelled: 'Mnemonic request cancelled.',
          failure: 'Failed to generate mnemonics.'
        }
      );

      const items = data.mnemonics || data.items || [];
      if (items.length > 0) {
        setMnemonics(items);
      } else {
        setMnemonics([
          {
            title: `${context.topicName} High-Yield Acronym`,
            mnemonic: 'FAST-MEM',
            explanation: `Focus on Key Steps, Active Intermediates, Sequence of Events, and Temperature/pH conditions for ${context.topicName}.`,
            application: 'Quick recall during 40-second time limit per MCQ.'
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading mnemonics:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-fuchsia-950/70 border border-purple-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Memory Hooks & Mnemonics</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapid Recall Acronyms & Visual Hooks for <strong className="text-purple-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadOrGenerateMnemonics}
          disabled={mnemonicAction.isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${mnemonicAction.isLoading ? 'animate-spin' : ''}`} />
          <span>New Mnemonics</span>
        </button>
      </div>

      <AiActionStatus status={mnemonicAction.status} message={mnemonicAction.message} onCancel={mnemonicAction.cancel} />

      {mnemonics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mnemonics.map((m, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition-all space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400">{m.title || `Memory Hook #${idx + 1}`}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  Mnemonic
                </span>
              </div>

              {/* Mnemonic Banner */}
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-center">
                <span className="text-base sm:text-lg font-black text-amber-300 tracking-wider font-mono">
                  {m.mnemonic || m.acronym || m.phrase}
                </span>
              </div>

              {/* Explanation */}
              <div className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-1">
                <strong className="text-purple-300 block text-[11px]">How it works:</strong>
                <FormattedMathContent content={m.explanation || m.meaning || ''} />
              </div>

              {/* Ask Tutor */}
              <button
                onClick={() => onAskTutor(`Help me memorize ${context.topicName} with a custom, memorable medical story or mnemonic based on "${m.mnemonic || m.title}".`)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Tutor to Elaborate Story</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          Click 'New Mnemonics' to generate memory hooks.
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
          {isCompleted ? 'Mnemonics Stage Completed ✓' : 'Mark Mnemonics as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('flashcards')}
            className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Flashcards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
