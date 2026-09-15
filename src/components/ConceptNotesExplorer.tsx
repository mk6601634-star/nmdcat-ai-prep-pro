import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Zap, 
  Stethoscope, 
  GraduationCap, 
  Award,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import { DefinitionItem, SubjectType, SyllabusTopic } from '../types';
import { PMDC_SYLLABUS_TOPICS } from '../data/nmdcatData';
import { subscribeToPublishedNotes } from '../lib/firestoreService';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';

export const ConceptNotesExplorer: React.FC = () => {
  const [publishedNotes, setPublishedNotes] = useState<DefinitionItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<DefinitionItem | null>(null);
  const [selectedSyllabusTopic, setSelectedSyllabusTopic] = useState<SyllabusTopic>(PMDC_SYLLABUS_TOPICS[0]);
  const [activeTab, setActiveTab] = useState<'multilevel' | 'simplified' | 'detailed' | 'revision'>('multilevel');
  const [explanationLevel, setExplanationLevel] = useState<'basic' | 'intermediate' | 'advanced' | 'nmdcatLevel' | 'medicalLevel'>('nmdcatLevel');
  
  const [aiExplanations, setAiExplanations] = useState<Record<string, string> | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const notesAction = useAiRequestAction();

  useEffect(() => {
    const unsubscribe = subscribeToPublishedNotes((items) => {
      setPublishedNotes(items);
      if (items.length > 0) {
        setSelectedNote(items[0]);
        setAiExplanations(null);
      }
    });
    return unsubscribe;
  }, []);

  // Use published notes if available, seamlessly combined with PMDC syllabus topics
  const combinedTopics = React.useMemo(() => {
    type CombinedTopicItem = {
      id: string;
      subject: SubjectType;
      chapter: string;
      title: string;
      weightagePercentage: number;
      keyPoints: string[];
      rawNote?: DefinitionItem;
    };

    const fromNotes: CombinedTopicItem[] = publishedNotes.map(n => ({
      id: n.id,
      subject: n.subject,
      chapter: n.chapter,
      title: n.title || n.term,
      weightagePercentage: (n as any).weightagePercentage ?? 5,
      keyPoints: n.relatedTerms?.length ? n.relatedTerms : (n.summary ? n.summary.split('. ').filter(Boolean) : []),
      rawNote: n
    }));

    const fromSyllabus: CombinedTopicItem[] = PMDC_SYLLABUS_TOPICS.map(t => ({
      id: t.id,
      subject: t.subject,
      chapter: t.unit,
      title: t.topic,
      weightagePercentage: t.weightagePercentage ?? 5,
      keyPoints: t.keyPoints || []
    }));

    // Deduplicate by title
    const seen = new Set<string>();
    const result: CombinedTopicItem[] = [];
    [...fromNotes, ...fromSyllabus].forEach(item => {
      const key = `${item.subject}_${item.title}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    });
    return result;
  }, [publishedNotes]);

  const selectedTopic = React.useMemo<SyllabusTopic>(() => {
    if (selectedNote) {
      return {
        id: selectedNote.id,
        subject: selectedNote.subject,
        unit: selectedNote.chapter,
        topic: selectedNote.title || selectedNote.term,
        weightagePercentage: (selectedNote as any).weightagePercentage ?? 5,
        status: 'not-started',
        keyPoints: selectedNote.relatedTerms?.length
          ? selectedNote.relatedTerms
          : selectedNote.summary
            ? selectedNote.summary.split('. ').filter(Boolean)
            : []
      } as SyllabusTopic;
    }

    return selectedSyllabusTopic || PMDC_SYLLABUS_TOPICS[0];
  }, [selectedNote, selectedSyllabusTopic]);

  const filteredTopics = combinedTopics.filter((t) => {
    const matchSubj = subjectFilter === 'All' || t.subject === subjectFilter;
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubj && matchSearch;
  });

  const handleFetchAiNotes = async () => {
    if (notesAction.isLoading) return;

    const topicName = selectedTopic.topic || 'Cell Structure & Function';
    const subject = selectedTopic.subject || 'Biology';
    const unit = selectedTopic.unit || 'Cell Biology';

    try {
      const data = await notesAction.runRequest(
        async (signal) =>
          await aiFetch<{ explanations: Record<string, string> }>('/api/multilevel-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicName,
              subject,
              unit
            })
          }, { signal }),
        {
          pending: `Generating multi-level AI notes for "${topicName}"...`,
          success: 'AI notes generated successfully.',
          cancelled: 'AI notes generation cancelled.',
          failure: 'AI notes generation failed. Please retry.'
        }
      );

      if (data && data.explanations) {
        setAiExplanations(data.explanations);
        setActiveTab('multilevel');
      }
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      setAiErrorMessage(notesAction.errorMessage);
      if (import.meta.env.DEV) console.error('Failed to fetch AI notes', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Topic Selector */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Syllabus Topics
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">{filteredTopics.length} available</span>
          </div>

          {/* Search & Subject Filters */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or unit..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['All', 'Biology', 'Chemistry', 'Physics', 'English'].map(s => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  subjectFilter === s ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Topic List */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredTopics.map((item) => {
              const isSelected = selectedTopic.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.rawNote) {
                      setSelectedNote(item.rawNote);
                    } else {
                      setSelectedNote(null);
                      setSelectedSyllabusTopic({
                        id: item.id,
                        subject: item.subject,
                        unit: item.chapter,
                        topic: item.title,
                        weightagePercentage: item.weightagePercentage,
                        status: 'not-started',
                        keyPoints: item.keyPoints
                      });
                    }
                    setAiExplanations(null);
                  }}
                  className={`p-3 rounded-xl cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-[10px] text-indigo-400">{item.subject}</span>
                    <span className="text-[9px] text-slate-500">{item.weightagePercentage}% weightage</span>
                  </div>
                  <h4 className="font-semibold line-clamp-1">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Unit: {item.chapter}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Panel: Concept Notes Viewer */}
      <div className="lg:col-span-8 space-y-4">
        {/* Topic Header Card */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedTopic.subject} &bull; {selectedTopic.unit}
                </span>
                <span className="text-xs text-slate-400">Weightage: {selectedTopic.weightagePercentage}%</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1.5">{selectedTopic.topic}</h2>
            </div>

            <button
              onClick={handleFetchAiNotes}
              disabled={notesAction.isLoading}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {notesAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{notesAction.isLoading ? 'Generating Notes...' : 'Generate Multi-Level Notes'}</span>
            </button>
          </div>

          <div className="mt-4">
            <AiActionStatus
              statusMessage={notesAction.statusMessage}
              errorMessage={notesAction.errorMessage}
              isLoading={notesAction.isLoading}
            />
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('multilevel')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'multilevel' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Multi-Level Explanation</span>
            </button>
            <button
              onClick={() => setActiveTab('simplified')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'simplified' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simplified Notes</span>
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'detailed' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Textbook Notes</span>
            </button>
            <button
              onClick={() => setActiveTab('revision')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'revision' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>High-Yield Revision Sheet</span>
            </button>
          </div>

          {/* Tab 1: Multi-Level Explanations */}
          {activeTab === 'multilevel' && (
            <div className="space-y-4">
              {/* Level Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'basic', label: '1. Basic', icon: GraduationCap },
                  { id: 'intermediate', label: '2. FSc Level', icon: BookOpen },
                  { id: 'advanced', label: '3. Advanced', icon: Zap },
                  { id: 'nmdcatLevel', label: '4. NMDCAT Exam', icon: Award },
                  { id: 'medicalLevel', label: '5. Medical MBBS', icon: Stethoscope },
                ].map((lvl) => {
                  const Icon = lvl.icon;
                  const isSel = explanationLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => setExplanationLevel(lvl.id as any)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSel
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[11px]">{lvl.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation Text Display */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 leading-relaxed text-sm text-slate-200 min-h-[220px]">
                {aiExplanations ? (
                  <div className="space-y-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 uppercase">
                      {explanationLevel} Mode
                    </span>
                    <p className="whitespace-pre-line text-slate-200">
                      {aiExplanations[explanationLevel] || 'Explanation generated successfully.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                      {explanationLevel} Overview
                    </span>
                    <p className="text-slate-300">
                            {explanationLevel === 'basic' && `Basic introduction to ${selectedTopic.topic}: Focuses on foundational vocabulary and simple conceptual analogies.`}
                      {explanationLevel === 'intermediate' && `FSc Textbook standard coverage for ${selectedTopic.topic}: Scientific definitions, reaction pathways, and labeled biological mechanisms.`}
                      {explanationLevel === 'advanced' && `Advanced analytical mechanisms for ${selectedTopic.topic}: Detailed kinetic equations, organic reaction exceptions, and molecular genetics.`}
                      {explanationLevel === 'nmdcatLevel' && `NMDCAT Exam Specific Focus: Common distractor traps, past paper frequency formulas, and 30-second solving shortcuts.`}
                      {explanationLevel === 'medicalLevel' && `Clinical MBBS Relevance: Real-world medical applications, clinical pathology, and physiological pathology links.`}
                    </p>
                    <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
                      <span>Click "Generate Multi-Level Notes" for custom AI synthesis</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Simplified Notes */}
          {activeTab === 'simplified' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Simplified Quick Points & Key Summaries
              </h3>
              <ul className="space-y-2 text-xs text-slate-200">
                {(selectedTopic.keyPoints || []).map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tab 3: Detailed Textbook Notes */}
          {activeTab === 'detailed' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
              <h3 className="text-sm font-bold text-white mb-2">Complete PMDC Textbook Depth</h3>
              <p>
                <strong>{selectedTopic.topic}</strong> forms a crucial {selectedTopic.weightagePercentage}% portion of the PMDC syllabus for {selectedTopic.subject}. High scoring candidates must master both basic definition boundaries and deep quantitative relationships.
              </p>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 mt-2">
                <span className="font-bold text-indigo-400 block">Exam Focus & Core Principles:</span>
                <p className="text-slate-300">
                  {selectedNote?.content || selectedNote?.textbookDefinition || 'Review core concepts and summary notes from the published material.'}
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: High-Yield Revision Sheet */}
          {activeTab === 'revision' && (
            <div className="bg-gradient-to-b from-slate-950 to-slate-900 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  One-Page High-Yield Revision Summary Sheet
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  Last-Minute Revision
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-indigo-300 block">Top Most Tested Facts</span>
                  <p className="text-slate-300">{selectedTopic.keyPoints[0] || selectedNote?.summary || 'High frequency PMDC concept point'}</p>
                </div>
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-300 block">Frequently Tested Distractor</span>
                  <p className="text-slate-300">Watch out for subtle unit conversions and directional sign traps.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
