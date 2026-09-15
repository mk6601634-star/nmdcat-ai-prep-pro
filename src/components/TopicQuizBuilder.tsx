import React, { useEffect, useMemo, useState } from 'react';
import UiCard from './UiCard';
import { PMDC_SYLLABUS_TOPICS } from '../data/nmdcatData';
import { fetchPublishedMcqsForTopic, getPublishedMcqCountForTopic } from '../lib/firestoreService';
import { aiFetch } from '../lib/aiRequest';
import { MCQQuestion } from '../types';

export type QuizSource = 'DATABASE' | 'AI';

interface TopicQuizBuilderProps {
  onStartQuiz: (questions: MCQQuestion[], source: QuizSource, meta: { subject: string; chapter: string; topic: string }) => void;
  onClose?: () => void;
}

export const TopicQuizBuilder: React.FC<TopicQuizBuilderProps> = ({ onStartQuiz, onClose }) => {
  const subjects = useMemo(() => Array.from(new Set(PMDC_SYLLABUS_TOPICS.map(t => t.subject))), []);
  const [subject, setSubject] = useState<string>(subjects[0] || 'Biology');
  const [chapter, setChapter] = useState<string>('');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('Any');
  const [source, setSource] = useState<QuizSource>('DATABASE');
  const [topicCount, setTopicCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chaptersForSubject = useMemo(() => {
    const units = PMDC_SYLLABUS_TOPICS.filter(t => t.subject === subject).map(t => t.unit);
    return Array.from(new Set(units));
  }, [subject]);

  const topicsForChapter = useMemo(() => PMDC_SYLLABUS_TOPICS.filter(t => t.subject === subject && t.unit === chapter), [subject, chapter]);

  useEffect(() => {
    if (!chapter && chaptersForSubject.length > 0) setChapter(chaptersForSubject[0]);
  }, [chaptersForSubject, chapter]);

  useEffect(() => {
    if (topicId) {
      const topic = PMDC_SYLLABUS_TOPICS.find(t => t.id === topicId) as any;
      if (topic) {
        // fetch database count
        setTopicCount(null);
        getPublishedMcqCountForTopic(topic.subject, topic.unit, topic.topic).then(c => setTopicCount(c)).catch(() => setTopicCount(0));
      }
    }
  }, [topicId]);

  const handleStart = async () => {
    setError(null);
    if (!topicId) return setError('Please select a topic.');
    const topic = PMDC_SYLLABUS_TOPICS.find(t => t.id === topicId)!;
    setIsLoading(true);
    try {
      if (source === 'DATABASE') {
        const items = await fetchPublishedMcqsForTopic(topic.subject, topic.unit, topic.topic);
        if (!items || items.length === 0) {
          setError('No published questions are currently available for this topic.');
          setIsLoading(false);
          return;
        }

        // randomize and slice
        const shuffled = items.sort(() => Math.random() - 0.5);
        const take = Math.min(numQuestions, shuffled.length);
        const chosen = (shuffled as MCQQuestion[]).slice(0, take);
        onStartQuiz(chosen, 'DATABASE', { subject: topic.subject, chapter: topic.unit, topic: topic.topic });
      } else {
        // AI generated
        const payload = {
          subject: topic.subject,
          topic: topic.topic,
          chapter: topic.unit,
          count: numQuestions,
          difficulty: difficulty === 'Any' ? 'NMDCAT Standard' : difficulty
        };

        const resp = await aiFetch<{ mcqs?: any[] }>('/api/generate-mcqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, { timeoutMs: 60000 });

        const mcqs = resp.mcqs || [];
        // validate structure
        const valid: MCQQuestion[] = [];
        for (const m of mcqs) {
          if (!m || !m.question || !Array.isArray(m.options) || m.options.length !== 4) continue;
          const correctIndex = typeof m.correctIndex === 'number' ? m.correctIndex : (m.correctIndex ?? -1);
          if (correctIndex < 0 || correctIndex > 3) continue;
          valid.push({
            id: m.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
            subject: m.subject || topic.subject,
            chapter: m.chapter || topic.unit,
            question: m.question,
            options: m.options,
            correctIndex: correctIndex,
            explanation: m.explanation || 'No explanation provided by AI.',
            difficulty: m.difficulty || (difficulty === 'Any' ? 'Medium' : difficulty)
          });
        }

        if (valid.length === 0) {
          setError('AI quiz generation failed or returned no valid questions.');
          setIsLoading(false);
          return;
        }

        onStartQuiz(valid, 'AI', { subject: topic.subject, chapter: topic.unit, topic: topic.topic });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to prepare quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <UiCard className="z-50 max-w-3xl w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Topic Quiz</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">Close</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 border border-slate-800">
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Chapter / Unit</label>
            <select value={chapter} onChange={e => setChapter(e.target.value)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 border border-slate-800">
              {chaptersForSubject.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Topic</label>
            <select value={topicId || ''} onChange={e => setTopicId(e.target.value || null)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 border border-slate-800">
              <option value="">Select topic</option>
              {topicsForChapter.map(t => <option key={t.id} value={t.id}>{t.topic}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Number of Questions</label>
            <select value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value, 10))} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 border border-slate-800">
              {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 border border-slate-800">
              {['Any','Easy','Medium','Hard'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400">Source</label>
            <select value={source} onChange={e => setSource(e.target.value as QuizSource)} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 border border-slate-800">
              <option value="DATABASE">Database MCQs</option>
              <option value="AI">AI Generated</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {topicId && topicCount !== null ? <span>Database: {topicCount} questions available • AI: Available</span> : <span>Select a topic to view availability</span>}
            {error && <div className="text-rose-400 mt-1">{error}</div>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Cancel</button>
            <button onClick={handleStart} disabled={isLoading} className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold">{isLoading ? 'Preparing...' : 'Start Quiz'}</button>
          </div>
        </div>
      </UiCard>
    </div>
  );
};

export default TopicQuizBuilder;
