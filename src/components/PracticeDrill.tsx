import React, { useState, useEffect } from 'react';
import { MCQQuestion, SubjectType, SavedMistake } from '../types';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { fetchPublishedMcqsForTopic } from '../lib/firestoreService';
import { matchQuestionsFromBank } from '../utils/topicMatcher';
import { AiActionStatus } from './AiActionStatus';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Bookmark, 
  Loader2, 
  Dna, 
  FlaskConical, 
  Zap, 
  Languages, 
  Brain,
  HelpCircle
} from 'lucide-react';

interface PracticeDrillProps {
  questionBank: MCQQuestion[];
  savedMistakes: SavedMistake[];
  setSavedMistakes: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  initialSubject?: SubjectType;
  initialTopic?: string;
}

export const PracticeDrill: React.FC<PracticeDrillProps> = ({
  questionBank,
  savedMistakes,
  setSavedMistakes,
  initialSubject = 'Biology',
  initialTopic,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>(initialSubject);
  const [drillMode, setDrillMode] = useState<'bank' | 'ai'>('bank');
  const [mcqCount, setMcqCount] = useState<number>(5);
  
  // Drill execution state
  const [activeQuestions, setActiveQuestions] = useState<MCQQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isDrillActive, setIsDrillActive] = useState<boolean>(false);
  const [isDrillCompleted, setIsDrillCompleted] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAiExp, setLoadingAiExp] = useState(false);
  const aiMcqAction = useAiRequestAction();
  const aiExplanationAction = useAiRequestAction();

  const subjects: SubjectType[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];

  const getSubjectIcon = (sub: SubjectType) => {
    switch (sub) {
      case 'Biology': return <Dna className="w-5 h-5 text-emerald-400" />;
      case 'Chemistry': return <FlaskConical className="w-5 h-5 text-teal-400" />;
      case 'Physics': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'English': return <Languages className="w-5 h-5 text-indigo-400" />;
      case 'Logical Reasoning': return <Brain className="w-5 h-5 text-purple-400" />;
    }
  };


  const handleStartDrill = async () => {
    if (drillMode === 'bank') {
      let filtered = matchQuestionsFromBank(questionBank, {
        subject: selectedSubject,
        topic: initialTopic,
        limit: mcqCount
      });
      if (filtered.length === 0) {
        try {
          const remote = await fetchPublishedMcqsForTopic(selectedSubject, undefined, initialTopic, mcqCount * 2);
          if (remote && remote.length > 0) {
            filtered = remote as MCQQuestion[];
          }
        } catch (e) {
          console.warn('Error loading remote questions for drill:', e);
        }
      }
      const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, mcqCount);

      // Use verified questions for the selected subject
      setActiveQuestions(shuffled);
      setCurrentIndex(0);
      setUserAnswers({});
      setIsDrillActive(true);
      setIsDrillCompleted(false);
      setAiExplanation(null);
    } else {
      // AI Generated MCQs Mode
      if (aiMcqAction.isLoading) return;

      try {
        const data = await aiMcqAction.runRequest(
          async (signal) =>
            await aiFetch<{ mcqs?: MCQQuestion[] }>('/api/generate-mcqs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: selectedSubject,
                topic: initialTopic || `${selectedSubject} High-Yield NMDCAT Questions`,
                count: mcqCount,
                difficulty: 'NMDCAT Standard'
              })
            }, { signal }),
          {
            pending: 'Generating AI MCQs...',
            success: 'AI MCQs generated successfully.',
            cancelled: 'AI MCQ generation cancelled.',
            failure: 'Failed to generate AI MCQs. Please retry.'
          }
        );

        if (data.mcqs && data.mcqs.length > 0) {
          setActiveQuestions(data.mcqs);
          setCurrentIndex(0);
          setUserAnswers({});
          setIsDrillActive(true);
          setIsDrillCompleted(false);
          setAiExplanation(null);
        } else {
          // Fallback to database questions for the selected subject
          let filtered = matchQuestionsFromBank(questionBank, {
            subject: selectedSubject,
            topic: initialTopic,
            limit: mcqCount
          });
          if (filtered.length === 0) {
            const remote = await fetchPublishedMcqsForTopic(selectedSubject, undefined, initialTopic, mcqCount);
            if (remote && remote.length > 0) filtered = remote as MCQQuestion[];
          }
          setActiveQuestions(filtered.slice(0, mcqCount));
          setIsDrillActive(true);
        }
      } catch (err) {
        if (isAiRequestCancelled(err)) {
          setIsDrillActive(false);
          return;
        }
        if (import.meta.env.DEV) console.error('Error generating AI MCQs:', err);
        // Fallback to database questions for the selected subject
        let filtered = matchQuestionsFromBank(questionBank, {
          subject: selectedSubject,
          topic: initialTopic,
          limit: mcqCount
        });
        if (filtered.length === 0) {
          const remote = await fetchPublishedMcqsForTopic(selectedSubject, undefined, initialTopic, mcqCount);
          if (remote && remote.length > 0) filtered = remote as MCQQuestion[];
        }
        setActiveQuestions(filtered.slice(0, mcqCount));
        setIsDrillActive(true);
      }
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (userAnswers[currentIndex] !== undefined) return; // Answered already
    setUserAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }));

    const currentQ = activeQuestions[currentIndex];
    if (currentQ && optionIndex !== currentQ.correctIndex) {
      const exists = savedMistakes.some(m => m.questionId === currentQ.id || m.question.question === currentQ.question);
      if (!exists) {
        const newMistake: SavedMistake = {
          questionId: currentQ.id || `drill_${Date.now()}_${currentIndex}`,
          question: currentQ,
          wrongAnswerIndex: optionIndex,
          dateAdded: new Date().toISOString(),
          notes: 'Auto-saved from Practice Drill',
          isResolved: false,
          errorPattern: 'Conceptual Gap'
        };
        setSavedMistakes(prev => [newMistake, ...prev]);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAiExplanation(null);
    } else {
      setIsDrillCompleted(true);
    }
  };

  const handleSaveToMistakes = (q: MCQQuestion, wrongIdx: number) => {
    const exists = savedMistakes.some(m => m.questionId === q.id || m.question.question === q.question);
    if (!exists) {
      const newMistake: SavedMistake = {
        questionId: q.id || `q-${Date.now()}`,
        question: q,
        wrongAnswerIndex: wrongIdx,
        dateAdded: new Date().toLocaleDateString(),
        isResolved: false
      };
      setSavedMistakes(prev => [newMistake, ...prev]);
      alert('Question saved to Mistake Vault for future revision!');
    } else {
      alert('This question is already in your Mistake Vault.');
    }
  };

  const fetchAiExplanation = async (q: MCQQuestion, chosenIndex: number) => {
    if (aiExplanationAction.isLoading) return;

    try {
      setLoadingAiExp(true);
      const data = await aiExplanationAction.runRequest(
        async (signal) =>
          await aiFetch<{ explanation?: string }>('/api/explain-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionText: q.question,
              options: q.options,
              correctAnswer: q.options[q.correctIndex],
              userChoice: q.options[chosenIndex],
              subject: q.subject
            })
          }, { signal }),
        {
          pending: 'Generating AI explanation...',
          success: 'AI explanation received.',
          cancelled: 'AI explanation request cancelled.',
          failure: 'Failed to generate explanation. Please retry.'
        }
      );

      setAiExplanation(data.explanation || 'Unable to retrieve AI explanation.');
    } catch (err) {
      if (isAiRequestCancelled(err)) return;
      setAiExplanation(aiExplanationAction.errorMessage || 'AI explanation failed.');
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setLoadingAiExp(false);
    }
  };

  const currentQ = activeQuestions[currentIndex];
  const userChoice = userAnswers[currentIndex];
  const isAnswered = userChoice !== undefined;

  // Score calculation for completed drill
  const correctCount = Object.entries(userAnswers).filter(([idx, ansIdx]) => {
    return activeQuestions[parseInt(idx)]?.correctIndex === ansIdx;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_-32px_rgba(16,185,129,0.4)]">
        <div className="mb-2 flex items-center gap-2 text-emerald-300 text-[11px] font-semibold uppercase tracking-[0.25em]">
          <BookOpen className="w-4 h-4" />
          <span>Interactive Practice Module</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          NMDCAT Practice Drills
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Solve chapter-wise MCQs or generate fresh AI standard questions with step-by-step scientific explanations.
        </p>
      </div>

      {/* Mode 1: Configure & Launch Drill */}
      {!isDrillActive && !isDrillCompleted && (
        <div className="mx-auto max-w-2xl space-y-6 rounded-[24px] border border-slate-800/80 bg-slate-900/80 p-6 sm:p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.95)]">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            Configure Your Practice Session
          </h2>

          {/* Subject Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Select Subject:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subjects.map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${
                    selectedSubject === sub
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {getSubjectIcon(sub)}
                  <span>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Source Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Question Source:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDrillMode('bank')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  drillMode === 'bank'
                    ? 'bg-slate-800 border-emerald-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-xs text-emerald-400 mb-0.5">PMDC Question Bank</div>
                <div className="text-[11px] text-slate-400">Past papers & official textbook questions</div>
              </button>

              <button
                type="button"
                onClick={() => setDrillMode('ai')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  drillMode === 'ai'
                    ? 'bg-slate-800 border-indigo-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-xs text-indigo-400 mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Generated MCQs</span>
                </div>
                <div className="text-[11px] text-slate-400">Fresh NMDCAT standard questions via Gemini AI</div>
              </button>
            </div>
          </div>

          {/* MCQ Count */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Number of Questions:</label>
            <div className="flex gap-3">
              {[5, 10, 20].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setMcqCount(count)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    mcqCount === count
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700'
                  }`}
                >
                  {count} Questions
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartDrill}
            disabled={aiMcqAction.isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiMcqAction.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating AI MCQs...</span>
              </>
            ) : (
              <>
                <span>Start Practice Drill</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Mode 2: Active Drill Execution */}
      {isDrillActive && currentQ && !isDrillCompleted && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Question Header Progress Bar */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-300">
              Question {currentIndex + 1} of {activeQuestions.length}
            </div>
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {currentQ.subject}
            </span>
          </div>

          {/* Question Card */}
          <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Chapter: {currentQ.chapter}</span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = userChoice === optIdx;
                const isCorrect = optIdx === currentQ.correctIndex;
                
                let optionStyle = 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-slate-600';
                
                if (isAnswered) {
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-semibold';
                  } else {
                    optionStyle = 'bg-slate-800/40 border-slate-800 text-slate-500';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleOptionSelect(optIdx)}
                    disabled={isAnswered}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm text-left transition-all ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-slate-100 text-slate-900' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation & AI Explainer */}
            {isAnswered && (
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">Standard Explanation:</span>
                    {currentQ.pastPaperTag && (
                      <span className="text-[10px] text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded">
                        {currentQ.pastPaperTag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                </div>

                {/* AI Detailed Breakdown Button */}
                {!aiExplanation ? (
                  <button
                    onClick={() => fetchAiExplanation(currentQ, userChoice)}
                    disabled={loadingAiExp}
                    className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3.5 py-2 rounded-lg border border-indigo-500/20 transition-colors"
                  >
                    {loadingAiExp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Get Deep AI Scientific Explanation</span>
                  </button>
                ) : (
                  <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed space-y-1">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span>AI Tutor Breakdown:</span>
                    </div>
                    <div className="whitespace-pre-wrap mt-1">{aiExplanation}</div>
                  </div>
                )}

                {/* Save Wrong Question to Vault */}
                {userChoice !== currentQ.correctIndex && (
                  <button
                    onClick={() => handleSaveToMistakes(currentQ, userChoice)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save to Mistake Vault</span>
                  </button>
                )}
              </div>
            )}

            {/* Next / Submit Button */}
            {isAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-md"
                >
                  <span>{currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'Complete Drill'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Completed Drill Summary */}
      {isDrillCompleted && (
        <div className="bg-slate-900/90 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Drill Completed!</h2>
            <p className="text-xs text-slate-400 mt-1">Here is your performance summary for {selectedSubject}</p>
          </div>

          <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700/60 flex items-center justify-around">
            <div>
              <div className="text-3xl font-black text-emerald-400">
                {correctCount} / {activeQuestions.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Correct Answers</div>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div>
              <div className="text-3xl font-black text-white">
                {Math.round((correctCount / activeQuestions.length) * 100)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">Score Accuracy</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setIsDrillActive(false);
                setIsDrillCompleted(false);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
