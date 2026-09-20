import React, { useState, useEffect } from 'react';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import { generateExam } from '../utils/nmdcatExamGenerator';
import UiCard from './UiCard';
import { MCQQuestion, ExamAttempt, SavedMistake, SubjectType } from '../types';
import { 
  Flame, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Bookmark, 
  Award,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MockExamProps {
  questionBank: MCQQuestion[];
  savedMistakes: SavedMistake[];
  setSavedMistakes: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  examHistory: ExamAttempt[];
  setExamHistory: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
}

export const MockExam: React.FC<MockExamProps> = ({
  questionBank,
  savedMistakes,
  setSavedMistakes,
  examHistory,
  setExamHistory,
}) => {
  // Config state
  const [examLength, setExamLength] = useState<number>(50); // Default 50 for quick preview, can choose 100 or 180
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  
  // Live Exam state
  const [isExamStarted, setIsExamStarted] = useState<boolean>(false);
  const [isExamSubmitted, setIsExamSubmitted] = useState<boolean>(false);
  const [examQuestions, setExamQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>('All');
  const [isOmrMode, setIsOmrMode] = useState<boolean>(false); // OMR Bubble Mode #100
  
  // Review Mode state
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  // Countdown timer effect
  useEffect(() => {
    if (!isExamStarted || isExamSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamStarted, isExamSubmitted]);

  const handleStartExam = () => {
    // Generate mock exam questions from question bank + duplicated variations if count exceeds bank size
    // Generate exam following NMDCAT distribution across subjects
    const useSubjects = activeSubjectFilter === 'All' ? undefined : [activeSubjectFilter as SubjectType];
    const generated = generateExam(questionBank, examLength, useSubjects as any);
    setExamQuestions(generated);
    setCurrentIdx(0);
    setUserAnswers({});
    setFlaggedQuestions({});
    setTimeRemainingSeconds(examLength * 60); // 1 minute per question default
    setIsExamStarted(true);
    setIsExamSubmitted(false);
    setIsReviewing(false);
  };

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const toggleFlag = (qIndex: number) => {
    setFlaggedQuestions(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handleSubmitExam = () => {
    setIsExamSubmitted(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    // Calculate score
    let totalScore = 0;
    const subjectStats: Record<SubjectType, { correct: number; incorrect: number; unattempted: number; total: number }> = {
      Biology: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      Chemistry: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      Physics: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      English: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      'Logical Reasoning': { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
    };

    examQuestions.forEach((q, idx) => {
      const sub = q.subject;
      if (subjectStats[sub]) {
        subjectStats[sub].total += 1;
      }

      const chosen = userAnswers[idx];
      if (chosen === undefined) {
        if (subjectStats[sub]) subjectStats[sub].unattempted += 1;
      } else if (chosen === q.correctIndex) {
        totalScore += 1;
        if (subjectStats[sub]) subjectStats[sub].correct += 1;
      } else {
        if (negativeMarking) totalScore -= 0.25;
        if (subjectStats[sub]) subjectStats[sub].incorrect += 1;
      }
    });

    const newAttempt: ExamAttempt = {
      id: `attempt-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      title: `${examLength} MCQ PMDC Mock Exam`,
      totalQuestions: examQuestions.length,
      score: Math.max(0, totalScore),
      totalMarks: examQuestions.length,
      percentage: Math.round((Math.max(0, totalScore) / examQuestions.length) * 100),
      timeSpentSeconds: (examLength * 60) - timeRemainingSeconds,
      negativeMarking,
      subjectBreakdown: subjectStats,
      userAnswers,
    };

    setExamHistory(prev => [newAttempt, ...prev]);

    // Auto-save wrong answers to Mistake Vault / Mistake Book
    const newMistakes: SavedMistake[] = [];
    examQuestions.forEach((q, idx) => {
      const chosen = userAnswers[idx];
      if (chosen !== undefined && chosen !== q.correctIndex) {
        const exists = savedMistakes.some(m => m.questionId === q.id || m.question.question === q.question);
        if (!exists) {
          newMistakes.push({
            questionId: q.id || `mock_${Date.now()}_${idx}`,
            question: q,
            wrongAnswerIndex: chosen,
            dateAdded: new Date().toISOString(),
            notes: 'Auto-saved from Mock Exam',
            isResolved: false,
            errorPattern: 'Conceptual Gap'
          });
        }
      }
    });

    if (newMistakes.length > 0) {
      setSavedMistakes(prev => [...newMistakes, ...prev]);
    }
  };

  const handleSaveToMistakeVault = (q: MCQQuestion, wrongIdx: number) => {
    const exists = savedMistakes.some(m => m.questionId === q.id || m.question.question === q.question);
    if (!exists) {
      setSavedMistakes(prev => [
        {
          questionId: q.id || `q-${Date.now()}`,
          question: q,
          wrongAnswerIndex: wrongIdx,
          dateAdded: new Date().toLocaleDateString(),
          isResolved: false
        },
        ...prev
      ]);
      alert('Question saved to Mistake Vault!');
    } else {
      alert('Question is already in your Mistake Vault.');
    }
  };

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = examQuestions[currentIdx];

  // Filtering palette questions
  const filteredIndices = examQuestions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => activeSubjectFilter === 'All' || q.subject === activeSubjectFilter)
    .map(({ i }) => i);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
          <Flame className="w-4 h-4" />
          <span>Real Exam Simulation Engine</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          NMDCAT Full Mock Exam
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Simulate the actual PMDC NMDCAT test environment with countdown timer, OMR answer palette, and instant result analysis.
        </p>
      </div>

      {/* Screen 1: Exam Configuration */}
      {!isExamStarted && (
<UiCard className="max-w-2xl mx-auto p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            Select Mock Exam Pattern
          </h2>

          <div className="space-y-3">
            {([
              { count: 50, time: '50 Minutes', title: 'Sprint Speed Mock (50 MCQs)' , desc: 'Quick diagnostic test covering high-yield topics' },
              { count: 100, time: '100 Minutes', title: 'Half Length Mock (100 MCQs)', desc: 'Balanced assessment of core FSc topics' },
              { count: NMDCAT_CONFIG.TOTAL_MCQS, time: `${NMDCAT_CONFIG.TOTAL_MCQS} Minutes`, title: `Full PMDC Official Mock (${NMDCAT_CONFIG.TOTAL_MCQS} MCQs)` }
            ] as {count:number;time:string;title:string;desc?:string}[]).map(pattern => {
              let descText = pattern.desc || '';
              if (!descText) {
                const subjectsOrder = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as const;
                const weights = subjectsOrder.map(s => NMDCAT_CONFIG.SUBJECTS[s]);
                const totalWeight = weights.reduce((a, b) => a + b, 0);
                const rawCounts = subjectsOrder.map((s, i) => Math.round((NMDCAT_CONFIG.SUBJECTS[s] / totalWeight) * pattern.count));
                const sumRaw = rawCounts.reduce((a, b) => a + b, 0);
                if (sumRaw !== pattern.count) {
                  const diff = pattern.count - sumRaw;
                  rawCounts[0] = rawCounts[0] + diff;
                }
                descText = `Real exam length (${subjectsOrder.map((s, i) => `${s} ${rawCounts[i]}`).join(', ')})`;
              }

              return (
                <button
                  key={pattern.count}
                  type="button"
                  onClick={() => setExamLength(pattern.count)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    examLength === pattern.count
                      ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-slate-100">{pattern.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{descText}</div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    {pattern.time}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Negative Marking Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div>
              <div className="text-xs font-bold text-slate-200">Negative Marking (-0.25 penalty)</div>
              <div className="text-[11px] text-slate-400">Deduct 0.25 marks for every wrong answer</div>
            </div>
            <input
              type="checkbox"
              checked={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
            />
          </div>

          <button
            onClick={handleStartExam}
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            <span>Launch Mock Exam Now</span>
          </button>
        </UiCard>
      )}

      {/* Screen 2: Live Exam Interface */}
      {isExamStarted && !isExamSubmitted && currentQ && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Top Timer Bar */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Question {currentIdx + 1} of {examQuestions.length}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {currentQ.subject}
                </span>
              </div>

              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 font-mono font-bold text-sm">
                <Timer className="w-4 h-4 animate-pulse" />
                <span>{formatTime(timeRemainingSeconds)}</span>
              </div>
            </div>

            {/* Question Card */}
            <UiCard className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-400">Unit / Chapter: {currentQ.chapter}</span>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {currentQ.question}
                  </h2>
                </div>

                <button
                  onClick={() => toggleFlag(currentIdx)}
                  className={`p-2 rounded-lg border transition-colors ${
                    flaggedQuestions[currentIdx]
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Mark for review"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[currentIdx] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(currentIdx, optIdx)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100 font-semibold shadow-inner'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIdx < examQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => Math.min(examQuestions.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitExam}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <span>Submit Exam</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </UiCard>
          </div>

          {/* Question Palette Sidebar */}
          <div className="space-y-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
              Question Palette
            </h3>

            {/* Subject Filter */}
            <div className="flex flex-wrap gap-1">
              {['All', 'Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'].map(sub => (
                <button
                  key={sub}
                  onClick={() => setActiveSubjectFilter(sub)}
                  className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
                    activeSubjectFilter === sub
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sub === 'Logical Reasoning' ? 'Logic' : sub}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 py-2 border-y border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Marked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-700" />
                <span>Unattempted</span>
              </div>
            </div>

            {/* Grid Palette */}
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredIndices.map(qIdx => {
                const isAnswered = userAnswers[qIdx] !== undefined;
                const isFlagged = flaggedQuestions[qIdx];
                const isCurrent = qIdx === currentIdx;

                let btnStyle = 'bg-slate-800 text-slate-400 border-slate-700';
                if (isAnswered) btnStyle = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400';
                if (isFlagged) btnStyle = 'bg-amber-500 text-slate-950 font-bold border-amber-400';
                if (isCurrent) btnStyle += ' ring-2 ring-white';

                return (
                  <button
                    key={qIdx}
                    onClick={() => setCurrentIdx(qIdx)}
                    className={`h-8 rounded text-xs font-mono border transition-all flex items-center justify-center ${btnStyle}`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSubmitExam}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs transition-colors"
            >
              Finish & View Result
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Exam Score Result & Review */}
      {isExamSubmitted && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Result Card */}
          <div className="bg-slate-900/90 p-8 rounded-2xl border border-slate-800 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">NMDCAT Mock Result</h2>
              <p className="text-xs text-slate-400 mt-1">Official PMDC score report</p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-800/60 p-6 rounded-xl border border-slate-700/60">
              <div>
                <div className="text-2xl font-black text-emerald-400">
                  {examHistory[0]?.score} / {examQuestions.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Total Marks</div>
              </div>

              <div>
                <div className="text-2xl font-black text-white">
                  {examHistory[0]?.percentage}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Percentage</div>
              </div>

              <div>
                <div className="text-2xl font-black text-teal-400">
                  {Object.values(userAnswers).length}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Attempted</div>
              </div>

              <div>
                <div className="text-2xl font-black text-amber-400">
                  {formatTime(examHistory[0]?.timeSpentSeconds || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Time Spent</div>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <div className="space-y-3 text-left">
              <h3 className="text-xs font-bold text-slate-300">Subject-wise Accuracy Breakdown:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(examHistory[0]?.subjectBreakdown || {}).map(([sub, statsVal]) => {
                  const stats = statsVal as { correct: number; incorrect: number; unattempted: number; total: number };
                  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  return (
                    <div key={sub} className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-200">
                        <span>{sub}</span>
                        <span className="text-emerald-400">{pct}%</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {stats.correct} Correct, {stats.incorrect} Incorrect
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={() => setIsReviewing(!isReviewing)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isReviewing ? 'Hide Review' : 'Review All Questions & Solutions'}</span>
              </button>

              <button
                onClick={() => {
                  setIsExamStarted(false);
                  setIsExamSubmitted(false);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Take Another Mock</span>
              </button>
            </div>
          </div>

          {/* Question Review Section */}
          {isReviewing && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Full Exam Review & Solutions</h3>

              {examQuestions.map((q, idx) => {
                const userChoice = userAnswers[idx];
                const isCorrect = userChoice === q.correctIndex;
                const isUnattempted = userChoice === undefined;

                return (
                  <div key={idx} className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">Q{idx + 1}.</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {q.subject}
                        </span>
                      </div>

                      {isCorrect && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Correct</span>}
                      {!isCorrect && !isUnattempted && <span className="text-xs font-bold text-rose-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Incorrect</span>}
                      {isUnattempted && <span className="text-xs font-bold text-amber-400">Unattempted</span>}
                    </div>

                    <h4 className="font-semibold text-slate-100 text-sm">{q.question}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, oIdx) => {
                        let optStyle = 'bg-slate-800/40 text-slate-400 border-slate-800';
                        if (oIdx === q.correctIndex) optStyle = 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 font-semibold';
                        if (userChoice === oIdx && !isCorrect) optStyle = 'bg-rose-500/20 text-rose-200 border-rose-500/50 font-semibold';

                        return (
                          <div key={oIdx} className={`p-2.5 rounded-lg border ${optStyle}`}>
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-300 space-y-1">
                      <div className="font-bold text-emerald-400">Explanation:</div>
                      <div>{q.explanation}</div>
                    </div>

                    {!isCorrect && !isUnattempted && (
                      <button
                        onClick={() => handleSaveToMistakeVault(q, userChoice)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save to Mistake Vault</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
