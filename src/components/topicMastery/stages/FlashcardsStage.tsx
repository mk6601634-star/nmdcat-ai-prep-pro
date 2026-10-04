import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Sparkles, 
  RotateCw, 
  Check, 
  X, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { TopicMasteryContext, TopicMasteryFlashcardResult } from '../../../types/topicMastery';
import { Flashcard } from '../../../types';
import { HIGH_YIELD_FLASHCARDS } from '../../../data/nmdcatData';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface FlashcardsStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  flashcardResults: TopicMasteryFlashcardResult[];
  onUpdateResults: (results: TopicMasteryFlashcardResult[]) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const FlashcardsStage: React.FC<FlashcardsStageProps> = ({
  context,
  onAskTutor,
  flashcardResults,
  onUpdateResults,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const flashcardAction = useAiRequestAction();

  useEffect(() => {
    // 1. Filter local sample flashcards
    const localMatches = (HIGH_YIELD_FLASHCARDS || []).filter(c => 
      c.subject === context.subjectName && 
      (c.topic.toLowerCase().includes(context.topicName.toLowerCase()) || 
       context.topicName.toLowerCase().includes(c.topic.toLowerCase()) ||
       c.front.toLowerCase().includes(context.topicName.toLowerCase()))
    );

    if (localMatches.length > 0) {
      setCards(localMatches);
    } else {
      loadOrGenerateFlashcards();
    }
  }, [context.topicName, context.subjectName]);

  const loadOrGenerateFlashcards = async () => {
    try {
      const data = await flashcardAction.runRequest(
        async (signal) =>
          await aiFetch<{ flashcards?: Flashcard[]; items?: Flashcard[] }>('/api/generate-flashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: context.subjectName,
              topic: context.topicName,
              quantity: 6,
              mode: 'NORMAL'
            })
          }, { signal }),
        {
          pending: `Generating active recall flashcards for ${context.topicName}...`,
          success: 'Flashcards ready.',
          cancelled: 'Flashcard request cancelled.',
          failure: 'Failed to generate flashcards.'
        }
      );

      const items = data.flashcards || data.items || [];
      if (items.length > 0) {
        setCards(items);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        setCards([
          {
            id: `c_${Date.now()}_1`,
            subject: context.subjectId,
            topic: context.topicName,
            front: `What is the primary physiological/chemical principle of ${context.topicName}?`,
            back: `It governs the specific regulatory pathway and rate-limiting reactions adhering strictly to PMDC standards.`
          },
          {
            id: `c_${Date.now()}_2`,
            subject: context.subjectId,
            topic: context.topicName,
            front: `What is the most common distractor/trap in ${context.topicName} MCQs?`,
            back: `Failing to account for cofactors, temperature/pH changes, or vector signs.`
          }
        ]);
      }
    } catch (err) {
      console.warn('Error loading flashcards:', err);
    }
  };

  const currentCard = cards[currentIndex];

  const handleMarkRecall = (recalled: boolean) => {
    if (!currentCard) return;

    const existingIdx = flashcardResults.findIndex(r => r.cardId === currentCard.id);
    const newResult: TopicMasteryFlashcardResult = {
      cardId: currentCard.id,
      front: currentCard.front,
      recalled
    };

    let updated: TopicMasteryFlashcardResult[];
    if (existingIdx >= 0) {
      updated = [...flashcardResults];
      updated[existingIdx] = newResult;
    } else {
      updated = [...flashcardResults, newResult];
    }
    onUpdateResults(updated);

    // Auto-advance to next card if not at end
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setIsFlipped(false);
    }
  };

  const recalledCount = flashcardResults.filter(r => r.recalled).length;
  const attemptedCount = flashcardResults.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-950/70 via-slate-900/90 to-purple-950/70 border border-violet-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Active Recall Flashcards</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Topic: <strong className="text-violet-300">{context.topicName}</strong> • {cards.length} Cards in Deck
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300">
            Retention: <strong className="text-emerald-400 font-bold">{attemptedCount > 0 ? Math.round((recalledCount / attemptedCount) * 100) : 0}%</strong> ({recalledCount}/{attemptedCount})
          </div>
          <button
            onClick={loadOrGenerateFlashcards}
            disabled={flashcardAction.isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 font-bold transition-all"
          >
            <RotateCw className={`w-3.5 h-3.5 ${flashcardAction.isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate Deck</span>
          </button>
        </div>
      </div>

      <AiActionStatus status={flashcardAction.status} message={flashcardAction.message} onCancel={flashcardAction.cancel} />

      {currentCard ? (
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Card Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span className="text-violet-400 font-bold">Click card or space to flip</span>
          </div>

          {/* Interactive Flipping Card */}
          <div
            onClick={() => setIsFlipped(f => !f)}
            className={`min-h-[260px] sm:min-h-[300px] p-6 sm:p-8 rounded-3xl cursor-pointer transition-all duration-300 select-none flex flex-col justify-between shadow-2xl border ${
              isFlipped
                ? 'bg-gradient-to-b from-slate-900 to-indigo-950/80 border-indigo-500/60 ring-2 ring-indigo-500/20'
                : 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700/80 hover:border-violet-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className={`px-2.5 py-1 rounded-full ${
                isFlipped ? 'bg-indigo-500/20 text-indigo-300' : 'bg-violet-500/20 text-violet-300'
              }`}>
                {isFlipped ? 'ANSWER / BACK' : 'QUESTION / FRONT'}
              </span>
              <span className="text-slate-500 text-[10px]">NMDCAT High-Yield</span>
            </div>

            <div className="my-6 text-center text-sm sm:text-base leading-relaxed text-white">
              <FormattedMathContent content={isFlipped ? currentCard.back : currentCard.front} />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <RotateCcw className="w-3 h-3" />
              <span>Tap to {isFlipped ? 'view question' : 'reveal answer'}</span>
            </div>
          </div>

          {/* Answer Quality Feedback Controls */}
          {isFlipped && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleMarkRecall(false)}
                className="py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>Review Again Later (Forgot)</span>
              </button>
              <button
                onClick={() => handleMarkRecall(true)}
                className="py-3 px-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>I Knew This Well ✓</span>
              </button>
            </div>
          )}

          {/* Navigation & Tutor Trigger Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-2.5 rounded-xl bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700 transition-all"
                title="Previous Card"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === cards.length - 1}
                className="p-2.5 rounded-xl bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700 transition-all"
                title="Next Card"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onAskTutor(`Explain this flashcard question for ${context.topicName}: "${currentCard.front}". Answer: "${currentCard.back}". Why is this high yield for NMDCAT?`)}
              className="py-2 px-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Tutor About This Card</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
          Loading flashcards...
        </div>
      )}

      {/* Completion Footer */}
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
          {isCompleted ? 'Flashcards Stage Completed ✓' : 'Mark Flashcards as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('mcqs')}
            className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Database MCQs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
