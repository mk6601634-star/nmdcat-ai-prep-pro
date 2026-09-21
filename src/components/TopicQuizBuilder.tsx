import React, { useMemo, useState, useEffect } from 'react';
import UiCard from './UiCard';
import { PMDC_SYLLABUS_TOPICS } from '../data/nmdcatData';
import { fetchPublishedMcqsForTopic } from '../lib/firestoreService';
import { aiFetch } from '../lib/aiRequest';
import { MCQQuestion } from '../types';
import {
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  X,
  Flame,
  Filter,
  ArrowRight,
  HelpCircle
} from 'lucide-react';

export type QuizSource = 'DATABASE' | 'AI';

interface TopicQuizBuilderProps {
  questionBank?: MCQQuestion[];
  onStartQuiz: (
    questions: MCQQuestion[],
    source: QuizSource,
    meta: { subject: string; chapter: string; topic: string }
  ) => void;
  onClose?: () => void;
}

export const TopicQuizBuilder: React.FC<TopicQuizBuilderProps> = ({
  questionBank = [],
  onStartQuiz,
  onClose
}) => {
  // 1. Available Subjects
  const subjects = useMemo(() => {
    const fromSyllabus = Array.from(new Set(PMDC_SYLLABUS_TOPICS.map(t => t.subject)));
    return fromSyllabus.length > 0 ? fromSyllabus : ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
  }, []);

  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || 'Biology');
  const [chapterSearch, setChapterSearch] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [topicSearch, setTopicSearch] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('Any');
  const [source, setSource] = useState<QuizSource>('DATABASE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Normalize string for fuzzy matching
  const normalize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // 2. Derive all distinct chapters for the selected subject (from syllabus + questionBank)
  const chaptersForSubject = useMemo(() => {
    const syllabusUnits = PMDC_SYLLABUS_TOPICS
      .filter(t => normalize(t.subject) === normalize(selectedSubject))
      .map(t => t.unit);

    const qbUnits = questionBank
      .filter(q => normalize(q.subject) === normalize(selectedSubject) && q.chapter)
      .map(q => q.chapter!);

    const combined = Array.from(new Set([...syllabusUnits, ...qbUnits])).filter(Boolean);
    return combined.sort();
  }, [selectedSubject, questionBank]);

  // Set default chapter when subject changes or when list updates
  useEffect(() => {
    if (chaptersForSubject.length > 0 && (!selectedChapter || !chaptersForSubject.includes(selectedChapter))) {
      setSelectedChapter(chaptersForSubject[0]);
    }
  }, [chaptersForSubject, selectedChapter]);

  // Filtered chapters based on search query
  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return chaptersForSubject;
    const query = normalize(chapterSearch);
    return chaptersForSubject.filter(c => normalize(c).includes(query));
  }, [chaptersForSubject, chapterSearch]);

  // 3. Derive topics for the selected chapter (from syllabus + questionBank)
  const topicsForChapter = useMemo(() => {
    const syllabusTopics = PMDC_SYLLABUS_TOPICS
      .filter(t => normalize(t.subject) === normalize(selectedSubject) && normalize(t.unit) === normalize(selectedChapter))
      .map(t => t.topic);

    const qbTopics = questionBank
      .filter(q =>
        normalize(q.subject) === normalize(selectedSubject) &&
        (normalize(q.chapter) === normalize(selectedChapter) || normalize(q.chapter).includes(normalize(selectedChapter)) || normalize(selectedChapter).includes(normalize(q.chapter))) &&
        q.topic
      )
      .map(q => q.topic!);

    const combined = Array.from(new Set([...syllabusTopics, ...qbTopics])).filter(Boolean);
    return combined.sort();
  }, [selectedSubject, selectedChapter, questionBank]);

  // Set default topic when chapter changes
  useEffect(() => {
    if (topicsForChapter.length > 0) {
      if (!selectedTopic || !topicsForChapter.includes(selectedTopic)) {
        setSelectedTopic(topicsForChapter[0]);
      }
    } else {
      setSelectedTopic('');
    }
  }, [topicsForChapter, selectedTopic]);

  // Filtered topics based on search query
  const filteredTopics = useMemo(() => {
    if (!topicSearch.trim()) return topicsForChapter;
    const query = normalize(topicSearch);
    return topicsForChapter.filter(t => normalize(t).includes(query));
  }, [topicsForChapter, topicSearch]);

  // 4. Compute real-time matching questions from questionBank
  const matchingDbQuestions = useMemo(() => {
    if (!questionBank || questionBank.length === 0) return [];
    const normSub = normalize(selectedSubject);
    const normChap = normalize(selectedChapter);
    const normTop = normalize(selectedTopic);

    return questionBank.filter(q => {
      const qSub = normalize(q.subject);
      if (qSub !== normSub) return false;

      const qChap = normalize(q.chapter);
      const chapMatches = !normChap || qChap === normChap || qChap.includes(normChap) || normChap.includes(qChap);
      if (!chapMatches) return false;

      if (!normTop) return true; // if no topic selected, entire chapter matches

      const qTop = normalize(q.topic);
      const topMatches = qTop === normTop || qTop.includes(normTop) || normTop.includes(qTop);
      return topMatches;
    });
  }, [questionBank, selectedSubject, selectedChapter, selectedTopic]);

  // Count helper for chapter badge
  const getChapterQuestionCount = (chapterName: string) => {
    const normSub = normalize(selectedSubject);
    const normChap = normalize(chapterName);
    return questionBank.filter(q => {
      if (normalize(q.subject) !== normSub) return false;
      const qChap = normalize(q.chapter);
      return qChap === normChap || qChap.includes(normChap) || normChap.includes(qChap);
    }).length;
  };

  // Count helper for topic badge
  const getTopicQuestionCount = (topicName: string) => {
    const normSub = normalize(selectedSubject);
    const normChap = normalize(selectedChapter);
    const normTop = normalize(topicName);
    return questionBank.filter(q => {
      if (normalize(q.subject) !== normSub) return false;
      const qChap = normalize(q.chapter);
      const chapMatches = !normChap || qChap === normChap || qChap.includes(normChap) || normChap.includes(qChap);
      if (!chapMatches) return false;
      const qTop = normalize(q.topic);
      return qTop === normTop || qTop.includes(normTop) || normTop.includes(qTop);
    }).length;
  };

  // Handle Start Quiz
  const handleStart = async () => {
    setError(null);
    if (!selectedChapter) {
      setError('Please select a chapter/unit to proceed.');
      return;
    }

    const topicLabel = selectedTopic || selectedChapter;
    setIsLoading(true);

    try {
      if (source === 'DATABASE') {
        let items = [...matchingDbQuestions];

        // If local memory count is 0, attempt fallback direct Firestore fetch
        if (items.length === 0) {
          const fetched = await fetchPublishedMcqsForTopic(selectedSubject, selectedChapter, topicLabel);
          if (fetched && fetched.length > 0) {
            items = fetched as MCQQuestion[];
          }
        }

        if (items.length === 0) {
          setError(
            `No database questions found for "${topicLabel}". Please switch to "AI Generated" mode to create instant high-yield questions for this topic!`
          );
          setIsLoading(false);
          return;
        }

        // Apply difficulty filter if specified
        if (difficulty !== 'Any') {
          const diffFiltered = items.filter(
            q => normalize(q.difficulty) === normalize(difficulty)
          );
          if (diffFiltered.length >= 3) {
            items = diffFiltered;
          }
        }

        // Shuffle and slice requested amount
        const shuffled = items.sort(() => Math.random() - 0.5);
        const take = Math.min(numQuestions, shuffled.length);
        const chosen = shuffled.slice(0, take);

        onStartQuiz(chosen, 'DATABASE', {
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: topicLabel
        });
      } else {
        // AI Generated Mode
        const payload = {
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: topicLabel,
          count: numQuestions,
          difficulty: difficulty === 'Any' ? 'NMDCAT Standard (Mixed)' : difficulty
        };

        const resp = await aiFetch<{ mcqs?: any[] }>(
          '/api/generate-mcqs',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          },
          { timeoutMs: 45000 }
        );

        const rawMcqs = resp.mcqs || [];
        const valid: MCQQuestion[] = [];

        for (const m of rawMcqs) {
          if (!m || !m.question || !Array.isArray(m.options) || m.options.length !== 4) continue;
          const correctIdx = typeof m.correctIndex === 'number' ? m.correctIndex : 0;
          if (correctIdx < 0 || correctIdx > 3) continue;

          valid.push({
            id: m.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            subject: m.subject || selectedSubject,
            chapter: m.chapter || selectedChapter,
            topic: m.topic || topicLabel,
            question: m.question,
            options: m.options,
            correctIndex: correctIdx,
            explanation: m.explanation || 'Verified PMDC standard answer rationale.',
            difficulty: m.difficulty || (difficulty === 'Any' ? 'Medium' : (difficulty as any))
          });
        }

        if (valid.length === 0) {
          throw new Error('AI was unable to generate valid questions. Please try again or use Database mode.');
        }

        onStartQuiz(valid, 'AI', {
          subject: selectedSubject,
          chapter: selectedChapter,
          topic: topicLabel
        });
      }
    } catch (err: any) {
      console.error('Quiz Builder error:', err);
      setError(err?.message || 'Failed to initialize quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl shadow-cyan-950/40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                NMDCAT Topic Quiz Studio
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  PMDC 2026
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select any subject, chapter, or topic to practice verified questions or generate custom AI quizzes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Step 1: Subject Selection Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step 1: Select Subject</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {subjects.map(s => {
                const isSelected = s === selectedSubject;
                const totalInSubject = questionBank.filter(
                  q => normalize(q.subject) === normalize(s)
                ).length;

                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedSubject(s);
                      setChapterSearch('');
                      setTopicSearch('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold">{s}</span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {totalInSubject > 0 ? `${totalInSubject} MCQs` : 'AI Ready'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Chapter & Topic Selection Grid with Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chapter Selection Column */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Step 2: Chapter / Unit ({chaptersForSubject.length})</span>
                </label>
              </div>

              {/* Chapter Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={e => setChapterSearch(e.target.value)}
                  placeholder="Search chapters (e.g. Cell, Genetics, Force)..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {chapterSearch && (
                  <button
                    onClick={() => setChapterSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Chapter List */}
              <div className="h-52 overflow-y-auto pr-1 space-y-1 rounded-xl border border-slate-800/80 bg-slate-900/30 p-1.5">
                {filteredChapters.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No chapters match "{chapterSearch}"
                  </div>
                ) : (
                  filteredChapters.map(chap => {
                    const isSelected = chap === selectedChapter;
                    const count = getChapterQuestionCount(chap);

                    return (
                      <button
                        key={chap}
                        onClick={() => {
                          setSelectedChapter(chap);
                          setTopicSearch('');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <span className="truncate pr-2">{chap}</span>
                        {count > 0 ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                              isSelected
                                ? 'bg-slate-950/20 text-slate-950'
                                : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                            }`}
                          >
                            {count} MCQs
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                              isSelected ? 'text-slate-900 opacity-75' : 'text-slate-400'
                            }`}
                          >
                            AI
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Topic Selection Column */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Step 3: Topic / Sub-Concept ({topicsForChapter.length})</span>
                </label>
              </div>

              {/* Topic Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={e => setTopicSearch(e.target.value)}
                  placeholder="Search sub-topics (e.g. Enzymes, Membrane, Light)..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {topicSearch && (
                  <button
                    onClick={() => setTopicSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Topic List */}
              <div className="h-52 overflow-y-auto pr-1 space-y-1 rounded-xl border border-slate-800/80 bg-slate-900/30 p-1.5">
                {/* Option to select All Topics in Chapter */}
                <button
                  onClick={() => setSelectedTopic('')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                    selectedTopic === ''
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <span className="font-semibold">🌟 Entire Chapter (Mixed Topics)</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                      selectedTopic === ''
                        ? 'bg-slate-950/20 text-slate-950'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {getChapterQuestionCount(selectedChapter)} MCQs
                  </span>
                </button>

                {filteredTopics.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No specific sub-topics found matching "{topicSearch}"
                  </div>
                ) : (
                  filteredTopics.map(top => {
                    const isSelected = top === selectedTopic;
                    const count = getTopicQuestionCount(top);

                    return (
                      <button
                        key={top}
                        onClick={() => setSelectedTopic(top)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900/80 hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <span className="truncate pr-2">{top}</span>
                        {count > 0 ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                              isSelected
                                ? 'bg-slate-950/20 text-slate-950'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}
                          >
                            {count} MCQs
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                              isSelected ? 'text-slate-900 opacity-75' : 'text-slate-400'
                            }`}
                          >
                            AI
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Quiz Parameters (Source, Questions Count, Difficulty) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
            {/* Question Source */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Question Source</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSource('DATABASE')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    source === 'DATABASE'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Database ({matchingDbQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSource('AI')}
                  className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    source === 'AI'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Gen</span>
                </button>
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <span>Number of Questions</span>
              </label>
              <select
                value={numQuestions}
                onChange={e => setNumQuestions(parseInt(e.target.value, 10))}
                className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-100 border border-slate-800 focus:outline-none focus:border-cyan-500"
              >
                {[5, 10, 15, 20, 30].map(n => (
                  <option key={n} value={n}>
                    {n} Questions
                  </option>
                ))}
                {matchingDbQuestions.length > 0 && source === 'DATABASE' && (
                  <option value={matchingDbQuestions.length}>
                    All Available ({matchingDbQuestions.length} MCQs)
                  </option>
                )}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <span>Target Difficulty</span>
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-100 border border-slate-800 focus:outline-none focus:border-cyan-500"
              >
                {['Any', 'Easy', 'Medium', 'Hard'].map(d => (
                  <option key={d} value={d}>
                    {d === 'Any' ? 'Mixed (Standard NMDCAT)' : d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Availability Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs">
              {source === 'DATABASE' ? (
                matchingDbQuestions.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      <strong className="text-emerald-400">{matchingDbQuestions.length} verified questions</strong> available in database for{' '}
                      <span className="text-slate-100 font-semibold">{selectedTopic || selectedChapter}</span>.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-300">
                      0 verified questions in database. Click <button onClick={() => setSource('AI')} className="text-purple-400 underline font-semibold">AI Generated</button> to generate 100% syllabus-aligned questions instantly.
                    </span>
                  </>
                )
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-slate-300">
                    AI will generate <strong className="text-purple-300">{numQuestions} {difficulty}</strong> questions tailored to PMDC 2026 syllabus for <span className="text-slate-100 font-semibold">{selectedTopic || selectedChapter}</span>.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading || (!selectedChapter && !selectedTopic)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Preparing Quiz...</span>
              </>
            ) : (
              <>
                <span>Start Topic Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicQuizBuilder;
