import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  History, 
  Layers, 
  Flame, 
  Compass, 
  Search, 
  Check, 
  Filter, 
  ChevronRight,
  Atom,
  TestTube2,
  Dna,
  Binary,
  GraduationCap
} from 'lucide-react';
import { SyllabusTopic, SubjectType } from '../../types';
import { TopicMasteryContext, TopicMasterySession } from '../../types/topicMastery';
import { PMDC_SYLLABUS_TOPICS } from '../../data/nmdcatData';
import { getRelevantStagesForSubject, calculateTopicMasteryScore } from '../../utils/topicMasteryUtils';
import { FormattedMathContent } from '../FormattedMathContent';

interface TopicMasteryLauncherProps {
  topics?: SyllabusTopic[];
  onStartMastery: (context: TopicMasteryContext) => void;
  inProgressSessions?: TopicMasterySession[];
  onResumeSession?: (session: TopicMasterySession) => void;
  onOpenHistory?: () => void;
}

const SUBJECT_OPTIONS: { id: SubjectType; label: string; icon: any; color: string; bgBadge: string; description: string }[] = [
  {
    id: 'Biology',
    label: 'Biology',
    icon: Dna,
    color: 'from-emerald-500 to-teal-600',
    bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Cell biology, bioenergetics, genetics, organ systems & PMDC classification'
  },
  {
    id: 'Chemistry',
    label: 'Chemistry',
    icon: TestTube2,
    color: 'from-cyan-500 to-blue-600',
    bgBadge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    description: 'Organic reaction mechanisms, physical constants, equilibria & stoichiometry'
  },
  {
    id: 'Physics',
    label: 'Physics',
    icon: Atom,
    color: 'from-amber-500 to-orange-600',
    bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'Mechanics, electromagnetism, wave optics, modern physics & derivations'
  },
  {
    id: 'English',
    label: 'English',
    icon: BookOpen,
    color: 'from-indigo-500 to-purple-600',
    bgBadge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    description: 'Grammar rules, sentence completion, high-yield vocabulary & error spotting'
  },
  {
    id: 'Logical Reasoning',
    label: 'Logical Reasoning',
    icon: Binary,
    color: 'from-fuchsia-500 to-rose-600',
    bgBadge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    description: 'Critical thinking, syllogisms, pattern analysis & cause-and-effect deduction'
  }
];

export const TopicMasteryLauncher: React.FC<TopicMasteryLauncherProps> = ({
  topics = PMDC_SYLLABUS_TOPICS,
  onStartMastery,
  inProgressSessions = [],
  onResumeSession,
  onOpenHistory
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter topics for currently selected subject
  const subjectTopics = useMemo(() => {
    const raw = Array.isArray(topics) && topics.length > 0 ? topics : PMDC_SYLLABUS_TOPICS;
    return raw.filter(t => t && t.subject && t.subject.toLowerCase() === selectedSubject.toLowerCase());
  }, [topics, selectedSubject]);

  // Extract unique chapters (units) for current subject
  const chapters = useMemo(() => {
    const set = new Set<string>();
    subjectTopics.forEach(t => {
      if (t && t.unit) set.add(t.unit);
    });
    return Array.from(set);
  }, [subjectTopics]);

  // Effective selected chapter (derived - zero render cascades)
  const activeChapter = (selectedChapter && chapters.includes(selectedChapter))
    ? selectedChapter
    : (chapters[0] || '');

  // Filter topics by selected chapter and optional search query
  const filteredTopics = useMemo(() => {
    return subjectTopics.filter(t => {
      if (!t) return false;
      const matchChapter = !activeChapter || t.unit === activeChapter;
      const q = (searchQuery || '').toLowerCase().trim();
      const matchSearch = !q || 
        (t.topic && t.topic.toLowerCase().includes(q)) || 
        (t.unit && t.unit.toLowerCase().includes(q)) ||
        (Array.isArray(t.keyPoints) && t.keyPoints.some(k => typeof k === 'string' && k.toLowerCase().includes(q)));
      return matchChapter && matchSearch;
    });
  }, [subjectTopics, activeChapter, searchQuery]);

  // Effective selected topic (derived)
  const selectedTopic = useMemo(() => {
    if (selectedTopicId) {
      const found = filteredTopics.find(t => t && t.id === selectedTopicId) || subjectTopics.find(t => t && t.id === selectedTopicId);
      if (found) return found;
    }
    return filteredTopics[0] || subjectTopics[0] || null;
  }, [subjectTopics, selectedTopicId, filteredTopics]);

  const handleSubjectSelect = (sub: SubjectType) => {
    setSelectedSubject(sub);
    setSelectedChapter('');
    setSelectedTopicId('');
  };

  const handleChapterSelect = (chap: string) => {
    setSelectedChapter(chap);
    setSelectedTopicId('');
  };

  const relevantStages = useMemo(() => {
    return getRelevantStagesForSubject(selectedSubject);
  }, [selectedSubject]);

  // Active in-progress sessions for quick resume
  const activeUnfinishedSessions = useMemo(() => {
    if (!Array.isArray(inProgressSessions)) return [];
    return inProgressSessions
      .filter(s => s && (s.status === 'in_progress' || s.status === 'not_started'))
      .slice(0, 3);
  }, [inProgressSessions]);

  const handleLaunch = () => {
    if (!selectedTopic) return;

    const context: TopicMasteryContext = {
      subjectId: selectedSubject.toLowerCase(),
      subjectName: selectedSubject,
      chapterId: (selectedTopic.unit || 'chapter-1').toLowerCase().replace(/\s+/g, '-'),
      chapterName: selectedTopic.unit || 'General Chapter',
      topicId: selectedTopic.id,
      topicName: selectedTopic.topic,
      sessionId: `tms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    onStartMastery(context);
  };

  const currentSubjectMeta = SUBJECT_OPTIONS.find(s => s.id === selectedSubject) || SUBJECT_OPTIONS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              Unified Topic Mastery Hub
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Master Any PMDC Topic in <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">One Dedicated Workspace</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              No endless switching across 10 pages. Learn the core theory with AI Tutor, view high-yield Mind Maps & Notes, master formulas & reactions, drill real database MCQs, fix weak spots, and earn your Mastery Badge.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
              >
                <History className="w-4 h-4 text-indigo-400" />
                Session History
                {inProgressSessions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300">
                    {inProgressSessions.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quick Resume Carousel if active sessions exist */}
        {activeUnfinishedSessions.length > 0 && onResumeSession && (
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Resume In-Progress Sessions
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeUnfinishedSessions.map(session => {
                const score = calculateTopicMasteryScore(session);
                return (
                  <div
                    key={session.sessionId}
                    onClick={() => onResumeSession(session)}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800/90 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                          {session.subjectName}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {session.chapterName}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {session.topicName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span>{(session.completedStages || []).length} stages done</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">{score}% mastery</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 group-hover:bg-amber-500 text-amber-400 group-hover:text-slate-950 flex items-center justify-center transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Subject Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">1</span>
            <h2 className="text-lg font-bold text-white">Select PMDC Subject</h2>
          </div>
          <span className="text-xs text-slate-400">Zero cross-subject contamination guaranteed</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUBJECT_OPTIONS.map(sub => {
            const Icon = sub.icon;
            const isSelected = selectedSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => handleSubjectSelect(sub.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sub.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                  {sub.label}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {sub.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 & 3: Chapter & Topic Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chapters Column */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="text-base font-bold text-white">Select Chapter / Unit</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{chapters.length} units</span>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {chapters.map((chapter, idx) => {
              const isSelected = activeChapter === chapter;
              const count = subjectTopics.filter(t => t.unit === chapter).length;
              return (
                <button
                  key={chapter}
                  onClick={() => handleChapterSelect(chapter)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${isSelected ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
                      U{idx + 1}
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {chapter}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded-full bg-slate-800/50">
                    {count} topics
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics Column */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">3</span>
              <h3 className="text-base font-bold text-white">Choose Specific Topic</h3>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topics or concepts..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredTopics.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                <p className="text-sm font-semibold">No topics match your filter</p>
                <p className="text-xs text-slate-500 mt-1">Try searching for different keywords or pick another chapter</p>
              </div>
            ) : (
              filteredTopics.map(top => {
                const isSelected = selectedTopic?.id === top.id;
                return (
                  <div
                    key={top.id}
                    onClick={() => setSelectedTopicId(top.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/95 border-amber-500/80 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {top.weightagePercentage || 5}% PMDC Weightage
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                          {top.unit}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm group-hover:text-amber-300">
                        {top.topic}
                      </h4>
                      {Array.isArray(top.keyPoints) && top.keyPoints.length > 0 && typeof top.keyPoints[0] === 'string' && (
                        <div className="text-xs text-slate-400 line-clamp-1">
                          <FormattedMathContent content={top.keyPoints[0]} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSelected ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Selected
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 font-semibold text-xs group-hover:text-white">
                          Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Action Footer Bar / Topic Blueprint */}
      {selectedTopic && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-500/30 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${currentSubjectMeta.bgBadge}`}>
                {selectedSubject}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-medium">
                {selectedTopic.unit}
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              {selectedTopic.topic}
            </h3>
            
            {/* Dynamic Stage Pill Preview */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-slate-400 font-semibold mr-1">Dynamic Stages:</span>
              {relevantStages.map(stage => {
                const Icon = stage.icon;
                return (
                  <span
                    key={stage.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px]"
                  >
                    <Icon className="w-3 h-3 text-indigo-400" />
                    {stage.label}
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleLaunch}
            className="w-full lg:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-base flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-slate-950" />
            MASTER THIS TOPIC
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};
