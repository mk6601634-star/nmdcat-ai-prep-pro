import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  RotateCw
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { DefinitionItem } from '../../../types';
import { DEFINITION_DATABASE } from '../../../data/nmdcatData';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface DefinitionsStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const DefinitionsStage: React.FC<DefinitionsStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [definitions, setDefinitions] = useState<DefinitionItem[]>([]);
  const defAction = useAiRequestAction();

  useEffect(() => {
    // 1. Check local database
    const localMatches = DEFINITION_DATABASE.filter(d => 
      d.subject === context.subjectName && 
      (d.chapter.toLowerCase().includes(context.chapterName.toLowerCase()) || 
       d.term.toLowerCase().includes(context.topicName.toLowerCase()) ||
       context.topicName.toLowerCase().includes(d.term.toLowerCase()))
    );

    if (localMatches.length > 0) {
      setDefinitions(localMatches);
    } else {
      loadOrGenerateDefinitions();
    }
  }, [context.topicName, context.subjectName]);

  const loadOrGenerateDefinitions = async () => {
    try {
      const data = await defAction.runRequest(
        async (signal) =>
          await aiFetch<{ definitions?: DefinitionItem[]; items?: DefinitionItem[] }>('/api/generate-definitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: context.subjectName,
              topic: context.topicName,
              chapter: context.chapterName
            })
          }, { signal }),
        {
          pending: `Extracting PMDC textbook definitions for ${context.topicName}...`,
          success: 'Definitions ready.',
          cancelled: 'Definition request cancelled.',
          failure: 'Failed to load definitions.'
        }
      );

      const items = data.definitions || data.items || [];
      if (items.length > 0) {
        setDefinitions(items);
      } else {
        setDefinitions([
          {
            id: `d_${Date.now()}`,
            subject: context.subjectName as any,
            chapter: context.chapterName,
            term: context.topicName,
            textbookDefinition: `Standard biological / chemical / physical definition of ${context.topicName} as framed in national curriculum textbooks.`,
            nmdcatShortDefinition: `High-yield one-liner memory hook for ${context.topicName}.`,
            relatedTerms: ['Classification', 'Mechanism', 'Diagnostic Indicator'],
            examNotes: 'Frequently appears as direct factual recall in Section A.'
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading definitions:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900/90 to-indigo-950/70 border border-blue-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Core PMDC Definitions & Terminology</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Standardized Terminology for <strong className="text-blue-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadOrGenerateDefinitions}
          disabled={defAction.isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${defAction.isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Definitions</span>
        </button>
      </div>

      <AiActionStatus status={defAction.status} message={defAction.message} onCancel={defAction.cancel} />

      {definitions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {definitions.map((def, idx) => (
            <div
              key={def.id || idx}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition-all space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{def.term}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Definition
                </span>
              </div>

              {/* Textbook Definition */}
              <div className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-1">
                <strong className="text-blue-300 block text-[11px]">Textbook Definition:</strong>
                <FormattedMathContent content={def.textbookDefinition} />
              </div>

              {/* NMDCAT Short Definition */}
              {def.nmdcatShortDefinition && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <strong className="text-emerald-400 block text-[11px] mb-0.5">Quick Memory Definition:</strong>
                  <span>{def.nmdcatShortDefinition}</span>
                </div>
              )}

              {/* Exam Notes */}
              {def.examNotes && (
                <p className="text-[11px] text-slate-400 italic">
                  Exam Tip: {def.examNotes}
                </p>
              )}

              {/* Ask Tutor */}
              <button
                onClick={() => onAskTutor(`Explain the term "${def.term}" in depth. Provide its physiological significance, clinical correlations, and 2 sample NMDCAT questions.`)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask Tutor About This Term</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          No definitions record found. Click 'Refresh Definitions' to load.
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
          {isCompleted ? 'Definitions Stage Completed ✓' : 'Mark Definitions as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('flashcards')}
            className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Flashcards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
