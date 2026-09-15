import React, { useState } from 'react';
import UiCard from './UiCard';
import { SyllabusTopic, SubjectType, SyllabusStatus } from '../types';
import { 
  CheckSquare, 
  Search, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Dna, 
  FlaskConical, 
  Zap, 
  Languages, 
  Brain,
  BookOpen,
  Filter
} from 'lucide-react';

interface SyllabusTrackerProps {
  topics: SyllabusTopic[];
  setTopics: React.Dispatch<React.SetStateAction<SyllabusTopic[]>>;
  setActiveTab: (tab: string) => void;
  setSelectedTopicForDrill?: (subject: SubjectType, topicName: string) => void;
}

export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({
  topics,
  setTopics,
  setActiveTab,
  setSelectedTopicForDrill,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

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

  const filteredTopics = topics.filter(t => {
    const matchesSubject = t.subject === selectedSubject;
    const matchesSearch = t.topic.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.unit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSubject && matchesSearch && matchesStatus;
  });

  // Calculate stats for current subject
  const currentSubjectTopics = topics.filter(t => t.subject === selectedSubject);
  const completedCount = currentSubjectTopics.filter(t => t.status === 'revised' || t.status === 'mcqs-done').length;
  const progressPercent = currentSubjectTopics.length > 0 ? Math.round((completedCount / currentSubjectTopics.length) * 100) : 0;

  const updateTopicStatus = (id: string, newStatus: SyllabusStatus) => {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const statusBadge = (status: SyllabusStatus) => {
    switch (status) {
      case 'revised':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">Fully Revised</span>;
      case 'mcqs-done':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">MCQs Solved</span>;
      case 'reading':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">In Reading</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">Not Started</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <UiCard className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <CheckSquare className="w-4 h-4" />
            <span>PMDC Official Syllabus Checklist</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            PMDC Syllabus Progress Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your chapter-by-chapter preparation, practice topic MCQs, and monitor completion status.
          </p>
        </div>

        {/* Subject Completion Meter */}
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 flex items-center gap-4 w-full md:w-auto">
          {getSubjectIcon(selectedSubject)}
          <div>
            <div className="text-xs font-semibold text-slate-300">{selectedSubject} Progress</div>
            <div className="text-lg font-black text-emerald-400">{progressPercent}% Completed</div>
          </div>
        </div>
      </UiCard>

      {/* Subject Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {subjects.map(sub => {
          const isActive = selectedSubject === sub;
          return (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {getSubjectIcon(sub)}
              <span>{sub}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${selectedSubject} topics or units...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="revised">Fully Revised</option>
            <option value="mcqs-done">MCQs Solved</option>
            <option value="reading">In Reading</option>
            <option value="not-started">Not Started</option>
          </select>
        </div>
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            No topics matched your search or filter. Try adjusting your query!
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const isExpanded = expandedTopicId === topic.id;
            return (
              <div
                key={topic.id}
                className="bg-slate-900/90 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors overflow-hidden"
              >
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {topic.unit}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        PMDC Weightage: ~{topic.weightagePercentage}%
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-sm">{topic.topic}</h3>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Status Select Box */}
                    <select
                      value={topic.status}
                      onChange={(e) => updateTopicStatus(topic.id, e.target.value as SyllabusStatus)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="not-started">⚪ Not Started</option>
                      <option value="reading">🟡 Reading</option>
                      <option value="mcqs-done">🔵 MCQs Solved</option>
                      <option value="revised">🟢 Fully Revised</option>
                    </select>

                    <button
                      onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Key Points & Actions */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-slate-800/40 border-t border-slate-800/80 space-y-3">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-300">High-Yield Textbook Key Points:</h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                        {topic.keyPoints.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          if (setSelectedTopicForDrill) {
                            setSelectedTopicForDrill(topic.subject, topic.topic);
                          }
                          setActiveTab('practice');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Practice Topic MCQs</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('aitutor')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ask AI Tutor</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
