import React, { useState } from 'react';
import { PrismMCQ } from './prismTypes';
import { PrismConflictBadge } from './PrismConflictBadge';
import { MCQQuestion, SavedMistake, ExamAttempt, SubjectType } from '../../types';
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RotateCcw, 
  Bookmark, 
  Brain, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  ChevronRight,
  ShieldCheck,
  Zap,
  BookOpen
} from 'lucide-react';
import { saveMistakeToFirestore, saveExamAttemptToFirestore } from '../../lib/firestoreService';
import type { User } from '../../lib/firebase';

interface PrismQuizRunnerProps {
  questions: PrismMCQ[];
  topic: string;
  subject: SubjectType;
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  firebaseUser?: User | null;
  setExamHistory?: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
  onSignIn?: () => void;
  onResetQuiz?: () => void;
}

export const PrismQuizRunner: React.FC<PrismQuizRunnerProps> = ({
  questions,
  topic,
  subject,
  savedMistakes = [],
  setSavedMistakes,
  firebaseUser,
  setExamHistory,
  onSignIn,
  onResetQuiz
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedMistakeIds, setSavedMistakeIds] = useState<Record<number, boolean>>({});
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Record<number, any>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        No PRISM questions available for this topic.
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const answeredCount = Object.keys(userAnswers).length;

  const handleSelectOption = (optionIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [currentIndex]: optionIdx }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitted(true);
    const scoreData = calculateScore();

    const attempt: ExamAttempt = {
      id: `prism_exam_${Date.now()}`,
      date: new Date().toISOString(),
      dateCompleted: new Date().toISOString(),
      title: `PRISM Verified Quiz: ${topic}`,
      examTitle: `PRISM - ${subject} - ${topic}`,
      subject: subject,
      totalQuestions: scoreData.total,
      score: scoreData.correct,
      totalMarks: scoreData.total,
      percentage: scoreData.percentage,
      timeSpentSeconds: 60,
      negativeMarking: false,
      subjectBreakdown: {
        Biology: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
        Chemistry: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
        Physics: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
        English: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
        'Logical Reasoning': { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
        [subject]: {
          correct: scoreData.correct,
          incorrect: scoreData.total - scoreData.correct,
          unattempted: scoreData.total - answeredCount,
          total: scoreData.total
        }
      },
      userAnswers: Object.entries(userAnswers).reduce((acc, [idx, val]) => {
        const qId = questions[Number(idx)]?.id || `q_${idx}`;
        acc[qId] = val;
        return acc;
      }, {} as Record<string, number>),
      mode: 'Untimed'
    };

    if (setExamHistory) {
      setExamHistory(prev => [attempt, ...prev]);
    }

    if (firebaseUser) {
      try {
        await saveExamAttemptToFirestore(firebaseUser.uid, attempt);
      } catch (err) {
        console.warn('Failed to save PRISM exam attempt to Firestore', err);
      }
    }
  };

  const handleSaveToMistakeVault = async (questionIdx: number) => {
    const q = questions[questionIdx];
    const userSelected = userAnswers[questionIdx];
    if (userSelected === undefined) return;

    const mistakeId = `mistake_prism_${Date.now()}_${questionIdx}`;
    const newMistake: SavedMistake = {
      questionId: mistakeId,
      question: {
        id: mistakeId,
        subject: subject,
        chapter: q.chapter || topic,
        topic: q.topic || topic,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty || 'Medium',
        type: 'Standard',
        verificationStatus: 'VERIFIED',
        sourceReference: `PRISM Source Verified: ${q.sourceClaimIds?.join(', ') || 'Claim Audited'}`
      },
      wrongAnswerIndex: userSelected,
      dateAdded: new Date().toISOString(),
      notes: analyses[questionIdx]?.whyYouWereWrong || q.examTrap || 'PRISM Conceptual Trap',
      isResolved: false,
      errorPattern: 'Conceptual Gap'
    };

    if (setSavedMistakes) {
      setSavedMistakes(prev => [newMistake, ...prev]);
    }

    setSavedMistakeIds(prev => ({ ...prev, [questionIdx]: true }));

    if (firebaseUser) {
      try {
        await saveMistakeToFirestore(firebaseUser.uid, newMistake);
      } catch (err) {
        console.warn('Failed to save mistake to Firestore', err);
      }
    }
  };

  const handleAnalyzeWrongAnswer = async (questionIdx: number) => {
    const q = questions[questionIdx];
    const userSelected = userAnswers[questionIdx];
    if (userSelected === undefined || userSelected === q.correctIndex) return;

    setAnalyzingIndex(questionIdx);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze-wrong-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          options: q.options,
          correctAnswer: ['A', 'B', 'C', 'D'][q.correctIndex],
          userAnswer: ['A', 'B', 'C', 'D'][userSelected],
          explanation: q.explanation,
          topic: topic,
          subject: subject
        })
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalyses(prev => ({ ...prev, [questionIdx]: data.analysis }));
      } else {
        throw new Error(data.error || 'Failed to analyze misconception');
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'AI wrong answer analysis failed');
    } finally {
      setAnalyzingIndex(null);
    }
  };

  const scoreInfo = calculateScore();

  return (
    <div className="space-y-6">
      {/* Quiz Top Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">PRISM Verified Practice Drill</h3>
            <p className="text-[11px] text-slate-400">{subject} &bull; {topic}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Question pagination pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[240px] sm:max-w-none">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[idx] !== undefined;
              const isCurrent = currentIndex === idx;
              let btnClass = 'bg-slate-950 text-slate-400 border-slate-800';

              if (isSubmitted) {
                const isCorrect = userAnswers[idx] === q.correctIndex;
                btnClass = isCorrect ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40';
              } else if (isCurrent) {
                btnClass = 'bg-cyan-500 text-slate-950 font-bold border-cyan-400';
              } else if (isAnswered) {
                btnClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {!isSubmitted ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={answeredCount === 0}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit ({answeredCount}/{totalQ})
            </button>
          ) : (
            <button
              onClick={() => {
                setIsSubmitted(false);
                setUserAnswers({});
                setAnalyses({});
                if (onResetQuiz) onResetQuiz();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Card when Submitted */}
      {isSubmitted && (
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Performance Summary</span>
              <h4 className="text-xl font-black text-white mt-0.5">
                Score: {scoreInfo.correct} / {scoreInfo.total} ({scoreInfo.percentage}%)
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="text-emerald-400 font-bold">{scoreInfo.correct} Correct</span>
                <span className="text-slate-500 mx-1.5">&bull;</span>
                <span className="text-rose-400 font-bold">{scoreInfo.total - scoreInfo.correct} Incorrect</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Question Display Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold">
              Question {currentIndex + 1} of {totalQ}
            </span>
            <PrismConflictBadge status={currentQ.knowledgeStatus} size="sm" />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Difficulty: <strong className="text-slate-200">{currentQ.difficulty}</strong></span>
          </div>
        </div>

        {/* Question Text */}
        <p className="text-base font-bold text-slate-100 leading-relaxed">
          {currentQ.question}
        </p>

        {/* Options List */}
        <div className="space-y-2.5">
          {currentQ.options.map((optText, optIdx) => {
            const letter = ['A', 'B', 'C', 'D'][optIdx];
            const isSelected = userAnswers[currentIndex] === optIdx;
            const isCorrect = currentQ.correctIndex === optIdx;

            let optionStyle = 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200';

            if (isSubmitted) {
              if (isCorrect) {
                optionStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-200 font-semibold';
              } else if (isSelected && !isCorrect) {
                optionStyle = 'bg-rose-500/10 border-rose-500 text-rose-200 line-through';
              } else {
                optionStyle = 'bg-slate-950/60 border-slate-900 text-slate-400 opacity-60';
              }
            } else if (isSelected) {
              optionStyle = 'bg-cyan-500/20 border-cyan-500 text-white font-bold shadow-md';
            }

            return (
              <div
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer text-xs transition-all ${optionStyle}`}
              >
                <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  {letter}
                </span>
                <span className="flex-1 mt-0.5 leading-relaxed">{optText}</span>
                {isSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                {isSubmitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              </div>
            );
          })}
        </div>

        {/* Post-Submission Explanations & Mistake Vault Actions */}
        {isSubmitted && (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Verified Scientific Explanation:
              </span>
              <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>

              {currentQ.examTrap && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <strong>Common Distractor Trap: </strong>
                    {currentQ.examTrap}
                  </div>
                </div>
              )}
            </div>

            {/* Wrong Answer Analysis & Save to Mistake Vault */}
            {userAnswers[currentIndex] !== currentQ.correctIndex && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleAnalyzeWrongAnswer(currentIndex)}
                  disabled={analyzingIndex === currentIndex}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
                >
                  {analyzingIndex === currentIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  <span>Why Was I Wrong?</span>
                </button>

                <button
                  onClick={() => handleSaveToMistakeVault(currentIndex)}
                  disabled={savedMistakeIds[currentIndex]}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                    savedMistakeIds[currentIndex]
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{savedMistakeIds[currentIndex] ? 'Saved to Mistake Vault' : 'Add to Mistake Vault'}</span>
                </button>
              </div>
            )}

            {/* Render Misconception Analysis Breakdown */}
            {analyses[currentIndex] && (
              <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-4 space-y-3 text-xs">
                <h5 className="font-bold text-indigo-300 flex items-center gap-2 text-sm">
                  <Brain className="w-4 h-4" />
                  Misconception Breakdown & Revision Path
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <span className="font-bold text-rose-400 block">Identified Misconception:</span>
                    <p className="text-slate-300">{analyses[currentIndex].whyYouWereWrong}</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-400 block">Actual Scientific Rule:</span>
                    <p className="text-slate-300">{analyses[currentIndex].correctConcept}</p>
                  </div>
                </div>
                {analyses[currentIndex].recommendedRevision && (
                  <div className="bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-500/30 text-indigo-200 text-[11px]">
                    <strong>Target Revision: </strong>{analyses[currentIndex].recommendedRevision}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Question Footer Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold"
          >
            Previous
          </button>

          <button
            onClick={() => setCurrentIndex(prev => Math.min(totalQ - 1, prev + 1))}
            disabled={currentIndex === totalQ - 1}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 disabled:opacity-40 text-xs flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
