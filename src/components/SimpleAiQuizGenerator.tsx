import React, { useState, useEffect } from 'react';
import { SubjectType, MCQQuestion, SavedMistake, SavedAiQuiz, CustomMCQ } from '../types';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Brain, 
  Bookmark, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  BookOpen, 
  Dna, 
  FlaskConical, 
  Zap, 
  Languages, 
  ArrowRight, 
  FolderOpen, 
  Trash2,
  Save,
  Copy,
  Check,
  Share2,
  FileText,
  Database
} from 'lucide-react';
import { 
  saveMistakeToFirestore, 
  saveAiQuiz, 
  updateAiQuizAttempt, 
  deleteAiQuiz, 
  subscribeToAiQuizzes, 
  createCustomMCQ,
  fetchPublishedMcqsForTopic,
  fetchRandomPublishedMcqs
} from '../lib/firestoreService';
import { aiFetch, getAiFriendlyMessage } from '../lib/aiRequest';
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
  questionBank?: MCQQuestion[];
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  firebaseUser?: User | null;
  setExamHistory?: React.Dispatch<React.SetStateAction<any[]>>;
  onSignIn?: () => void;
}

export const SimpleAiQuizGenerator: React.FC<SimpleAiQuizGeneratorProps> = ({
  questionBank = [],
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
  const [insightsError, setInsightsError] = useState<string | null>(null);
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

  // Individual and Bulk MCQ Saving State
  const [savedQuestionIndices, setSavedQuestionIndices] = useState<Record<number, boolean>>({});
  const [savingQuestionIndices, setSavingQuestionIndices] = useState<Record<number, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const [copiedQuiz, setCopiedQuiz] = useState(false);
  const [fallbackSource, setFallbackSource] = useState<string | null>(null);

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
        setSavedQuizzes(quizzes);
      }
      setIsLoadingQuizzes(false);
    });
    return () => unsubscribe();
  }, [firebaseUser]);

  const saveQuizToFirestore = async (questionsToSave?: GeneratedQuestion[]) => {
    const qs = questionsToSave || generatedQuestions;
    if (!qs || !qs.length) return;

    setIsSaving(true);
    setSaveError(null);

    const quizId = savedQuizId || `ai_quiz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newQuiz: SavedAiQuiz = {
      id: quizId,
      userId: firebaseUser ? firebaseUser.uid : 'local_student',
      subject,
      topic,
      difficultyMode,
      questionCount: qs.length,
      questions: qs,
      attemptCount: 0,
      bestScore: 0,
      lastScore: 0,
      lastAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSavedQuizzes(prev => {
      const filtered = prev.filter(q => q.id !== quizId);
      return [newQuiz, ...filtered];
    });
    setSavedQuizId(quizId);

    if (firebaseUser) {
      try {
        await saveAiQuiz(firebaseUser.uid, {
          userId: firebaseUser.uid,
          subject,
          topic,
          difficultyMode,
          questionCount: qs.length,
          questions: qs
        });
      } catch (err: any) {
        console.warn('[Firestore] Background save quiz error:', err);
      }
    }

    setIsSaving(false);
  };

  const handleSaveQuestion = async (questionIndex: number) => {
    const q = generatedQuestions[questionIndex];
    if (!q) return;

    setSavingQuestionIndices(prev => ({ ...prev, [questionIndex]: true }));

    const optionLetters = ['A', 'B', 'C', 'D'];
    const correctIdx = optionLetters.indexOf(q.correctAnswer);

    const customMcq: CustomMCQ = {
      id: `ai_mcq_${Date.now()}_${questionIndex}_${Math.random().toString(36).substring(2, 7)}`,
      userId: firebaseUser ? firebaseUser.uid : 'local_student',
      subject: subject,
      chapter: topic || 'AI Generated',
      topic: topic || 'AI Generated',
      question: q.question,
      options: q.options,
      correctIndex: correctIdx >= 0 ? correctIdx : 0,
      explanation: q.explanation || '',
      difficulty: (q.difficulty === 'Easy' || q.difficulty === 'Medium' || q.difficulty === 'Hard') ? q.difficulty : 'Medium',
      type: 'Standard',
      cognitiveLevel: 'Application',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Cache to local storage
    try {
      const existing = JSON.parse(localStorage.getItem('nmdcat_custom_mcqs') || '[]');
      localStorage.setItem('nmdcat_custom_mcqs', JSON.stringify([customMcq, ...existing]));
    } catch (err) {
      console.warn('Failed to save MCQ to localStorage:', err);
    }

    // 2. Persist to Firestore if user logged in
    if (firebaseUser) {
      try {
        await createCustomMCQ(firebaseUser.uid, {
          subject: subject,
          chapter: topic || 'AI Generated',
          topic: topic || 'AI Generated',
          question: q.question,
          options: q.options,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: q.explanation || '',
          difficulty: (q.difficulty === 'Easy' || q.difficulty === 'Medium' || q.difficulty === 'Hard') ? q.difficulty : 'Medium',
          type: 'Standard',
          cognitiveLevel: 'Application'
        });
      } catch (err) {
        console.warn('Failed to save MCQ to Firestore:', err);
      }
    }

    setSavingQuestionIndices(prev => ({ ...prev, [questionIndex]: false }));
    setSavedQuestionIndices(prev => ({ ...prev, [questionIndex]: true }));
  };

  const handleSaveAllQuestions = async () => {
    if (!generatedQuestions || !generatedQuestions.length) return;
    setIsSavingAll(true);

    const optionLetters = ['A', 'B', 'C', 'D'];
    const mcqsToSave: CustomMCQ[] = generatedQuestions.map((q, idx) => ({
      id: `ai_mcq_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      userId: firebaseUser ? firebaseUser.uid : 'local_student',
      subject: subject,
      chapter: topic || 'AI Generated',
      topic: topic || 'AI Generated',
      question: q.question,
      options: q.options,
      correctIndex: optionLetters.indexOf(q.correctAnswer) >= 0 ? optionLetters.indexOf(q.correctAnswer) : 0,
      explanation: q.explanation || '',
      difficulty: (q.difficulty === 'Easy' || q.difficulty === 'Medium' || q.difficulty === 'Hard') ? q.difficulty : 'Medium',
      type: 'Standard',
      cognitiveLevel: 'Application',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // 1. Cache to local storage
    try {
      const existing = JSON.parse(localStorage.getItem('nmdcat_custom_mcqs') || '[]');
      localStorage.setItem('nmdcat_custom_mcqs', JSON.stringify([...mcqsToSave, ...existing]));
    } catch (err) {
      console.warn('Failed to bulk save MCQs to localStorage:', err);
    }

    // 2. Persist to Firestore
    if (firebaseUser) {
      for (const mcq of mcqsToSave) {
        try {
          await createCustomMCQ(firebaseUser.uid, {
            subject: mcq.subject,
            chapter: mcq.chapter,
            topic: mcq.topic,
            question: mcq.question,
            options: mcq.options,
            correctIndex: mcq.correctIndex,
            explanation: mcq.explanation,
            difficulty: mcq.difficulty,
            type: mcq.type,
            cognitiveLevel: mcq.cognitiveLevel
          });
        } catch (err) {
          console.warn('Failed to bulk save individual MCQ to Firestore:', err);
        }
      }
    }

    const allIndices: Record<number, boolean> = {};
    generatedQuestions.forEach((_, idx) => { allIndices[idx] = true; });
    setSavedQuestionIndices(allIndices);
    setIsSavingAll(false);
    setSavedAll(true);
  };

  const handleCopyQuiz = () => {
    if (!generatedQuestions || !generatedQuestions.length) return;
    const text = generatedQuestions.map((q, idx) => {
      return `Q${idx + 1}: ${q.question}\nA) ${q.options[0]}\nB) ${q.options[1]}\nC) ${q.options[2]}\nD) ${q.options[3]}\nCorrect Answer: ${q.correctAnswer}\nExplanation: ${q.explanation}\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopiedQuiz(true);
    setTimeout(() => setCopiedQuiz(false), 2000);
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
    setIsGenerating(true);
    setError(null);
    setFallbackSource(null);
    setGeneratedQuestions([]);
    setUserAnswers({});
    setShowResults(false);
    setSavedQuestionIndices({});
    setSavedAll(false);
    setWrongAnswerAnalyses({});
    setDeepInsights(null);
    setInsightsError(null);

    // AI Generated Mode
    if (!topic.trim()) {
      setError('Please enter a topic or concept for AI Question Generation');
      setIsGenerating(false);
      return;
    }

    try {
      const data = await aiFetch<{ questions?: GeneratedQuestion[] }>('/api/generate-quiz-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic: topic.trim(),
          difficultyMode,
          quantity: questionCount
        })
      });

      const questions = data.questions || [];
      if (questions.length === 0) {
        throw new Error('AI returned no valid questions. Please try refining your topic.');
      }

      setGeneratedQuestions(questions);
      
      // Auto-save the generated quiz
      if (questions.length > 0) {
        saveQuizToFirestore(questions);
      }
    } catch (err: any) {
      console.warn('AI Quiz Generation failed:', err);
      setError(getAiFriendlyMessage(err) || err.message || 'Failed to generate AI quiz. Please try again.');
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

  const autoSaveMistakesToVault = async () => {
    const mistakesToSave: SavedMistake[] = [];
    const optionLetters = ['A', 'B', 'C', 'D'];

    generatedQuestions.forEach((q, idx) => {
      const userAnswerLetter = userAnswers[idx];
      if (userAnswerLetter && userAnswerLetter !== q.correctAnswer) {
        const wrongOptionIndex = optionLetters.indexOf(userAnswerLetter);
        const correctOptionIndex = optionLetters.indexOf(q.correctAnswer);

        const mistake: SavedMistake = {
          questionId: `ai_mistake_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          question: {
            id: `ai_mistake_q_${Date.now()}_${idx}`,
            subject: subject as SubjectType,
            chapter: topic || 'AI Generated Quiz',
            topic: topic || 'AI Generated Quiz',
            question: q.question,
            options: q.options,
            correctIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
            explanation: q.explanation,
            difficulty: (q.difficulty === 'Easy' || q.difficulty === 'Medium' || q.difficulty === 'Hard') ? q.difficulty : 'Medium',
            type: 'Standard'
          },
          wrongAnswerIndex: wrongOptionIndex >= 0 ? wrongOptionIndex : 0,
          dateAdded: new Date().toISOString(),
          notes: 'Auto-saved to Mistake Book from AI Quiz',
          isResolved: false,
          errorPattern: 'Conceptual Gap'
        };

        mistakesToSave.push(mistake);
      }
    });

    if (mistakesToSave.length > 0) {
      if (setSavedMistakes) {
        setSavedMistakes(prev => {
          const existingQuestions = new Set(prev.map(m => m.question?.question));
          const uniqueNew = mistakesToSave.filter(m => !existingQuestions.has(m.question.question));
          return [...uniqueNew, ...prev];
        });
      }

      // Sync to localStorage
      try {
        const localMistakes = JSON.parse(localStorage.getItem('nmdcat_mistakes') || '[]');
        const existingQ = new Set(localMistakes.map((m: any) => m.question?.question));
        const uniqueLocal = mistakesToSave.filter(m => !existingQ.has(m.question?.question));
        localStorage.setItem('nmdcat_mistakes', JSON.stringify([...uniqueLocal, ...localMistakes]));
      } catch (err) {
        console.warn('Failed to update local mistakes cache:', err);
      }

      // Sync to Firestore if user is signed in
      if (firebaseUser) {
        for (const mistake of mistakesToSave) {
          try {
            await saveMistakeToFirestore(firebaseUser.uid, mistake);
          } catch (err) {
            console.warn('Failed to auto-save mistake to Firestore:', err);
          }
        }
      }
    }
  };

  const resetQuiz = () => {
    setGeneratedQuestions([]);
    setUserAnswers({});
    setShowResults(false);
    setError(null);
    setWrongAnswerAnalyses({});
    setDeepInsights(null);
    setInsightsError(null);
    setSelectedQuestionForAnalysis(null);
    setSavedQuizId(null);
    setReopeningQuiz(null);
    setSavedQuestionIndices({});
    setSavedAll(false);
  };

  const analyzeWrongAnswer = async (questionIndex: number) => {
    const q = generatedQuestions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    
    if (userAnswer === q.correctAnswer) return;

    setLoadingAnalysis(prev => ({ ...prev, [questionIndex]: true }));

    try {
      const data = await aiFetch<{ success?: boolean; analysis?: any }>('/api/analyze-wrong-answer', {
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

      const analysisData = data?.analysis || (data?.whyYouWereWrong ? data : null);
      if (analysisData) {
        setWrongAnswerAnalyses(prev => ({ ...prev, [questionIndex]: analysisData }));
      } else {
        setWrongAnswerAnalyses(prev => ({ 
          ...prev, 
          [questionIndex]: { error: 'Unable to retrieve analysis. Please try again.' } 
        }));
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setWrongAnswerAnalyses(prev => ({ 
        ...prev, 
        [questionIndex]: { error: getAiFriendlyMessage(err) || err.message || 'Failed to analyze misconception.' } 
      }));
    } finally {
      setLoadingAnalysis(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const generateDeepInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const data = await aiFetch<{ success?: boolean; insights?: any }>('/api/deep-ai-insights', {
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

      const insightsData = data?.insights || (data?.overallPerformance ? data : null);
      if (insightsData) {
        setDeepInsights(insightsData);
      } else {
        setInsightsError('No insights returned from AI. Please try again.');
      }
    } catch (err: any) {
      console.error('Deep insights failed:', err);
      setInsightsError(getAiFriendlyMessage(err) || err.message || 'Failed to generate deep insights.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const addToMistakeVault = async (questionIndex: number) => {
    const q = generatedQuestions[questionIndex];
    const userAnswer = userAnswers[questionIndex];
    const optionIndex = ['A', 'B', 'C', 'D'].indexOf(userAnswer);

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
        difficulty: (q.difficulty === 'Easy' || q.difficulty === 'Medium' || q.difficulty === 'Hard') ? q.difficulty : 'Medium',
        type: 'Standard'
      },
      wrongAnswerIndex: optionIndex >= 0 ? optionIndex : 0,
      dateAdded: new Date().toISOString(),
      notes: wrongAnswerAnalyses[questionIndex]?.knowledgeGap || 'Added to Mistake Book',
      isResolved: false,
      errorPattern: 'Conceptual Gap'
    };

    if (setSavedMistakes) {
      setSavedMistakes(prev => [mistake, ...prev.filter(m => m.question.question !== q.question)]);
    }

    try {
      const localMistakes = JSON.parse(localStorage.getItem('nmdcat_mistakes') || '[]');
      localStorage.setItem('nmdcat_mistakes', JSON.stringify([mistake, ...localMistakes.filter((m: any) => m.question?.question !== q.question)]));
    } catch {}

    if (firebaseUser) {
      await saveMistakeToFirestore(firebaseUser.uid, mistake);
    }

    alert('Saved to Mistake Book!');
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
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">Configure Your AI Quiz</h2>
            <p className="text-xs text-slate-400">Generate high-yield NMDCAT-style questions instantly using AI</p>
          </div>

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
                      ? 'bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20'
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Topic or Concept:</label>
              <span className="text-[10px] text-slate-400">Specify any NMDCAT topic</span>
            </div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Cell membrane transport, Photosynthesis, Thermodynamics, Organic reactions"
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
                      ? 'bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20'
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
                      ? 'bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20'
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
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-400 text-slate-950 shadow-indigo-500/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating AI Quiz...</span>
              </>
            ) : (
              <>
                <span>Generate AI Quiz</span>
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
          {/* Question Header Action Bar & Progress Bar */}
          <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {subject} &bull; {topic}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {difficultyMode}
                </span>
                {fallbackSource && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    {fallbackSource}
                  </span>
                )}
              </div>

              {/* Action Buttons: Save Quiz, Save All MCQs, Copy */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveQuizToFirestore()}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    savedQuizId
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="Save entire quiz to My AI Quizzes"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : savedQuizId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{savedQuizId ? 'Quiz Saved' : 'Save Quiz'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllQuestions}
                  disabled={isSavingAll}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    savedAll
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="Save all MCQs into your Custom Question Bank"
                >
                  {isSavingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bookmark className={`w-3.5 h-3.5 ${savedAll ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                  )}
                  <span>{savedAll ? 'All MCQs Saved' : 'Save All MCQs'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyQuiz}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                  title="Copy questions, options and explanations to clipboard"
                >
                  {copiedQuiz ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(Object.keys(userAnswers).length / generatedQuestions.length) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {Object.keys(userAnswers).length} / {generatedQuestions.length} answered
              </span>
            </div>
          </div>

          {/* Questions */}
          {generatedQuestions.map((q, idx) => (
            <div key={idx} className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Question {idx + 1} of {generatedQuestions.length}</span>
                    <span className="text-xs text-slate-500">• {q.difficulty}</span>
                    <span className="text-xs text-slate-500">• {q.concept}</span>
                  </div>

                  {/* Bookmark / Save MCQ Button */}
                  <button
                    type="button"
                    onClick={() => handleSaveQuestion(idx)}
                    disabled={savingQuestionIndices[idx]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      savedQuestionIndices[idx]
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                    }`}
                    title={savedQuestionIndices[idx] ? 'Saved to Question Bank' : 'Save Question to Bank'}
                  >
                    {savingQuestionIndices[idx] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Bookmark className={`w-3.5 h-3.5 ${savedQuestionIndices[idx] ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                    )}
                    <span>{savedQuestionIndices[idx] ? 'Saved' : 'Save MCQ'}</span>
                  </button>
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

                  {/* Wrong Answer Analysis & Auto-Save Badge */}
                  {userAnswers[idx] !== q.correctAnswer && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>This mistake was automatically added to your <strong>Mistake Book</strong> for SRS revision.</span>
                      </div>

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
                          <div className="font-bold text-indigo-300 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              <span>AI Misconception Analysis</span>
                            </div>
                            <button
                              onClick={() => analyzeWrongAnswer(idx)}
                              disabled={loadingAnalysis[idx]}
                              className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                              title="Re-analyze misconception"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Re-analyze</span>
                            </button>
                          </div>

                          {wrongAnswerAnalyses[idx].error ? (
                            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-xs">
                              {wrongAnswerAnalyses[idx].error}
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs">
                              {wrongAnswerAnalyses[idx].whyYouWereWrong && (
                                <div>
                                  <div className="font-semibold text-amber-400 mb-1">Why You Were Wrong</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].whyYouWereWrong}</p>
                                </div>
                              )}

                              {wrongAnswerAnalyses[idx].correctConcept && (
                                <div>
                                  <div className="font-semibold text-emerald-400 mb-1">Correct Concept</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].correctConcept}</p>
                                </div>
                              )}

                              {wrongAnswerAnalyses[idx].whyCorrectAnswerIsCorrect && (
                                <div>
                                  <div className="font-semibold text-sky-400 mb-1">Why Correct Answer Is Correct</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].whyCorrectAnswerIsCorrect}</p>
                                </div>
                              )}

                              {wrongAnswerAnalyses[idx].whyYourAnswerIsWrong && (
                                <div>
                                  <div className="font-semibold text-rose-400 mb-1">Why Your Answer Is Wrong</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].whyYourAnswerIsWrong}</p>
                                </div>
                              )}

                              {wrongAnswerAnalyses[idx].distractorAnalysis && (
                                <div>
                                  <div className="font-semibold text-slate-400 mb-1">Distractor Analysis</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].distractorAnalysis}</p>
                                </div>
                              )}

                              {wrongAnswerAnalyses[idx].knowledgeGap && (
                                <div>
                                  <div className="font-semibold text-amber-400 mb-1">Knowledge Gap</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].knowledgeGap}</p>
                                </div>
                              )}

                              {wrongAnswerAnalyses[idx].recommendedRevision && (
                                <div>
                                  <div className="font-semibold text-indigo-400 mb-1">Recommended Revision</div>
                                  <p className="text-slate-300 leading-relaxed">{wrongAnswerAnalyses[idx].recommendedRevision}</p>
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => addToMistakeVault(idx)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
                          >
                            <Bookmark className="w-4 h-4" />
                            <span>Saved in Mistake Book</span>
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
                autoSaveMistakesToVault();
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Quiz Complete!</h2>
                <p className="text-slate-400 mt-2">
                  {calculateScore().correct} out of {calculateScore().total} correct ({calculateScore().percentage}%)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveQuizToFirestore()}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    savedQuizId
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="Save entire quiz to My AI Quizzes"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : savedQuizId ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{savedQuizId ? 'Quiz Saved' : 'Save Quiz'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllQuestions}
                  disabled={isSavingAll}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    savedAll
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                  title="Save all MCQs into your Custom Question Bank"
                >
                  {isSavingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bookmark className={`w-4 h-4 ${savedAll ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                  )}
                  <span>{savedAll ? 'All MCQs Saved' : 'Save All MCQs'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyQuiz}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                  title="Copy questions, options and explanations"
                >
                  {copiedQuiz ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Quiz</span>
                    </>
                  )}
                </button>

                <button
                  onClick={resetQuiz}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>New Quiz</span>
                </button>
              </div>
            </div>

            {/* Deep AI Insights Button */}
            {!deepInsights && (
              <div className="space-y-3">
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

                {insightsError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-xs flex items-center justify-between">
                    <span>{insightsError}</span>
                    <button
                      onClick={generateDeepInsights}
                      className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
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
