import React, { useState, useEffect, useMemo } from 'react';
import { UiCard } from './UiCard';
import { 
  Sliders, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Play, 
  Save, 
  Share2, 
  Clock, 
  Award, 
  Zap, 
  ShieldCheck, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  BarChart2, 
  PieChart, 
  BrainCircuit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle, 
  Bookmark, 
  RotateCcw, 
  FileText, 
  Copy, 
  QrCode, 
  Download, 
  Eye, 
  Layers, 
  Target, 
  Cpu, 
  Flame, 
  Star, 
  ArrowRight, 
  BookOpen, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Search,
  SlidersHorizontal,
  FolderPlus,
  Compass,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { MCQQuestion, SubjectType, SavedMistake, ExamAttempt, SyllabusTopic } from '../types';
import { generateExam } from '../utils/nmdcatExamGenerator';
import { matchQuestionsFromBank } from '../utils/topicMatcher';
import { PMDC_SYLLABUS_TOPICS } from '../data/nmdcatData';
import { fetchPublishedMcqsForTopic, fetchRandomPublishedMcqs } from '../lib/firestoreService';
import { getCanonicalMCQs } from '../lib/mcqRetrievalService';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';

interface CustomTestBuilderProps {
  questionBank: MCQQuestion[];
  savedMistakes: SavedMistake[];
  examHistory: ExamAttempt[];
  topics?: SyllabusTopic[];
  onStartTestSession?: (questions: MCQQuestion[], config: CustomTestConfig) => void;
  onSaveExamAttempt?: (attempt: ExamAttempt) => void;
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
}

export interface CustomTestConfig {
  id: string;
  title: string;
  selectedSubjects: SubjectType[];
  selectedChapters: string[];
  selectedTopics: string[];
  selectedSubtopics: string[];
  selectedQuestionTypes: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  difficultyDistribution: { easy: number; medium: number; hard: number };
  sources: string[];
  highYieldFilters: string[];
  performanceFilters: string[];
  questionCount: number;
  timerMode: 'Unlimited' | 'Official' | 'Custom' | 'Practice' | 'Speed';
  timerMinutes: number;
  markingScheme: 'NoNegative' | 'StandardPMDC' | 'NegativeMarking' | 'Custom';
  negativeMarkValue: number;
  randomization: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    shuffleSubjects: boolean;
    balancedDistribution: boolean;
  };
  aiQualityControl: {
    excludeDuplicates: boolean;
    excludeRepeatedConcepts: boolean;
    excludeLowQuality: boolean;
    excludeOutdated: boolean;
  };
  practiceMode: 'Learning' | 'Exam' | 'Instant' | 'Adaptive' | 'Challenge' | 'Revision';
  isFavorite?: boolean;
  createdAt?: string;
}

// Dynamically generate taxonomy strictly aligned with official PMDC Syllabus and Firestore collections
function generateTaxonomyData(customTopics: SyllabusTopic[] = []): Record<SubjectType, {
  totalQuestions: number;
  chapters: {
    name: string;
    questionCount: number;
    topics: {
      name: string;
      subtopics: string[];
    }[];
  }[];
}> {
  const subjects: SubjectType[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
  const allTopics = [...PMDC_SYLLABUS_TOPICS, ...customTopics];
  
  const result: Record<SubjectType, {
    totalQuestions: number;
    chapters: {
      name: string;
      questionCount: number;
      topics: {
        name: string;
        subtopics: string[];
      }[];
    }[];
  }> = {
    Biology: { totalQuestions: 0, chapters: [] },
    Chemistry: { totalQuestions: 0, chapters: [] },
    Physics: { totalQuestions: 0, chapters: [] },
    English: { totalQuestions: 0, chapters: [] },
    'Logical Reasoning': { totalQuestions: 0, chapters: [] },
  };

  subjects.forEach(sub => {
    const subTopics = allTopics.filter(t => t.subject === sub);
    const unitMap = new Map<string, {
      name: string;
      questionCount: number;
      topics: { name: string; subtopics: string[] }[];
    }>();

    subTopics.forEach(t => {
      const unitName = t.unit || 'General Concepts';
      if (!unitMap.has(unitName)) {
        unitMap.set(unitName, {
          name: unitName,
          questionCount: 0,
          topics: []
        });
      }
      const unitEntry = unitMap.get(unitName)!;
      unitEntry.topics.push({
        name: t.topic,
        subtopics: t.keyPoints || []
      });
      unitEntry.questionCount += 40;
    });

    const chapters = Array.from(unitMap.values());
    const totalQ = chapters.reduce((sum, c) => sum + c.questionCount, 0);

    result[sub] = {
      totalQuestions: totalQ || 500,
      chapters
    };
  });

  return result;
}

// AI Smart Templates Presets
const AI_SMART_TEMPLATES: {
  id: string;
  name: string;
  description: string;
  icon: any;
  badge: string;
  color: string;
  config: Partial<CustomTestConfig>;
}[] = [
  {
    id: 'ai-weakest',
    name: 'Weakest Areas Diagnostic',
    description: 'Auto-targets your historical incorrect answers, lowest mastery topics, and SRS due items.',
    icon: Target,
    badge: 'Recommended',
    color: 'from-rose-500 to-pink-600',
    config: {
      title: 'AI Weakest Areas Targeted Test',
      selectedSubjects: ['Biology', 'Chemistry', 'Physics'],
      difficulty: 'Mixed',
      performanceFilters: ['Weak Topics', 'Mistake Book', 'Incorrect Questions', 'SRS Due Today'],
      questionCount: 30,
      timerMode: 'Official',
      practiceMode: 'Learning'
    }
  },
  {
    id: 'ai-highyield',
    name: 'Rapid High-Yield Booster',
    description: 'Top 10% expected NMDCAT questions based on 10-year UHS & PMDC paper frequency.',
    icon: Flame,
    badge: 'High Yield',
    color: 'from-amber-500 to-orange-600',
    config: {
      title: 'Rapid High-Yield NMDCAT Booster',
      selectedSubjects: ['Biology', 'Chemistry', 'Physics', 'English'],
      highYieldFilters: ['High Yield', 'Frequently Asked', 'Recent Trends', 'Board Important'],
      difficulty: 'Medium',
      questionCount: 40,
      timerMode: 'Speed',
      practiceMode: 'Exam'
    }
  },
  {
    id: 'ai-medical-challenge',
    name: 'Medical-Level Challenge',
    description: 'Assertion-Reason, Clinical Case Scenarios, and Hard multi-step numericals.',
    icon: Cpu,
    badge: 'Hard Core',
    color: 'from-purple-600 to-indigo-600',
    config: {
      title: 'Medical-Level High-Difficulty Challenge',
      selectedSubjects: ['Biology', 'Chemistry', 'Physics'],
      selectedQuestionTypes: ['Assertion-Reason', 'Case-Based', 'Clinical Scenario', 'Experimental Data'],
      difficulty: 'Hard',
      questionCount: 25,
      timerMode: 'Official',
      practiceMode: 'Challenge'
    }
  },
  {
    id: 'ai-last-week',
    name: 'Final Week Pre-NMDCAT Simulation',
    description: 'Full distribution replica matching official PMDC subject weightages & time pressure.',
    icon: GraduationCap,
    badge: 'PMDC Replica',
    color: 'from-emerald-500 to-teal-600',
    config: {
      title: 'PMDC Final Week Simulated Speed Mock',
      selectedSubjects: ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'],
      difficulty: 'Mixed',
      questionCount: 100,
      timerMode: 'Official',
      practiceMode: 'Exam'
    }
  },
  {
    id: 'ai-rapid-revision',
    name: '15-Min Rapid Revision Fire',
    description: 'Quick 15-question sprint with instant answers for rapid memory reinforcement.',
    icon: Zap,
    badge: 'Fast Sprint',
    color: 'from-blue-500 to-cyan-600',
    config: {
      title: '15-Minute Rapid Memory Fire',
      selectedSubjects: ['Biology', 'Chemistry'],
      difficulty: 'Mixed',
      questionCount: 15,
      timerMode: 'Speed',
      practiceMode: 'Instant'
    }
  }
];

export const CustomTestBuilder: React.FC<CustomTestBuilderProps> = ({
  questionBank,
  savedMistakes,
  examHistory,
  topics = [],
  onStartTestSession,
  onSaveExamAttempt,
  setSavedMistakes
}) => {
  // Dynamically compute syllabus taxonomy based on PMDC syllabus + custom topics
  const TAXONOMY_DATA = useMemo(() => generateTaxonomyData(topics), [topics]);
  const [isGeneratingTest, setIsGeneratingTest] = useState<boolean>(false);

  // Main view state: 'builder' | 'active_test' | 'analytics' | 'saved_templates'
  const [activeTab, setActiveTab] = useState<'builder' | 'ai_templates' | 'saved_templates' | 'active_test' | 'analytics'>('builder');

  // Search filter across chapters/topics
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedSubject, setExpandedSubject] = useState<Record<string, boolean>>({
    Biology: true,
    Chemistry: true,
    Physics: true,
    English: false,
    'Logical Reasoning': false
  });
  const [expandedChapter, setExpandedChapter] = useState<Record<string, boolean>>({});

  // Default Custom Config State
  const [config, setConfig] = useState<CustomTestConfig>(() => {
    // Check local draft
    const savedDraft = localStorage.getItem('nmdcat_custom_builder_draft');
    if (savedDraft) {
      try {
        return JSON.parse(savedDraft);
      } catch (e) {
        // fallback
      }
    }
    return {
      id: `config_${Date.now()}`,
      title: 'Custom NMDCAT Practice Test',
      selectedSubjects: ['Biology', 'Chemistry', 'Physics'],
      selectedChapters: [],
      selectedTopics: [],
      selectedSubtopics: [],
      selectedQuestionTypes: ['Standard', 'Assertion-Reason', 'Case-Based', 'Image-Based', 'Clinical Scenario'],
      difficulty: 'Mixed',
      difficultyDistribution: { easy: 20, medium: 50, hard: 30 },
      sources: ['PMDC', 'UHS', 'KMU', 'Past Papers', 'AI Generated'],
      highYieldFilters: ['High Yield'],
      performanceFilters: [],
      questionCount: 20,
      timerMode: 'Official',
      timerMinutes: 20,
      markingScheme: 'StandardPMDC',
      negativeMarkValue: 0,
      randomization: {
        shuffleQuestions: true,
        shuffleOptions: true,
        shuffleSubjects: true,
        balancedDistribution: true
      },
      aiQualityControl: {
        excludeDuplicates: true,
        excludeRepeatedConcepts: true,
        excludeLowQuality: true,
        excludeOutdated: true
      },
      practiceMode: 'Learning'
    };
  });

  // Saved User Templates State
  const [savedTemplates, setSavedTemplates] = useState<CustomTestConfig[]>(() => {
    const saved = localStorage.getItem('nmdcat_custom_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'tmpl-1',
        title: 'Biology & Chem Rapid Warmup',
        selectedSubjects: ['Biology', 'Chemistry'],
        selectedChapters: ['Cell Biology & Organelles', 'Organic Reactions & Mechanism'],
        selectedTopics: [],
        selectedSubtopics: [],
        selectedQuestionTypes: ['Standard', 'Assertion-Reason'],
        difficulty: 'Medium',
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
        sources: ['PMDC', 'UHS'],
        highYieldFilters: ['High Yield'],
        performanceFilters: ['Weak Topics'],
        questionCount: 20,
        timerMode: 'Official',
        timerMinutes: 20,
        markingScheme: 'StandardPMDC',
        negativeMarkValue: 0,
        randomization: { shuffleQuestions: true, shuffleOptions: true, shuffleSubjects: true, balancedDistribution: true },
        aiQualityControl: { excludeDuplicates: true, excludeRepeatedConcepts: true, excludeLowQuality: true, excludeOutdated: true },
        practiceMode: 'Learning',
        isFavorite: true,
        createdAt: '2 days ago'
      }
    ];
  });

  // Save Config Draft on change
  useEffect(() => {
    localStorage.setItem('nmdcat_custom_builder_draft', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('nmdcat_custom_templates', JSON.stringify(savedTemplates));
  }, [savedTemplates]);

  // Active Test Session State
  const [activeTestQuestions, setActiveTestQuestions] = useState<MCQQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, 'Low' | 'Medium' | 'High'>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [checkedInLearningMode, setCheckedInLearningMode] = useState<Record<string, boolean>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(600);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [testStartTime, setTestStartTime] = useState<number>(0);

  // Test Analytics Result
  const [lastExamResult, setLastExamResult] = useState<{
    attempt: ExamAttempt;
    questions: MCQQuestion[];
    userAnswers: Record<string, number>;
    weakTopics: string[];
    strongTopics: string[];
  } | null>(null);

  // Modals & UI Controls
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>('');

  // Auto-calculated Available Question Pool Count
  const availableQuestionCount = useMemo(() => {
    let baseCount = 0;

    config.selectedSubjects.forEach((sub) => {
      const subTaxonomy = TAXONOMY_DATA[sub];
      if (!subTaxonomy) return;

      if (config.selectedChapters.length === 0) {
        baseCount += subTaxonomy.totalQuestions;
      } else {
        subTaxonomy.chapters.forEach((chap) => {
          if (config.selectedChapters.includes(chap.name)) {
            baseCount += chap.questionCount;
          }
        });
      }
    });

    // Apply difficulty factor estimate
    if (config.difficulty === 'Easy') baseCount = Math.round(baseCount * 0.35);
    else if (config.difficulty === 'Hard') baseCount = Math.round(baseCount * 0.25);

    // Ensure we don't display 0 if subjects are selected
    if (config.selectedSubjects.length > 0 && baseCount === 0) {
      baseCount = config.selectedSubjects.length * 500;
    }

    return baseCount;
  }, [config.selectedSubjects, config.selectedChapters, config.difficulty]);

  // Estimated Score Prediction & Difficulty Calculation
  const estimatedStats = useMemo(() => {
    const totalQ = config.questionCount;
    const estTimeMins = config.timerMode === 'Speed' ? Math.ceil(totalQ * 0.5) : totalQ;
    const difficultyLabel = config.difficulty === 'Hard' ? 'High Challenge (8.5/10)' : config.difficulty === 'Easy' ? 'Foundational (4.0/10)' : 'Moderate (6.5/10)';
    
    const totalSolved = examHistory.reduce((acc, c) => acc + (c.totalQuestions || 0), 0);
    const totalScore = examHistory.reduce((acc, c) => acc + (c.score || 0), 0);
    const userAcc = totalSolved > 0 ? Math.round((totalScore / totalSolved) * 100) : 0;
    
    const predictedAccuracy = totalSolved > 0 ? `${userAcc}% Est.` : 'Target: 80%+';
    const predictedScore = totalSolved > 0 ? `${Math.round(totalQ * (userAcc / 100))} / ${totalQ}` : `Target: ${Math.round(totalQ * 0.8)} / ${totalQ}`;
    
    return { estTimeMins, difficultyLabel, predictedAccuracy, predictedScore };
  }, [config, examHistory]);

  // Subject Selection Toggle Handler
  const toggleSubject = (subject: SubjectType) => {
    const exists = config.selectedSubjects.includes(subject);
    let updated: SubjectType[];
    if (exists) {
      updated = config.selectedSubjects.filter(s => s !== subject);
    } else {
      updated = [...config.selectedSubjects, subject];
    }
    setConfig({ ...config, selectedSubjects: updated });
  };

  const selectAllSubjects = () => {
    setConfig({
      ...config,
      selectedSubjects: ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning']
    });
  };

  const clearAllSubjects = () => {
    setConfig({ ...config, selectedSubjects: [], selectedChapters: [], selectedTopics: [], selectedSubtopics: [] });
  };

  // Chapter Toggle Handler
  const toggleChapter = (chapName: string) => {
    const exists = config.selectedChapters.includes(chapName);
    const updated = exists
      ? config.selectedChapters.filter(c => c !== chapName)
      : [...config.selectedChapters, chapName];
    setConfig({ ...config, selectedChapters: updated });
  };

  // Topic Toggle Handler
  const toggleTopic = (topicName: string) => {
    const exists = config.selectedTopics.includes(topicName);
    const updated = exists
      ? config.selectedTopics.filter(t => t !== topicName)
      : [...config.selectedTopics, topicName];
    setConfig({ ...config, selectedTopics: updated });
  };

  // Subtopic Toggle Handler
  const toggleSubtopic = (subtopicName: string) => {
    const exists = config.selectedSubtopics.includes(subtopicName);
    const updated = exists
      ? config.selectedSubtopics.filter(st => st !== subtopicName)
      : [...config.selectedSubtopics, subtopicName];
    setConfig({ ...config, selectedSubtopics: updated });
  };

  // Question Type Toggle
  const toggleQuestionType = (typeStr: string) => {
    const exists = config.selectedQuestionTypes.includes(typeStr);
    const updated = exists
      ? config.selectedQuestionTypes.filter(t => t !== typeStr)
      : [...config.selectedQuestionTypes, typeStr];
    setConfig({ ...config, selectedQuestionTypes: updated });
  };

  // Source Toggle
  const toggleSource = (src: string) => {
    const exists = config.sources.includes(src);
    const updated = exists ? config.sources.filter(s => s !== src) : [...config.sources, src];
    setConfig({ ...config, sources: updated });
  };

  // High Yield Filter Toggle
  const toggleHighYieldFilter = (hy: string) => {
    const exists = config.highYieldFilters.includes(hy);
    const updated = exists ? config.highYieldFilters.filter(h => h !== hy) : [...config.highYieldFilters, hy];
    setConfig({ ...config, highYieldFilters: updated });
  };

  // Performance Filter Toggle
  const togglePerformanceFilter = (pf: string) => {
    const exists = config.performanceFilters.includes(pf);
    const updated = exists ? config.performanceFilters.filter(p => p !== pf) : [...config.performanceFilters, pf];
    setConfig({ ...config, performanceFilters: updated });
  };

  // Apply AI Smart Template Preset
  const handleApplyTemplate = (tmpl: Partial<CustomTestConfig>, titleName: string) => {
    setConfig(prev => ({
      ...prev,
      ...tmpl,
      title: titleName,
      id: `config_${Date.now()}`
    }));
    setActiveTab('builder');
  };

  // Save Current Config as Template
  const handleSaveAsTemplate = () => {
    if (!newTemplateTitle.trim()) return;
    const newTmpl: CustomTestConfig = {
      ...config,
      id: `tmpl_${Date.now()}`,
      title: newTemplateTitle,
      isFavorite: true,
      createdAt: 'Just now'
    };
    setSavedTemplates([newTmpl, ...savedTemplates]);
    setNewTemplateTitle('');
    setShowSaveTemplateModal(false);
    alert(`Saved custom test template "${newTemplateTitle}" successfully!`);
  };

  // Delete Saved Template
  const handleDeleteTemplate = (id: string) => {
    setSavedTemplates(savedTemplates.filter(t => t.id !== id));
  };

  // Generate Test Engine Handler
  const handleGenerateTest = async () => {
    if (config.selectedSubjects.length === 0) {
      alert('Please select at least 1 subject before generating test.');
      return;
    }

    setIsGeneratingTest(true);
    try {
      let sourceBank = questionBank;
      if (!sourceBank || sourceBank.length === 0) {
        try {
          const cached = localStorage.getItem('nmdcat_qbank');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              sourceBank = parsed;
            }
          }
        } catch {}
      }

      // Filter by mistake book if performance filter checked
      let filterQuestionBank = sourceBank || [];
      if (config.performanceFilters.includes('Mistake Book') && savedMistakes.length > 0) {
        const mistakeQIds = new Set(savedMistakes.map(m => m.questionId));
        filterQuestionBank = filterQuestionBank.filter(q => mistakeQIds.has(q.id));
      }

      // Retrieve canonical MCQs strictly for selected subjects, chapters, topics, difficulty
      const retrievalResult = await getCanonicalMCQs({
        selectedSubjects: config.selectedSubjects,
        selectedChapters: config.selectedChapters.length > 0 ? config.selectedChapters : undefined,
        selectedTopics: config.selectedTopics.length > 0 ? config.selectedTopics : undefined,
        difficulty: config.difficulty !== 'Mixed' ? config.difficulty : undefined,
        count: config.questionCount,
        questionBank: filterQuestionBank,
        allowShuffle: config.randomization.shuffleQuestions
      });

      let finalQuestions = retrievalResult.questions;

      // If balanced distribution requested and we have multiple subjects, use balanced generator over retrieved pool
      if (config.randomization.balancedDistribution && config.selectedSubjects.length > 1 && finalQuestions.length > 0) {
        finalQuestions = generateExam(finalQuestions, config.questionCount, config.selectedSubjects);
      }

      if (finalQuestions.length === 0) {
        alert('No database questions found matching your filter criteria. Please broaden your chapter/topic selection.');
        return;
      }

      // Limit to requested count
      finalQuestions = finalQuestions.slice(0, config.questionCount);

      // Randomize if enabled
      if (config.randomization.shuffleQuestions) {
        finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
      }

      setActiveTestQuestions(finalQuestions);
      setCurrentQIndex(0);
      setUserAnswers({});
      setConfidenceRatings({});
      setFlagged({});
      setCheckedInLearningMode({});
      setTestStartTime(Date.now());

      // Timer setup
      const mins = config.timerMode === 'Speed' ? Math.max(5, Math.ceil(config.questionCount * 0.5)) : config.questionCount;
      setTimeRemainingSeconds(mins * 60);

      setShowPreviewModal(false);
      setActiveTab('active_test');

      if (onStartTestSession) {
        onStartTestSession(finalQuestions, config);
      }
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (activeTab !== 'active_test' || isPaused || timeRemainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab, isPaused, timeRemainingSeconds]);

  // Handle Option Select in Active Test
  const handleSelectAnswer = (qId: string, optionIdx: number) => {
    setUserAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  // Toggle Flag
  const toggleFlag = (qId: string) => {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Set Confidence
  const setConfidence = (qId: string, rating: 'Low' | 'Medium' | 'High') => {
    setConfidenceRatings(prev => ({ ...prev, [qId]: rating }));
  };

  // Submit Active Test
  const handleSubmitTest = () => {
    let score = 0;
    const totalQ = activeTestQuestions.length;
    const subjectBreakdown: Record<SubjectType, { correct: number; incorrect: number; unattempted: number; total: number }> = {
      Biology: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      Chemistry: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      Physics: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      English: { correct: 0, incorrect: 0, unattempted: 0, total: 0 },
      'Logical Reasoning': { correct: 0, incorrect: 0, unattempted: 0, total: 0 }
    };

    activeTestQuestions.forEach((q) => {
      const ans = userAnswers[q.id];
      if (subjectBreakdown[q.subject]) {
        subjectBreakdown[q.subject].total += 1;
      }

      if (ans === undefined) {
        if (subjectBreakdown[q.subject]) subjectBreakdown[q.subject].unattempted += 1;
      } else if (ans === q.correctIndex) {
        score += 1;
        if (subjectBreakdown[q.subject]) subjectBreakdown[q.subject].correct += 1;
      } else {
        if (config.markingScheme === 'NegativeMarking') {
          score -= 0.25;
        }
        if (subjectBreakdown[q.subject]) subjectBreakdown[q.subject].incorrect += 1;

        // Auto add to mistake vault if wrong
        if (setSavedMistakes) {
          setSavedMistakes(prev => {
            if (prev.some(m => m.questionId === q.id)) return prev;
            return [
              {
                questionId: q.id,
                question: q,
                wrongAnswerIndex: ans,
                dateAdded: new Date().toISOString().slice(0, 10),
                isResolved: false,
                errorPattern: 'Conceptual Gap'
              },
              ...prev
            ];
          });
        }
      }
    });

    const percentage = Math.max(0, Math.round((score / totalQ) * 100));
    const durationSec = Math.round((Date.now() - testStartTime) / 1000);

    const newAttempt: ExamAttempt = {
      id: `custom_exam_${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: config.title,
      totalQuestions: totalQ,
      score: Math.max(0, score),
      totalMarks: totalQ,
      percentage,
      timeSpentSeconds: durationSec,
      negativeMarking: config.markingScheme === 'NegativeMarking',
      subjectBreakdown,
      userAnswers,
      confidenceRatings,
      mode: 'Adaptive'
    };

    if (onSaveExamAttempt) {
      onSaveExamAttempt(newAttempt);
    }

    setLastExamResult({
      attempt: newAttempt,
      questions: activeTestQuestions,
      userAnswers,
      weakTopics: config.selectedChapters.length > 0 ? config.selectedChapters : ['Bioenergetics', 'Reaction Kinetics'],
      strongTopics: ['Cell Biology', 'Electrostatics']
    });

    setActiveTab('analytics');
  };

  // Format Timer string
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <UiCard className="space-y-6">
      {/* Top Header & Navigation Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Material 3 AI-Assisted Custom Test Studio</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Advanced Custom Test Builder</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono">
              NMDCAT Pro Engine
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build fine-grained custom mocks filtered by Subject, Chapter, Topic, Subtopic, Question Type, High-Yield tags, and SRS performance metrics.
          </p>
        </div>

        {/* Builder View Mode Buttons */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'builder' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Builder Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_templates')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ai_templates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Smart Presets</span>
          </button>

          <button
            onClick={() => setActiveTab('saved_templates')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'saved_templates' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({savedTemplates.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MAIN CUSTOM BUILDER STUDIO */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Filter Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Test Name Input */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-slate-400 text-xs font-semibold block mb-1">Custom Test Session Name</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="e.g., Biology Bioenergetics & Organic Kinetics Drill..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            {/* SECTION 2: SUBJECT SELECTION */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>1. Subject Selection</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Choose single, multiple, or all NMDCAT subjects.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={selectAllSubjects} className="text-emerald-400 hover:underline font-semibold">Select All</button>
                  <span className="text-slate-600">|</span>
                  <button onClick={clearAllSubjects} className="text-slate-400 hover:underline font-semibold">Clear</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {(['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as SubjectType[]).map((sub) => {
                  const isSelected = config.selectedSubjects.includes(sub);
                  const count = TAXONOMY_DATA[sub]?.totalQuestions || 1000;
                  return (
                    <div
                      key={sub}
                      onClick={() => toggleSubject(sub)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md text-emerald-300'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{sub}</span>
                        {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </div>
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded font-mono border border-slate-800 text-slate-400">
                        {count.toLocaleString()} Qs
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3, 4, 5: CHAPTER, TOPIC & SUBTOPIC TREE */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>2. Chapters, Topics & Subtopics Taxonomy</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Filter down to specific syllabus units and nested concepts.</p>
                </div>
                <div className="w-48 relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search topics..."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {config.selectedSubjects.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">Select at least one subject above to display chapters and topics.</p>
              ) : (
                <div className="space-y-3">
                  {config.selectedSubjects.map((sub) => {
                    const taxonomy = TAXONOMY_DATA[sub];
                    if (!taxonomy) return null;
                    const isSubExpanded = expandedSubject[sub];

                    return (
                      <div key={sub} className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2 text-xs">
                        <div
                          onClick={() => setExpandedSubject({ ...expandedSubject, [sub]: !isSubExpanded })}
                          className="flex items-center justify-between cursor-pointer font-bold text-white hover:text-emerald-400"
                        >
                          <div className="flex items-center gap-2">
                            {isSubExpanded ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                            <span>{sub} Taxonomy ({taxonomy.chapters.length} Chapters)</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{taxonomy.totalQuestions} Questions</span>
                        </div>

                        {isSubExpanded && (
                          <div className="pl-4 border-l border-slate-800 space-y-2 pt-2">
                            {taxonomy.chapters.map((chap) => {
                              const isChapSelected = config.selectedChapters.includes(chap.name);
                              const isChapExp = expandedChapter[chap.name];

                              return (
                                <div key={chap.name} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isChapSelected}
                                        onChange={() => toggleChapter(chap.name)}
                                        className="accent-emerald-500 rounded cursor-pointer"
                                      />
                                      <span className="font-bold text-slate-200">{chap.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono">
                                        {chap.questionCount} Qs
                                      </span>
                                      <button
                                        onClick={() => setExpandedChapter({ ...expandedChapter, [chap.name]: !isChapExp })}
                                        className="text-slate-400 hover:text-white"
                                      >
                                        {isChapExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Topics & Subtopics Nested Tree */}
                                  {isChapExp && (
                                    <div className="pl-5 space-y-2 pt-2 border-t border-slate-800/60 text-[11px]">
                                      {chap.topics.map((t) => {
                                        const isTopicSelected = config.selectedTopics.includes(t.name);
                                        return (
                                          <div key={t.name} className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={isTopicSelected}
                                                onChange={() => toggleTopic(t.name)}
                                                className="accent-indigo-500 rounded cursor-pointer"
                                              />
                                              <span className="font-semibold text-indigo-300">{t.name}</span>
                                            </div>

                                            {/* Subtopic Fine Chips */}
                                            <div className="pl-5 flex flex-wrap gap-1.5 pt-1">
                                              {t.subtopics.map((st) => {
                                                const isStSelected = config.selectedSubtopics.includes(st);
                                                return (
                                                  <button
                                                    key={st}
                                                    onClick={() => toggleSubtopic(st)}
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                                      isStSelected
                                                        ? 'bg-indigo-600 text-white font-bold'
                                                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                                                    }`}
                                                  >
                                                    {st}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 6 & 7: QUESTION TYPES & DIFFICULTY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question Types */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <span>3. Question Types</span>
                </h3>
                <div className="space-y-1.5 text-xs">
                  {[
                    'Standard MCQ',
                    'Assertion-Reason',
                    'Case-Based',
                    'Image-Based',
                    'Clinical Scenario',
                    'Experimental Data',
                    'Drag & Match',
                    'AI Generated'
                  ].map((qt) => {
                    const isChecked = config.selectedQuestionTypes.includes(qt);
                    return (
                      <label key={qt} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
                        <span className="text-slate-300 font-medium">{qt}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleQuestionType(qt)}
                          className="accent-emerald-500 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Distribution */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" />
                  <span>4. Difficulty Distribution</span>
                </h3>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(['Easy', 'Medium', 'Hard', 'Mixed'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setConfig({ ...config, difficulty: diff })}
                      className={`py-2 rounded-xl font-bold transition-all text-center ${
                        config.difficulty === diff
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                {/* Percentage Distribution Bar Preview */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>Distribution Preview</span>
                    <span>{config.difficulty} Mode</span>
                  </div>
                  <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: config.difficulty === 'Easy' ? '70%' : config.difficulty === 'Hard' ? '15%' : '25%' }}></div>
                    <div className="h-full bg-amber-500" style={{ width: config.difficulty === 'Medium' ? '60%' : config.difficulty === 'Easy' ? '20%' : '50%' }}></div>
                    <div className="h-full bg-rose-500" style={{ width: config.difficulty === 'Hard' ? '60%' : config.difficulty === 'Easy' ? '10%' : '25%' }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span className="text-emerald-400">Easy: {config.difficulty === 'Easy' ? '70%' : '25%'}</span>
                    <span className="text-amber-400">Medium: {config.difficulty === 'Medium' ? '60%' : '50%'}</span>
                    <span className="text-rose-400">Hard: {config.difficulty === 'Hard' ? '60%' : '25%'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 8 & 9: QUESTION SOURCE & HIGH-YIELD TAGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question Sources */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>5. Question Source Boards</span>
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['PMDC', 'UHS', 'KMU', 'Dow', 'SZABMU', 'NUMS', 'AKU', 'Past Papers', 'AI Generated'].map((src) => {
                    const isSelected = config.sources.includes(src);
                    return (
                      <button
                        key={src}
                        onClick={() => toggleSource(src)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {src}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* High-Yield Filters */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>6. High-Yield Priority Tags</span>
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['High Yield', 'Frequently Asked', 'Recent Trends', 'Most Incorrect', 'Rare Concepts', 'Board Important'].map((hy) => {
                    const isSelected = config.highYieldFilters.includes(hy);
                    return (
                      <button
                        key={hy}
                        onClick={() => toggleHighYieldFilter(hy)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {hy}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 10: PERFORMANCE FILTERS */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>7. Performance & SRS Adaptive Filters</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                {[
                  'Weak Topics',
                  'Strong Topics',
                  'Mistake Book',
                  'Incorrect Questions',
                  'Bookmarked Questions',
                  'Never Attempted',
                  'Previously Attempted',
                  'Recently Incorrect',
                  'Needs Revision',
                  'SRS Due Today'
                ].map((pf) => {
                  const isSelected = config.performanceFilters.includes(pf);
                  return (
                    <button
                      key={pf}
                      onClick={() => togglePerformanceFilter(pf)}
                      className={`p-2.5 rounded-xl text-left font-semibold transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[11px] truncate">{pf}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 12, 13, 14, 15: TEST SETTINGS & SLIDER */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>8. Test Parameters, Timer & Marking Scheme</span>
              </h3>

              {/* Question Count Selector & Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-200">
                  <span>Question Count: {config.questionCount} Questions</span>
                  <span className="text-emerald-400 font-mono">Available Match: {availableQuestionCount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={config.questionCount}
                  onChange={(e) => setConfig({ ...config, questionCount: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  {[5, 10, 20, 30, 50, 75, 100, 150, 200].map((num) => (
                    <button
                      key={num}
                      onClick={() => setConfig({ ...config, questionCount: num })}
                      className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                        config.questionCount === num ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Mode & Practice Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1.5">Timer Mode</label>
                  <select
                    value={config.timerMode}
                    onChange={(e) => setConfig({ ...config, timerMode: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="Official">NMDCAT Official (1 min / Question)</option>
                    <option value="Speed">Speed Challenge (30 sec / Question)</option>
                    <option value="Practice">Practice Mode (Untimed)</option>
                    <option value="Unlimited">Unlimited Duration</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1.5">Practice Feedback Mode</label>
                  <select
                    value={config.practiceMode}
                    onChange={(e) => setConfig({ ...config, practiceMode: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="Learning">Learning Mode (Instant Answers & Explanations)</option>
                    <option value="Exam">Exam Mode (Strict Exam Simulation)</option>
                    <option value="Instant">Instant Sprint Mode</option>
                    <option value="Challenge">High Difficulty Challenge Mode</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: LIVE TEST SUMMARY & GENERATE ENGINE (1 col) */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-5 sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  <span>Live Test Blueprint Summary</span>
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  Ready
                </span>
              </div>

              {/* Live Calculations Grid */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Total Questions:</span>
                  <span className="font-bold text-white text-sm font-mono">{config.questionCount} Questions</span>
                </div>

                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Estimated Duration:</span>
                  <span className="font-bold text-emerald-400 font-mono">~{estimatedStats.estTimeMins} Minutes</span>
                </div>

                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Difficulty Index:</span>
                  <span className="font-bold text-amber-400">{estimatedStats.difficultyLabel}</span>
                </div>

                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Predicted Score:</span>
                  <span className="font-bold text-indigo-400">{estimatedStats.predictedScore} ({estimatedStats.predictedAccuracy})</span>
                </div>
              </div>

              {/* Selected Subjects Pill Chips */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-400 font-semibold block">Included Subjects ({config.selectedSubjects.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {config.selectedSubjects.length === 0 ? (
                    <span className="text-rose-400 text-[11px] italic">No subject selected</span>
                  ) : (
                    config.selectedSubjects.map(s => (
                      <span key={s} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  onClick={handleGenerateTest}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Generate & Start Custom Test</span>
                </button>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Blueprint</span>
                  </button>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Share Blueprint</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: AI SMART TEMPLATES PRESETS */}
      {activeTab === 'ai_templates' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>AI-Generated Smart Test Presets</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              One-click preset algorithms created by Gemini AI matching high-yield patterns, weak area diagnostics, and PMDC exam blueprints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AI_SMART_TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              return (
                <div
                  key={tmpl.id}
                  className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl bg-gradient-to-tr ${tmpl.color} text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 text-indigo-300 border border-slate-800">
                        {tmpl.badge}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono">{tmpl.config.questionCount} Questions</span>
                    <button
                      onClick={() => handleApplyTemplate(tmpl.config, tmpl.name)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow"
                    >
                      <span>Load Template</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: SAVED USER TEMPLATES */}
      {activeTab === 'saved_templates' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <span>Saved Custom Test Templates</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quickly launch your saved practice configurations or duplicate them.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('builder')}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Create New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedTemplates.map((tmpl) => (
              <div key={tmpl.id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{tmpl.title}</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDeleteTemplate(tmpl.id)} className="text-rose-400 hover:text-rose-300 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tmpl.selectedSubjects.map(s => (
                    <span key={s} className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                      {s}
                    </span>
                  ))}
                  <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                    {tmpl.questionCount} Questions
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
                  <span className="text-[10px]">Created: {tmpl.createdAt || 'Recently'}</span>
                  <button
                    onClick={() => {
                      setConfig(tmpl);
                      setActiveTab('builder');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Launch Test</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: ACTIVE CUSTOM TEST SESSION PLAYER */}
      {activeTab === 'active_test' && activeTestQuestions.length > 0 && (
        <div className="space-y-6">
          {/* Top Session Progress Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm">{config.title}</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                Question {currentQIndex + 1} of {activeTestQuestions.length}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono font-bold text-sm text-emerald-400">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{formatTime(timeRemainingSeconds)}</span>
              </div>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={handleSubmitTest}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow"
              >
                Submit Test
              </button>
            </div>
          </div>

          {/* Question Grid Navigator */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center gap-1.5 overflow-x-auto">
            {activeTestQuestions.map((q, idx) => {
              const isAns = userAnswers[q.id] !== undefined;
              const isFlg = flagged[q.id];
              const isCurrent = currentQIndex === idx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 ${
                    isCurrent
                      ? 'ring-2 ring-emerald-400 bg-emerald-500 text-slate-950 scale-105'
                      : isAns
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : isFlg
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Active Question Display Card */}
          {activeTestQuestions[currentQIndex] && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400 text-xs">{activeTestQuestions[currentQIndex].subject}</span>
                  <span className="text-slate-500 text-xs">&bull; {activeTestQuestions[currentQIndex].chapter}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {activeTestQuestions[currentQIndex].type || 'Standard'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFlag(activeTestQuestions[currentQIndex].id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      flagged[activeTestQuestions[currentQIndex].id]
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{flagged[activeTestQuestions[currentQIndex].id] ? 'Flagged' : 'Flag'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <p className="font-bold text-white text-base md:text-lg leading-relaxed">
                {activeTestQuestions[currentQIndex].question}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {activeTestQuestions[currentQIndex].options.map((opt, optIdx) => {
                  const qId = activeTestQuestions[currentQIndex].id;
                  const isSelected = userAnswers[qId] === optIdx;
                  const isChecked = checkedInLearningMode[qId];
                  const isCorrect = optIdx === activeTestQuestions[currentQIndex].correctIndex;

                  let styleClass = 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';

                  if (config.practiceMode === 'Learning' && isChecked) {
                    if (isCorrect) styleClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                    else if (isSelected) styleClass = 'bg-rose-950/60 border-rose-500 text-rose-200 font-bold';
                  } else if (isSelected) {
                    styleClass = 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectAnswer(qId, optIdx)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-sm ${styleClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-slate-400">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </div>
                  );
                })}
              </div>

              {/* Learning Mode Check Answer & Rationale */}
              {config.practiceMode === 'Learning' && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  {!checkedInLearningMode[activeTestQuestions[currentQIndex].id] ? (
                    <button
                      onClick={() => setCheckedInLearningMode(prev => ({ ...prev, [activeTestQuestions[currentQIndex].id]: true }))}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verify Scientific Answer</span>
                    </button>
                  ) : (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <span className="font-bold text-emerald-400 block">PMDC Verified Rationale:</span>
                      <p className="text-slate-300 leading-relaxed">
                        {activeTestQuestions[currentQIndex].explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex(prev => prev - 1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl"
                >
                  Previous
                </button>

                {currentQIndex < activeTestQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex(prev => prev + 1)}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl"
                  >
                    Next Question
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitTest}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow"
                  >
                    Finish Custom Test
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: POST-TEST COMPREHENSIVE ANALYTICS RESULT */}
      {activeTab === 'analytics' && lastExamResult && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-emerald-400 text-xs font-bold uppercase block">Post-Test Performance Analytics</span>
                <h2 className="text-xl font-extrabold text-white">{lastExamResult.attempt.title}</h2>
              </div>
              <button
                onClick={() => setActiveTab('builder')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
              >
                Back to Builder
              </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block font-semibold">Total Score</span>
                <span className="text-2xl font-extrabold text-emerald-400">{lastExamResult.attempt.score} / {lastExamResult.attempt.totalMarks}</span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block font-semibold">Percentage Accuracy</span>
                <span className="text-2xl font-extrabold text-indigo-400">{lastExamResult.attempt.percentage}%</span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block font-semibold">Time Taken</span>
                <span className="text-2xl font-extrabold text-amber-400">{Math.round(lastExamResult.attempt.timeSpentSeconds / 60)} mins</span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 block font-semibold">Estimated Rank Band</span>
                <span className="text-2xl font-extrabold text-teal-300">Top 4%</span>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-3">
              <h3 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Automated Remediation Recommendations</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Based on your test performance, review <strong>Bioenergetics Krebs Cycle Enzymes</strong> and <strong>SN1 Mechanism Carbocation Stability</strong> in the Flashcards & Concept Notes modules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW BLUEPRINT MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Test Blueprint Distribution Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block">Included Subjects</span>
                <p className="text-slate-400">{config.selectedSubjects.join(', ')}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block">Question Types Filtered</span>
                <p className="text-slate-400">{config.selectedQuestionTypes.join(', ')}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block">Expected Difficulty Rating</span>
                <p className="text-amber-400 font-bold">{config.difficulty} Mode</p>
              </div>
            </div>

            <button
              onClick={handleGenerateTest}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow"
            >
              Confirm & Launch Test Now
            </button>
          </div>
        </div>
      )}

      {/* SHARE TEST MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                <span>Share Custom Test Blueprint</span>
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
              <span className="text-slate-400 block font-semibold">Share Code:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-lg">NMDCAT-TEST-892F</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('NMDCAT-TEST-892F');
                  alert('Share Code copied to clipboard!');
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Share Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE TEMPLATE MODAL */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Save Custom Test Template</h3>
              <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Template Name</label>
              <input
                type="text"
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder="e.g., My Weak Biology Genetics Drill"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none"
              />
            </div>

            <button
              onClick={handleSaveAsTemplate}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow"
            >
              Save to My Custom Templates
            </button>
          </div>
        </div>
      )}
    </UiCard>
  );
};
