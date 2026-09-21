import React, { useEffect, useMemo, useState } from 'react';
import UiCard from './UiCard';
import { MCQQuestion, ExamAttempt } from '../types';
import confetti from 'canvas-confetti';
import { saveExamAttemptToFirestore, saveMistakeToFirestore } from '../lib/firestoreService';
import { auth } from '../lib/firebase';

interface TopicQuizRunnerProps {
  questions: MCQQuestion[];
  source: 'DATABASE' | 'AI';
  meta: { subject: string; chapter: string; topic: string };
  onClose?: () => void;
}

export const TopicQuizRunner: React.FC<TopicQuizRunnerProps> = ({ questions, source, meta, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [startedAt] = useState(Date.now());
  // use the firebase auth instance to check current user
  const authInstance = auth;

  useEffect(() => {
    // reset when questions change
    setCurrentIdx(0);
    setUserAnswers({});
    setIsSubmitted(false);
    setIsReviewing(false);
  }, [questions]);

  const currentQ = questions[currentIdx];

  const handleSelect = (idx: number) => {
    setUserAnswers(prev => ({ ...prev, [currentIdx]: idx }));
  };

  const handleNext = () => setCurrentIdx(i => Math.min(i + 1, questions.length - 1));
  const handlePrev = () => setCurrentIdx(i => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    setIsSubmitted(true);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

    const correctCount = questions.reduce((sum, q, i) => sum + (userAnswers[i] === q.correctIndex ? 1 : 0), 0);
    const attempt: ExamAttempt = {
      id: `topic-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      title: `Topic Quiz: ${meta.topic}`,
      totalQuestions: questions.length,
      score: correctCount,
      totalMarks: questions.length,
      percentage: Math.round((correctCount / questions.length) * 100),
      timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
      negativeMarking: false,
      subject: meta.subject as any,
      subjectBreakdown: {} as any,
      userAnswers
    };

    // persist attempt and wrong mistakes if user logged in
    try {
      if (authInstance?.currentUser?.uid) {
        await saveExamAttemptToFirestore(authInstance.currentUser.uid, attempt);
        
        // Auto-save wrong answers to Mistake Vault
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const userAns = userAnswers[i];
          if (userAns !== undefined && userAns !== q.correctIndex) {
            await saveMistakeToFirestore(authInstance.currentUser.uid, {
              questionId: q.id || `topic_mistake_${Date.now()}_${i}`,
              question: q,
              wrongAnswerIndex: userAns,
              dateAdded: new Date().toISOString(),
              notes: `Auto-saved from Topic Quiz: ${meta.topic}`,
              isResolved: false,
              errorPattern: 'Conceptual Gap'
            });
          }
        }
      }
    } catch (e) {
      // ignore save errors
    }
  };

  const correctCount = questions.reduce((sum, q, i) => sum + (userAnswers[i] === q.correctIndex ? 1 : 0), 0);

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <UiCard className="z-50 max-w-2xl w-full p-6">
          <h3 className="text-xl font-bold">Quiz Results</h3>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400">Topic</p>
              <p className="font-bold text-white">{meta.topic}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Source</p>
              <p className="font-bold text-white">{source === 'AI' ? 'AI GENERATED' : 'DATABASE'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Questions</p>
              <p className="font-bold text-white">{questions.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Correct</p>
              <p className="font-bold text-white">{correctCount}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={() => { setIsSubmitted(false); setUserAnswers({}); setCurrentIdx(0); }} className="px-3 py-2 rounded bg-slate-800 text-slate-200">Retry Topic</button>
            <button onClick={() => { if (source === 'AI') {/* open builder again - omitted */} }} className="px-3 py-2 rounded bg-emerald-500 text-slate-950">Generate Another AI Quiz</button>
            <button onClick={onClose} className="px-3 py-2 rounded bg-slate-700 text-slate-100">Back to Topic</button>
          </div>

          <div className="mt-6">
            <h4 className="font-bold">Review</h4>
            <div className="mt-3 space-y-3">
              {questions.map((q, i) => (
                <UiCard key={i} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Q{i+1}</div>
                      <div className="font-semibold text-slate-100">{q.question}</div>
                      <div className="text-sm text-slate-300 mt-1">{q.explanation}</div>
                    </div>
                    <div className="text-sm text-right">
                      <div className={`px-2 py-1 rounded ${userAnswers[i] === q.correctIndex ? 'bg-emerald-500 text-slate-900' : 'bg-rose-500 text-white'}`}>{userAnswers[i] === q.correctIndex ? 'Correct' : 'Incorrect'}</div>
                    </div>
                  </div>
                </UiCard>
              ))}
            </div>
          </div>
        </UiCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <UiCard className="z-50 max-w-3xl w-full p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">{meta.subject} • {meta.chapter}</div>
            <h3 className="text-lg font-bold">{meta.topic}</h3>
            <div className="text-sm text-slate-400">Source: {source === 'AI' ? 'AI GENERATED' : 'DATABASE'}</div>
          </div>
          <div className="text-sm text-slate-400">Question {currentIdx + 1} / {questions.length}</div>
        </div>

        <div className="mt-4">
          <div className="font-semibold text-white">{currentQ.question}</div>
          <div className="mt-3 grid gap-2">
            {currentQ.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleSelect(idx)} className={`w-full text-left p-3 rounded ${userAnswers[currentIdx] === idx ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-200'}`}>{String.fromCharCode(65+idx)}. {opt}</button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={handlePrev} className="px-3 py-2 rounded bg-slate-800">Previous</button>
            <button onClick={handleNext} className="px-3 py-2 rounded bg-slate-800">Next</button>
          </div>
          <div>
            <button onClick={handleSubmit} className="px-4 py-2 rounded bg-emerald-500 text-slate-900 font-bold">Submit Quiz</button>
          </div>
        </div>
      </UiCard>
    </div>
  );
};

export default TopicQuizRunner;
