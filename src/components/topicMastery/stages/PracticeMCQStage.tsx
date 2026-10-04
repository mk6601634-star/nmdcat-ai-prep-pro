import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  HelpCircle, 
  MessageSquare, 
  ArrowRight, 
  BookmarkPlus, 
  Check, 
  AlertCircle,
  Database,
  RotateCcw
} from 'lucide-react';
import { TopicMasteryContext, TopicMasteryMCQResult } from '../../../types/topicMastery';
import { MCQQuestion, SavedMistake } from '../../../types';
import { filterDatabaseMCQsForTopic } from '../../../utils/topicMasteryUtils';
import { FormattedMathContent } from '../../FormattedMathContent';
import { saveMistakeToFirestore } from '../../../lib/firestoreService';
import { auth } from '../../../lib/firebase';
import confetti from 'canvas-confetti';

interface PracticeMCQStageProps {
  context: TopicMasteryContext;
  questionBank: MCQQuestion[];
  onAskTutor: (prompt: string) => void;
  mcqResults: TopicMasteryMCQResult[];
  onUpdateResults: (results: TopicMasteryMCQResult[]) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const PracticeMCQStage: React.FC<PracticeMCQStageProps> = ({
  context,
  questionBank,
  onAskTutor,
  mcqResults,
  onUpdateResults,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [topicQuestions, setTopicQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [savedMistakeIds, setSavedMistakeIds] = useState<Set<string>>(new Set());

  // Strict DB Retrieval
  useEffect(() => {
    const matched = filterDatabaseMCQsForTopic(
      questionBank,
      context.subjectId,
      context.chapterName,
      context.topicName
    );
    setTopicQuestions(matched);
    setCurrentIndex(0);
  }, [questionBank, context.subjectId, context.chapterName, context.topicName]);

  const currentQ = topicQuestions[currentIndex];
  const isCurrentAnswered = selectedAnswers[currentIndex] !== undefined;
  const currentSelected = selectedAnswers[currentIndex];
  const isCurrentCorrect = isCurrentAnswered && currentSelected === currentQ?.correctIndex;

  const handleSelectOption = async (optionIdx: number) => {
    if (isCurrentAnswered || !currentQ) return;

    const isCorrect = optionIdx === currentQ.correctIndex;
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: optionIdx }));

    if (isCorrect) {
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
    }

    const newResult: TopicMasteryMCQResult = {
      questionId: currentQ.id || `q_${currentIndex}`,
      questionText: currentQ.question,
      selectedOption: optionIdx,
      correctIndex: currentQ.correctIndex,
      isCorrect,
      timeSpentSeconds: 20,
      explanation: currentQ.explanation
    };

    const existingIdx = mcqResults.findIndex(r => r.questionId === newResult.questionId);
    let updated: TopicMasteryMCQResult[];
    if (existingIdx >= 0) {
      updated = [...mcqResults];
      updated[existingIdx] = newResult;
    } else {
      updated = [...mcqResults, newResult];
    }
    onUpdateResults(updated);

    // Auto-save wrong answers to Mistake Vault
    if (!isCorrect && auth.currentUser?.uid) {
      try {
        const mistake: SavedMistake = {
          questionId: currentQ.id || `mistake_${Date.now()}`,
          question: currentQ,
          wrongAnswerIndex: optionIdx,
          dateAdded: new Date().toISOString(),
          notes: `Auto-saved from Topic Mastery: ${context.topicName}`,
          isResolved: false,
          errorPattern: 'Conceptual Gap'
        };
        await saveMistakeToFirestore(auth.currentUser.uid, mistake);
        setSavedMistakeIds(prev => new Set(prev).add(currentQ.id));
      } catch {}
    }
  };

  const correctCount = mcqResults.filter(r => r.isCorrect).length;
  const totalAttempted = mcqResults.length;
  const accuracyPercent = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Real Database MCQs</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified PMDC Database
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Topic: <strong className="text-emerald-300">{context.topicName}</strong> ({topicQuestions.length} Questions in Pool)
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="p-2.5 px-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-300">
            Score: <strong className="text-emerald-400 font-bold">{correctCount}/{totalAttempted}</strong> ({accuracyPercent}%)
          </div>
        </div>
      </div>

      {topicQuestions.length > 0 && currentQ ? (
        <div className="space-y-5 max-w-3xl mx-auto">
          {/* Question Index Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold">Question {currentIndex + 1} of {topicQuestions.length}</span>
            <div className="flex items-center gap-1.5">
              {topicQuestions.map((_, idx) => {
                const isAns = selectedAnswers[idx] !== undefined;
                const isCor = isAns && selectedAnswers[idx] === topicQuestions[idx].correctIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                      currentIndex === idx
                        ? 'ring-2 ring-emerald-400 bg-slate-800 text-white'
                        : isAns
                        ? isCor ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {currentQ.difficulty || 'Medium'} • {currentQ.cognitiveLevel || 'Application'}
              </span>
              {currentQ.pastPaperTag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentQ.pastPaperTag}
                </span>
              )}
            </div>

            {/* Question Text */}
            <div className="text-sm sm:text-base font-bold text-white leading-relaxed">
              <FormattedMathContent content={currentQ.question} />
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = currentSelected === optIdx;
                const isCorrect = optIdx === currentQ.correctIndex;
                let optionStyle = 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200';

                if (isCurrentAnswered) {
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/30';
                  } else if (isSelected) {
                    optionStyle = 'bg-rose-500/20 border-rose-500 text-rose-100 ring-2 ring-rose-500/30';
                  } else {
                    optionStyle = 'bg-slate-800/40 border-slate-800 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={isCurrentAnswered}
                    className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-slate-300">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <FormattedMathContent content={opt} />
                    </div>

                    {isCurrentAnswered && isCorrect && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isCurrentAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Misconception Breakdown */}
            {isCurrentAnswered && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Detailed Explanation:
                  </span>
                  {savedMistakeIds.has(currentQ.id) && (
                    <span className="text-[10px] font-bold text-rose-400">
                      Saved to Mistake Vault ✓
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  <FormattedMathContent content={currentQ.explanation || 'No explanation provided.'} />
                </div>

                {/* Ask Tutor About This Question */}
                <button
                  onClick={() => onAskTutor(`Explain this ${context.topicName} MCQ in depth: "${currentQ.question}". Correct Option: "${currentQ.options[currentQ.correctIndex]}". Why is this the correct answer and what are the key distractors?`)}
                  className="py-2 px-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Explain This Question with AI Tutor</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
            >
              Previous Question
            </button>

            <button
              onClick={() => setCurrentIndex(i => Math.min(topicQuestions.length - 1, i + 1))}
              disabled={currentIndex === topicQuestions.length - 1}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
            >
              Next Question
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3 max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Database Questions Found for Exact Topic</h3>
          <p className="text-xs text-slate-400">
            We strictly enforce real questions from the PMDC Question Bank to prevent fake or hallucinated MCQs.
          </p>
          <button
            onClick={() => onAskTutor(`Please give me 5 realistic NMDCAT-style practice questions with detailed solutions for ${context.topicName}.`)}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice with AI Tutor Instead</span>
          </button>
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
          {isCompleted ? 'MCQ Practice Stage Completed ✓' : 'Mark MCQ Practice as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('weak_areas')}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Weak Area Diagnostic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
