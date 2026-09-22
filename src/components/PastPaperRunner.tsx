import React, { useState, useEffect } from 'react';
import { PastPaper, PastPaperQuestion, ExamAttempt, SavedMistake, SubjectType } from '../types';
import { 
  Timer, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ArrowRight, 
  Flag, 
  Award, 
  FileCheck, 
  RotateCcw, 
  BookOpen, 
  Info,
  ShieldCheck,
  HelpCircle,
  Clock
} from 'lucide-react';
import UiCard from './UiCard';
import confetti from 'canvas-confetti';
import { FormattedMathContent } from './FormattedMathContent';

interface PastPaperRunnerProps {
  paper: PastPaper;
  onClose: () => void;
  onSaveAttempt: (attempt: ExamAttempt) => void;
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
}

export const PastPaperRunner: React.FC<PastPaperRunnerProps> = ({
  paper,
  onClose,
  onSaveAttempt,
  savedMistakes = [],
  setSavedMistakes
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>('All');

  // Question sequence is strictly preserved from the source document
  const questions: PastPaperQuestion[] = paper.questions || [];
  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeSpentSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted]);

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  const toggleFlag = (idx: number) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    const subjectStats: Record<SubjectType, { correct: number; incorrect: number; unattempted: number; total: number }> = {
      Biology: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      Chemistry: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      Physics: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      English: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      'Logical Reasoning': { correct: 0, incorrect: 0, unattempted: 0, total: 0 }
    };

    questions.forEach((q, idx) => {
      const sub = (q.subject && subjectStats[q.subject as SubjectType]) ? (q.subject as SubjectType) : 'Biology';
      subjectStats[sub].total += 1;

      const userChoice = userAnswers[idx];
      if (userChoice === undefined) {
        unattempted += 1;
        subjectStats[sub].unattempted += 1;
      } else if (q.hasOfficialAnswer && q.correctAnswer !== null) {
        if (userChoice === q.correctAnswer) {
          correct += 1;
          subjectStats[sub].correct += 1;
        } else {
          incorrect += 1;
          subjectStats[sub].incorrect += 1;
        }
      } else {
        // If paper lacks answer key, count as attempted
        correct += 1;
        subjectStats[sub].correct += 1;
      }
    });

    const percentage = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    return { correct, incorrect, unattempted, percentage, subjectStats };
  };

  const handleSubmitPaper = () => {
    setIsSubmitted(true);
    const results = calculateScore();

    if (results.percentage >= 70) {
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      } catch {}
    }

    const attempt: ExamAttempt = {
      id: `past_paper_attempt_${Date.now()}`,
      date: new Date().toLocaleDateString(),
      dateCompleted: new Date().toISOString(),
      title: `${paper.title} (Authentic Past Paper)`,
      examTitle: paper.title,
      totalQuestions: questions.length,
      score: results.correct,
      totalMarks: questions.length,
      percentage: results.percentage,
      timeSpentSeconds,
      timeSpentMinutes: Math.round(timeSpentSeconds / 60),
      negativeMarking: false,
      subjectBreakdown: results.subjectStats,
      userAnswers,
      sourceType: 'past_paper',
      pastPaperId: paper.id
    };

    onSaveAttempt(attempt);

    // Auto save wrong answers to mistakes if answer key is verified
    if (setSavedMistakes && paper.hasAnswerKey) {
      const newMistakes: SavedMistake[] = [];
      questions.forEach((q, idx) => {
        const userChoice = userAnswers[idx];
        if (userChoice !== undefined && q.correctAnswer !== null && userChoice !== q.correctAnswer) {
          newMistakes.push({
            questionId: `past_paper_${paper.id}_q${q.originalQuestionNumber}`,
            question: {
              id: `past_paper_${paper.id}_q${q.originalQuestionNumber}`,
              subject: (q.subject as SubjectType) || 'Biology',
              chapter: paper.title,
              topic: q.topic || 'Past Paper Source',
              question: q.questionText,
              options: q.options,
              correctIndex: q.correctAnswer,
              explanation: q.explanation || `From ${paper.title} - Question ${q.originalQuestionNumber}`,
              difficulty: 'Medium',
              pastPaperTag: `${paper.year} ${paper.examName}`
            },
            wrongAnswerIndex: userChoice,
            dateAdded: new Date().toISOString(),
            notes: `Auto-saved from ${paper.title} (Q.${q.originalQuestionNumber})`,
            isResolved: false,
            errorPattern: 'Conceptual Gap'
          });
        }
      });

      if (newMistakes.length > 0) {
        setSavedMistakes(prev => [...newMistakes, ...prev]);
      }
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const results = isSubmitted ? calculateScore() : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{paper.verificationStatus} &bull; {paper.year}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{paper.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Source File: <span className="font-mono text-slate-300">{paper.sourceFileName || 'Uploaded Document'}</span> &bull; {questions.length} Questions in original sequence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timeSpentSeconds)}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            Exit Paper
          </button>
        </div>
      </div>

      {/* Results View */}
      {isSubmitted && results && (
        <UiCard className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-950 border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
            <Award className="w-5 h-5" />
            <span>Paper Completion Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block">Score</span>
              <span className="text-2xl font-black text-emerald-400">
                {paper.hasAnswerKey ? `${results.correct} / ${questions.length}` : `${Object.keys(userAnswers).length} Attempted`}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block">Accuracy</span>
              <span className="text-2xl font-black text-cyan-300">
                {paper.hasAnswerKey ? `${results.percentage}%` : 'N/A (No Key)'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block">Time Spent</span>
              <span className="text-2xl font-black text-amber-300">{formatTimer(timeSpentSeconds)}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block">Answer Key</span>
              <span className="text-xs font-bold text-slate-300 mt-2 block">
                {paper.hasAnswerKey ? 'Verified in Source' : 'Unavailable in Source'}
              </span>
            </div>
          </div>
        </UiCard>
      )}

      {/* Main Runner Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Question */}
        <div className="lg:col-span-2 space-y-4">
          {currentQ ? (
            <div className="p-6 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-5">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                    Question {currentQ.originalQuestionNumber} of {questions.length}
                  </span>
                  {currentQ.subject && (
                    <span className="text-xs text-slate-400 font-semibold">({currentQ.subject})</span>
                  )}
                </div>

                <button
                  onClick={() => toggleFlag(currentIndex)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    flaggedQuestions[currentIndex]
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flaggedQuestions[currentIndex] ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-sm font-medium text-slate-100 leading-relaxed">
                <FormattedMathContent content={currentQ.questionText} />
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((optText, oIdx) => {
                  const isSelected = userAnswers[currentIndex] === oIdx;
                  let optStyle = 'bg-slate-950 hover:bg-slate-850 text-slate-200 border-slate-800';

                  if (isSubmitted) {
                    if (currentQ.hasOfficialAnswer && currentQ.correctAnswer === oIdx) {
                      optStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold';
                    } else if (isSelected && currentQ.hasOfficialAnswer && currentQ.correctAnswer !== oIdx) {
                      optStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                    } else if (isSelected) {
                      optStyle = 'bg-indigo-500/20 border-indigo-500 text-indigo-300';
                    }
                  } else if (isSelected) {
                    optStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-md shadow-emerald-500/10';
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`w-full p-4 rounded-xl border text-left text-xs transition-all flex items-start gap-3 ${optStyle}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 font-bold flex items-center justify-center shrink-0 text-slate-300">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <div className="flex-1 mt-0.5">
                        <FormattedMathContent content={optText} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (if submitted & available) */}
              {isSubmitted && currentQ.explanation && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-emerald-400 block">Examiner / Source Note:</span>
                  <p>{currentQ.explanation}</p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-30 border border-slate-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  !isSubmitted && (
                    <button
                      onClick={handleSubmitPaper}
                      className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Authentic Paper</span>
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">No questions available in this past paper.</div>
          )}
        </div>

        {/* Right: Question Matrix Navigator */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Question Navigator</h3>
            <span className="text-[11px] text-slate-400">
              {Object.keys(userAnswers).length} / {questions.length} Attempted
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[idx] !== undefined;
              const isCurrent = currentIndex === idx;
              const isFlagged = flaggedQuestions[idx];

              let cellStyle = 'bg-slate-950 text-slate-400 border-slate-800';
              if (isCurrent) {
                cellStyle = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20';
              } else if (isSubmitted && q.hasOfficialAnswer && q.correctAnswer !== null) {
                if (userAnswers[idx] === q.correctAnswer) {
                  cellStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold';
                } else if (userAnswers[idx] !== undefined) {
                  cellStyle = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
                }
              } else if (isAnswered) {
                cellStyle = 'bg-slate-800 text-emerald-300 border-slate-700 font-semibold';
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`p-2 rounded-xl text-xs border text-center transition-all relative ${cellStyle}`}
                >
                  {q.originalQuestionNumber}
                  {isFlagged && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {!isSubmitted && (
            <button
              onClick={handleSubmitPaper}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 mt-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish & Submit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
