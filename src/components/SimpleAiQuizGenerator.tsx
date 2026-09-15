import React, { useState, useEffect } from 'react';
import { SubjectType, MCQQuestion, SavedMistake, SavedAiQuiz } from '../types';
import { Sparkles, Loader2, CheckCircle2, XCircle, RotateCcw, Brain, Bookmark, AlertTriangle, Lightbulb, Target, BookOpen, Dna, FlaskConical, Zap, Languages, ArrowRight, FolderOpen, Trash2 } from 'lucide-react';
import { saveMistakeToFirestore, saveAiQuiz, updateAiQuizAttempt, deleteAiQuiz, subscribeToAiQuizzes } from '../lib/firestoreService';
import type { User } from '../lib/firebase';

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  concept: string;
}

type DifficultyMode = 'NORMAL' | 'ADVANCED' | 'ULTRA_ADVANCED';

interface SimpleAiQuizGeneratorProps {
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  firebaseUser?: User | null;
  setExamHistory?: React.Dispatch<React.SetStateAction<any[]>>;
  onSignIn?: () => void;
}

export const SimpleAiQuizGenerator: React.FC<SimpleAiQuizGeneratorProps> = ({
  savedMistakes = [],
  setSavedMistakes,
  firebaseUser,
  setExamHistory,
  onSignIn
}) => {
  const [subject, setSubject] = useState<SubjectType>('Biology');
  const [topic, setTopic] = useState('');
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('NORMAL');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongAnswerAnalyses, setWrongAnswerAnalyses] = useState<Record<number, any>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<Record<number, boolean>>({});
  const [deepInsights, setDeepInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedQuestionForAnalysis, setSelectedQuestionForAnalysis] = useState<number | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'generator' | 'saved'>('generator');
  const [savedQuizzes, setSavedQuizzes] = useState<SavedAiQuiz[]>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_saved_ai_quizzes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [reopeningQuiz, setReopeningQuiz] = useState<SavedAiQuiz | null>(null);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nmdcat_saved_ai_quizzes', JSON.stringify(savedQuizzes));
    } catch {}
  }, [savedQuizzes]);

  // Load saved quizzes from Firestore on mount
  useEffect(() => {
    if (!firebaseUser) return;

    setIsLoadingQuizzes(true);
    const unsubscribe = subscribeToAiQuizzes(firebaseUser.uid, (quizzes) => {
      if (quizzes && quizzes.length > 0) {
        setSavedQuizzes(prev => {
          const map = new Map();
          [...prev, ...quizzes].forEach(q => map.set(q.id, q));
          return Array.from(map.values());
        });
      }
      setIsLoadingQuizzes(false);
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  const saveQuizToFirestore = async () => {
    if (!generatedQuestions.length) return;

    setIsSaving(true);
    setSaveError(null);

    const quizId = `ai_quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newQuiz: SavedAiQuiz = {
      id: quizId,
      userId: firebaseUser ? firebaseUser.uid : 'local_student',
      subject,
      topic,
      difficultyMode,
      questionCount: generatedQuestions.length,
      questions: generatedQuestions,
      attemptCount: 0,
      bestScore: 0,
      lastScore: 0,
      lastAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSavedQuizzes(prev => [newQuiz, ...prev]);
    setSavedQuizId(quizId);

    if (firebaseUser) {
      try {
        await saveAiQuiz(firebaseUser.uid, {
          userId: firebaseUser.uid,
          subject,
          topic,
          difficultyMode,
          questionCount: generatedQuestions.length,
          questions: generatedQuestions
        });
      } catch (err: any) {
        console.warn('[Firestore] Background save quiz error:', err);
      }
    }

    setIsSaving(false);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(prev => ({ ...prev, [quizId]: true }));
    setSavedQuizzes(prev => prev.filter(q => q.id !== quizId));

    if (firebaseUser) {
      try {
        await deleteAiQuiz(quizId);
      } catch (err: any) {
        console.warn('Failed to delete quiz in Firestore:', err);
      }
    }

    setIsDeleting(prev => ({ ...prev, [quizId]: false }));
  };

  const openSavedQuiz = (quiz: SavedAiQuiz) => {
    setReopeningQuiz(quiz);
    setGeneratedQuestions(quiz.questions);
    setUserAnswers({});
    setShowResults(false);
    setViewMode('generator');
    setSubject(quiz.subject);
    setTopic(quiz.topic);
    setDifficultyMode(quiz.difficultyMode);
    setQuestionCount(quiz.questionCount);
    setSavedQuizId(quiz.id);
    setWrongAnswerAnalyses({});
    setDeepInsights(null);
    setSelectedQuestionForAnalysis(null);
  };

  const difficultyDescriptions = {
    NORMAL: 'Standard NMDCAT preparation level.\n- Direct concepts\n- Textbook based\n- Moderate distractors',
    ADVANCED: 'High-level preparation.\n- Multi-concept questions\n- Application based\n- Tricky distractors',
    ULTRA_ADVANCED: 'Expert challenge mode.\n- Deep reasoning\n- Integrated concepts\n- Medical entrance level difficulty'
  };

  const generateQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedQuestions([]);
    setUserAnswers({});
    setShowResults(false);

    try {
      const response = await fetch('/api/generate-quiz-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic,
          difficultyMode,
          quantity: questionCount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      setGeneratedQuestions(data.questions || []);
      
      // Auto-save the generated quiz
      if (data.questions && data.questions.length > 0 && firebaseUser) {
        saveQuizToFirestore();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const calculateScore = () => {
    let correct = 0;
    generatedQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: generatedQuestions.length, percentage: Math.round((correct / generatedQuestions.length) * 100) };
  };

  const saveQuizAttempt = async () => {
    if (!setExamHistory) return;

    const score = calculateScore();
    const attempt = {
      id: `ai_quiz_${Date.now()}`,
      date: new Date().toISOString(),
      dateCompleted: new Date().toISOString(),
      title: `AI Quiz: ${topic}`,
      examTitle: `${subject} - ${topic} (${difficultyMode})`,
      subject: subject,
      totalQuestions: score.total,
      score: score.correct,
      totalMarks: score.total,
      percentage: score.percentage,
      timeSpentSeconds: 0,
      timeSpentMinutes: 0,
      negativeMarking: false,
      subjectBreakdown: {
        [subject]: {
          correct: score.correct,
          incorrect: score.total - score.correct,
          unattempted: 0,
          total: score.total
        }
      },
      userAnswers: userAnswers,
      mode: 'Untimed' as const
    };

    setExamHistory(prev => [attempt, ...prev]);

    // Update saved quiz attempt data if this is a saved quiz
    if (savedQuizId) {
      await updateAiQuizAttempt(savedQuizId, score.correct, score.total);
    }
  };

  const resetQuiz = () => {
    setGeneratedQuestions([]);
    setUserAnswers({});
    setShowResults(false);
    setError(null);
    setWrongAnswerAnalyses({});
    setDeepInsights(null);
    setSelectedQuestionForAnalysis(null);
    setSavedQuizId(null);
    setReopeningQuiz(null);
  };

  const analyzeWrongAnswer = async (questionIndex: number) => {
    const q = generatedQuestions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    
    if (userAnswer === q.correctAnswer) return;

    setLoadingAnalysis(prev => ({ ...prev, [questionIndex]: true }));

    try {
      const response = await fetch('/api/analyze-wrong-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          userAnswer: userAnswer,
          explanation: q.explanation,
          topic: topic,
          subject: subject
        })
      });

      const data = await response.json();

      if (data.success) {
        setWrongAnswerAnalyses(prev => ({ ...prev, [questionIndex]: data.analysis }));
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
    } finally {
      setLoadingAnalysis(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const generateDeepInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/deep-ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: generatedQuestions,
          userAnswers,
          subject,
          topic,
          difficultyMode
        })
      });

      const data = await response.json();

      if (data.success) {
        setDeepInsights(data.insights);
      }
    } catch (err: any) {
      console.error('Deep insights failed:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const addToMistakeVault = async (questionIndex: number) => {
    const q = generatedQuestions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    const optionIndex = ['A', 'B', 'C', 'D'].indexOf(userAnswer);

    if (!firebaseUser) {
      alert('Please sign in to save mistakes to the vault.');
      return;
    }

    const mistake: SavedMistake = {
      questionId: `ai_quiz_${Date.now()}_${questionIndex}`,
      question: {
        id: `ai_quiz_${Date.now()}_${questionIndex}`,
        subject: subject as SubjectType,
        chapter: topic,
        topic: topic,
        question: q.question,
        options: q.options,
        correctIndex: ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer),
        explanation: q.explanation,
        difficulty: q.difficulty as 'Easy' | 'Medium' | 'Hard',
        type: 'Standard'
      },
      wrongAnswerIndex: optionIndex,
      dateAdded: new Date().toISOString(),
      notes: wrongAnswerAnalyses[questionIndex]?.knowledgeGap || '',
      isResolved: false,
      errorPattern: 'Conceptual Gap'
    };

    if (setSavedMistakes) {
      setSavedMistakes(prev => [mistake, ...prev]);
    }

    if (firebaseUser) {
      await saveMistakeToFirestore(firebaseUser.uid, mistake);
    }

    alert('Added to Mistake Vault!');
  };

  const getSubjectIcon = (sub: SubjectType) => {
    switch (sub) {
      case 'Biology': return <Dna className="w-5 h-5 text-emerald-400" />;
      case 'Chemistry': return <FlaskConical className="w-5 h-5 text-teal-400" />;
      case 'Physics': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'English': return <Languages className="w-5 h-5 text-indigo-400" />;
      case 'Logical Reasoning': return <Brain className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-[28px] border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_-32px_rgba(99,102,241,0.4)]">
        <div className="mb-2 flex items-center gap-2 text-indigo-300 text-[11px] font-semibold uppercase tracking-[0.25em]">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Quiz Generator</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              AI Quiz Generator
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Generate NMDCAT-style questions instantly using AI for any topic, chapter, or concept.
            </p>
          </div>
          {firebaseUser && (
            <button
              onClick={() => setViewMode(viewMode === 'generator' ? 'saved' : 'generator')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              {viewMode === 'generator' ? (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span>My Quizzes</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>New Quiz</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* My AI Quizzes View */}
      {viewMode === 'saved' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">My AI Quizzes</h2>
            <button
              onClick={() => setViewMode('generator')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-sm rounded-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate New Quiz
            </button>
          </div>

          {isLoadingQuizzes ? (
            <div className="flex items-center justify-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : savedQuizzes.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              No saved AI quizzes yet.
              <br />
              <button
                onClick={() => setViewMode('generator')}
                className="mt-4 text-indigo-400 hover:underline"
              >
                Generate your first quiz
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                          {quiz.subject}
                        </span>
                        <span className="text-[10px] text-slate-500">{quiz.difficultyMode}</span>
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm">{quiz.topic}</h3>
                    </div>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      disabled={isDeleting[quiz.id]}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-slate-800/60 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isDeleting[quiz.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Questions</div>
                      <div className="font-semibold text-white">{quiz.questionCount}</div>
                    </div>
                    <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Best Score</div>
                      <div className="font-semibold text-emerald-400">{quiz.bestScore}/{quiz.questionCount}</div>
                    </div>
                    <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Attempts</div>
                      <div className="font-semibold text-white">{quiz.attemptCount}</div>
                    </div>
                    <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <div className="text-slate-400">Last Score</div>
                      <div className="font-semibold text-white">{quiz.lastScore}/{quiz.questionCount}</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Created: {new Date(quiz.createdAt).toLocaleDateString()}
                  </div>

                  <button
                    onClick={() => openSavedQuiz(quiz)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Quiz</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generation Form */}
      {viewMode === 'generator' && !generatedQuestions.length && (
        <div className="mx-auto max-w-2xl space-y-6 rounded-[24px] border border-slate-800/80 bg-slate-900/80 p-6 sm:p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.95)]">
          <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
            Configure Your AI Quiz
          </h2>

          {/* Subject Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Select Subject:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as SubjectType[]).map(sub => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubject(sub)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all ${
                    subject === sub
                      ? 'bg-indigo-500 text-slate-950 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {getSubjectIcon(sub)}
                  <span>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Enter Topic:</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Cell membrane transport, CRISPR gene editing, Thermodynamics"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Difficulty Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Difficulty Mode:</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(['NORMAL', 'ADVANCED', 'ULTRA_ADVANCED'] as DifficultyMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDifficultyMode(mode)}
                  className={`p-3 rounded-xl text-xs font-bold transition-all ${
                    difficultyMode === mode
                      ? 'bg-indigo-500 text-slate-950 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <div className="font-semibold mb-1">{mode}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{difficultyDescriptions[mode].split('\n')[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Number of Questions:</label>
            <div className="flex gap-2">
              {[5, 10, 20, 50].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                    questionCount === count
                      ? 'bg-indigo-500 text-slate-950 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={generateQuiz}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating AI Quiz...</span>
              </>
            ) : (
              <>
                <span>Generate Quiz</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Save Status */}
          {savedQuizId && !saveError && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Quiz saved to My AI Quizzes</span>
            </div>
          )}

          {saveError && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400 text-xs">
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Quiz Display */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Question Header Progress Bar */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs font-bold text-slate-300">
              AI Quiz: {topic}
            </div>
            <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(userAnswers).length / generatedQuestions.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
              {difficultyMode}
            </span>
          </div>

          {/* Questions */}
          {generatedQuestions.map((q, idx) => (
            <div key={idx} className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Question {idx + 1} of {generatedQuestions.length}</span>
                  <span className="text-xs text-slate-500">• {q.difficulty}</span>
                  <span className="text-xs text-slate-500">• {q.concept}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                  {q.question}
                </h2>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {q.options.map((option, optIdx) => {
                  const optionLetter = ['A', 'B', 'C', 'D'][optIdx];
                  const isSelected = userAnswers[idx] === optionLetter;
                  const isCorrect = q.correctAnswer === optionLetter;
                  const showCorrectness = showResults;

                  let optionStyle = 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-slate-600';

                  if (showCorrectness) {
                    if (isCorrect) {
                      optionStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-semibold';
                    } else {
                      optionStyle = 'bg-slate-800/40 border-slate-800 text-slate-500';
                    }
                  } else if (isSelected) {
                    optionStyle = 'bg-indigo-500/20 border-indigo-500/60 text-indigo-200 font-semibold';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => !showResults && handleAnswer(idx, optionLetter)}
                      disabled={showResults}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm text-left transition-all ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-slate-100 text-slate-900' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {optionLetter}
                        </span>
                        <span>{option}</span>
                      </div>

                      {showCorrectness && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      {showCorrectness && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Analysis (shown after submission) */}
              {showResults && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
                    <div className="font-bold text-emerald-400">Explanation:</div>
                    <p className="text-slate-300 text-sm leading-relaxed">{q.explanation}</p>
                  </div>

                  {/* Wrong Answer Analysis */}
                  {userAnswers[idx] !== q.correctAnswer && (
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setSelectedQuestionForAnalysis(idx);
                          analyzeWrongAnswer(idx);
                        }}
                        disabled={loadingAnalysis[idx]}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingAnalysis[idx] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Analyzing Mistake...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4" />
                            <span>Why Was I Wrong?</span>
                          </>
                        )}
                      </button>

                      {wrongAnswerAnalyses[idx] && (
                        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
                          <div className="font-bold text-indigo-300 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            <span>AI Analysis</span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="font-semibold text-amber-400 mb-1">Why You Were Wrong</div>
                              <p className="text-slate-300">{wrongAnswerAnalyses[idx].whyYouWereWrong}</p>
                            </div>

                            <div>
                              <div className="font-semibold text-emerald-400 mb-1">Correct Concept</div>
                              <p className="text-slate-300">{wrongAnswerAnalyses[idx].correctConcept}</p>
                            </div>

                            <div>
                              <div className="font-semibold text-sky-400 mb-1">Why Correct Answer Is Correct</div>
                              <p className="text-slate-300">{wrongAnswerAnalyses[idx].whyCorrectAnswerIsCorrect}</p>
                            </div>

                            <div>
                              <div className="font-semibold text-rose-400 mb-1">Why Your Answer Is Wrong</div>
                              <p className="text-slate-300">{wrongAnswerAnalyses[idx].whyYourAnswerIsWrong}</p>
                            </div>

                            {wrongAnswerAnalyses[idx].knowledgeGap && (
                              <div>
                                <div className="font-semibold text-amber-400 mb-1">Knowledge Gap</div>
                                <p className="text-slate-300">{wrongAnswerAnalyses[idx].knowledgeGap}</p>
                              </div>
                            )}

                            {wrongAnswerAnalyses[idx].recommendedRevision && (
                              <div>
                                <div className="font-semibold text-indigo-400 mb-1">Recommended Revision</div>
                                <p className="text-slate-300">{wrongAnswerAnalyses[idx].recommendedRevision}</p>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => addToMistakeVault(idx)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
                          >
                            <Bookmark className="w-4 h-4" />
                            <span>Add to Mistake Vault</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Submit Button */}
          {!showResults && (
            <button
              onClick={() => {
                setShowResults(true);
                saveQuizAttempt();
              }}
              disabled={Object.keys(userAnswers).length < generatedQuestions.length}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Submit Quiz</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Results Screen */}
      {showResults && generatedQuestions.length > 0 && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Score Summary */}
          <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Quiz Complete!</h2>
                <p className="text-slate-400 mt-2">
                  {calculateScore().correct} out of {calculateScore().total} correct ({calculateScore().percentage}%)
                </p>
              </div>
              <button
                onClick={resetQuiz}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                New Quiz
              </button>
            </div>

            {/* Deep AI Insights Button */}
            {!deepInsights && (
              <button
                onClick={generateDeepInsights}
                disabled={loadingInsights}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Performance...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>Deep AI Insights</span>
                  </>
                )}
              </button>
            )}

            {/* Deep AI Insights Display */}
            {deepInsights && (
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-4">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Brain className="w-5 h-5" />
                  <span>Deep AI Insights</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <div className="font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Strong Concepts
                    </div>
                    <ul className="text-slate-300 space-y-1">
                      {deepInsights.strongConcepts?.map((c: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <div className="font-semibold text-rose-400 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Weak Concepts
                    </div>
                    <ul className="text-slate-300 space-y-1">
                      {deepInsights.weakConcepts?.map((c: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <div className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Knowledge Gaps
                    </div>
                    <ul className="text-slate-300 space-y-1">
                      {deepInsights.knowledgeGaps?.map((c: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <div className="font-semibold text-sky-400 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Recommended Revision
                    </div>
                    <ul className="text-slate-300 space-y-1">
                      {deepInsights.recommendedRevision?.map((c: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-sky-400">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {deepInsights.overallPerformance && (
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <div className="font-semibold text-white mb-2">Overall Performance</div>
                    <p className="text-slate-300 text-sm">{deepInsights.overallPerformance}</p>
                  </div>
                )}

                {deepInsights.recommendedNextTopics && deepInsights.recommendedNextTopics.length > 0 && (
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                    <div className="font-semibold text-white mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Recommended Next Topics
                    </div>
                    <ul className="text-slate-300 text-sm space-y-1">
                      {deepInsights.recommendedNextTopics.map((t: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
