import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  ArrowRight, 
  RotateCcw, 
  Award, 
  HelpCircle, 
  Check, 
  AlertCircle,
  FileCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { TopicMasteryContext, TopicMasteryFinalTestResult } from '../../../types/topicMastery';
import { MCQQuestion } from '../../../types';
import { filterDatabaseMCQsForTopic } from '../../../utils/topicMasteryUtils';
import { FormattedMathContent } from '../../FormattedMathContent';
import confetti from 'canvas-confetti';

interface FinalTestStageProps {
  context: TopicMasteryContext;
  questionBank: MCQQuestion[];
  finalTestResult?: TopicMasteryFinalTestResult;
  onCompleteTest: (result: TopicMasteryFinalTestResult) => void;
  onPracticeAgain: () => void;
  onAskTutor: (prompt: string) => void;
}

export const FinalTestStage: React.FC<FinalTestStageProps> = ({
  context,
  questionBank,
  finalTestResult,
  onCompleteTest,
  onPracticeAgain,
  onAskTutor
}) => {
  const [testQuestions, setTestQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(!!finalTestResult);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [testStarted, setTestStarted] = useState<boolean>(!!finalTestResult);
  const timerRef = useRef<any>(null);

  // Filter 10 questions for final test
  useEffect(() => {
    if (finalTestResult && finalTestResult.questions && finalTestResult.questions.length > 0) {
      setTestQuestions(finalTestResult.questions);
      setUserAnswers(finalTestResult.userAnswers || {});
      setIsSubmitted(true);
      setTestStarted(true);
      return;
    }

    const matched = filterDatabaseMCQsForTopic(
      questionBank,
      context.subjectId,
      context.chapterName,
      context.topicName
    );

    // Pick up to 10 questions
    const pool = matched.slice(0, 10);
    setTestQuestions(pool);
  }, [questionBank, context.subjectId, context.chapterName, context.topicName, finalTestResult]);

  // Timer
  useEffect(() => {
    if (testStarted && !isSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeSpentSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [testStarted, isSubmitted]);

  const handleStartTest = () => {
    setTestStarted(true);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeSpentSeconds(0);
    setIsSubmitted(false);
  };

  const handleSelectOption = (optIdx: number) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [currentIndex]: optIdx }));
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    clearInterval(timerRef.current);
    setIsSubmitted(true);

    const correctCount = testQuestions.reduce((sum, q, i) => sum + (userAnswers[i] === q.correctIndex ? 1 : 0), 0);
    const percentage = testQuestions.length > 0 ? Math.round((correctCount / testQuestions.length) * 100) : 0;

    if (percentage >= 80) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    const result: TopicMasteryFinalTestResult = {
      attemptId: `final_test_${Date.now()}`,
      score: correctCount,
      totalQuestions: testQuestions.length,
      percentage,
      timeSpentSeconds,
      completedAt: new Date().toISOString(),
      userAnswers,
      questions: testQuestions
    };

    onCompleteTest(result);
  };

  const currentQ = testQuestions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Initial Start Screen
  if (!testStarted && !isSubmitted) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-6 max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Final Topic Mastery Assessment</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Test your comprehensive mastery on <strong className="text-amber-300">{context.topicName}</strong>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-left">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Questions</span>
            <strong className="text-sm font-bold text-white">{testQuestions.length} MCQs</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Time Limit</span>
            <strong className="text-sm font-bold text-white">10 Mins</strong>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Passing Standard</span>
            <strong className="text-sm font-bold text-emerald-400">&ge; 80%</strong>
          </div>
        </div>

        {testQuestions.length === 0 && (
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
            <p className="font-semibold text-slate-300">No database questions available for this specific topic yet.</p>
            <p className="mt-1">We strictly enforce real questions from the PMDC Question Bank to prevent fake or hallucinated MCQs.</p>
          </div>
        )}

        <button
          onClick={handleStartTest}
          disabled={testQuestions.length === 0}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-40 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 cursor-pointer disabled:cursor-not-allowed"
        >
          <Award className="w-4 h-4" />
          <span>{testQuestions.length > 0 ? 'Start Final Mastery Test Now' : 'No Database Questions in Pool'}</span>
        </button>
      </div>
    );
  }

  // 2. Results Screen
  if (isSubmitted) {
    const finalScore = finalTestResult?.score ?? testQuestions.reduce((sum, q, i) => sum + (userAnswers[i] === q.correctIndex ? 1 : 0), 0);
    const totalQ = finalTestResult?.totalQuestions || testQuestions.length || 1;
    const finalPercent = finalTestResult?.percentage ?? Math.round((finalScore / totalQ) * 100);
    const isPassed = finalPercent >= 80;

    return (
      <div className="space-y-6">
        {/* Results Banner */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl text-center space-y-4 ${
          isPassed 
            ? 'bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50' 
            : 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/50'
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto shadow-inner">
            {isPassed ? (
              <Trophy className="w-8 h-8 text-emerald-400 animate-bounce" />
            ) : (
              <Award className="w-8 h-8 text-amber-400" />
            )}
          </div>

          <div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {isPassed ? '★ TOPIC MASTERED ★' : 'PRACTICE NEEDED'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
              {finalScore} / {totalQ} Correct ({finalPercent}%)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Topic: <strong className="text-white">{context.topicName}</strong> • Time: {formatTimer(finalTestResult?.timeSpentSeconds || timeSpentSeconds)}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onPracticeAgain}
              className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice This Topic Again</span>
            </button>
            <button
              onClick={() => onAskTutor(`Review my final mastery test on ${context.topicName}. I scored ${finalScore}/${totalQ} (${finalPercent}%). Give me a 3-step revision plan for remaining gaps.`)}
              className="py-2.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Get AI Tutor Revision Plan</span>
            </button>
          </div>
        </div>

        {/* Detailed Question by Question Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Question Review & Solution Breakdown</span>
          </h3>

          <div className="space-y-4">
            {testQuestions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCor = userAns === q.correctIndex;
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isCor ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-slate-900/90 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Question {idx + 1}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isCor ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {isCor ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-white">
                    <FormattedMathContent content={q.question} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          optIdx === q.correctIndex
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold'
                            : optIdx === userAns
                            ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                            : 'bg-slate-800/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] bg-slate-900 text-slate-300 shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <FormattedMathContent content={opt} />
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      <strong className="text-emerald-400 block text-[11px] mb-0.5">Explanation:</strong>
                      <FormattedMathContent content={q.explanation} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Test Taking View
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Test Status Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-mono font-bold text-white text-sm">{formatTimer(timeSpentSeconds)}</span>
        </div>

        <span className="font-bold">
          Answered: <strong className="text-emerald-400">{answeredCount}/{testQuestions.length}</strong>
        </span>

        <button
          onClick={handleSubmit}
          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
        >
          Submit Test
        </button>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">Question {currentIndex + 1} of {testQuestions.length}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {currentQ.difficulty || 'Medium'}
            </span>
          </div>

          <div className="text-sm sm:text-base font-bold text-white leading-relaxed">
            <FormattedMathContent content={currentQ.question} />
          </div>

          <div className="space-y-3">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = userAnswers[currentIndex] === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/40 shadow-lg'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <FormattedMathContent content={opt} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all"
            >
              Previous
            </button>

            {currentIndex === testQuestions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30"
              >
                Submit Test
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(i => Math.min(testQuestions.length - 1, i + 1))}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
