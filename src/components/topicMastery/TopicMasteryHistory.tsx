import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  Eye, 
  Play, 
  Trash2, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Filter, 
  Search,
  Zap,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { TopicMasterySession, TopicMasteryStatus } from '../../types/topicMastery';
import { SubjectType } from '../../types';

interface TopicMasteryHistoryProps {
  sessions: TopicMasterySession[];
  onResumeSession: (session: TopicMasterySession) => void;
  onReviewSession: (session: TopicMasterySession) => void;
  onPracticeAgain: (session: TopicMasterySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartNewTopic: () => void;
}

export const TopicMasteryHistory: React.FC<TopicMasteryHistoryProps> = ({
  sessions,
  onResumeSession,
  onReviewSession,
  onPracticeAgain,
  onDeleteSession,
  onStartNewTopic
}) => {
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = sessions.filter(s => {
    if (subjectFilter !== 'ALL' && s.subject !== subjectFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'IN_PROGRESS' && s.status !== 'in_progress') return false;
      if (statusFilter === 'COMPLETED' && s.status !== 'completed') return false;
      if (statusFilter === 'MASTERED' && s.masteryStatus !== 'Mastered') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.topic.toLowerCase().includes(q) ||
        s.chapter.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: TopicMasteryStatus, isCompleted: boolean) => {
    switch (status) {
      case 'Mastered':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">★ Mastered</span>;
      case 'Strong':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/30">Strong</span>;
      case 'Practicing':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Practicing</span>;
      case 'Needs Review':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">Needs Review</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">In Progress</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <History className="w-6 h-6 text-indigo-400" />
              <span>Topic Mastery Journey History</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Track, review, resume, and re-practice all your topic learning sessions.
            </p>
          </div>

          <button
            onClick={onStartNewTopic}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <BookOpen className="w-4 h-4" />
            <span>Master a New Topic</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or chapter..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Subjects</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Physics">Physics</option>
            <option value="English">English</option>
            <option value="Logical Reasoning">Logical Reasoning</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="MASTERED">Mastered (Score &ge; 85%)</option>
          </select>
        </div>
      </div>

      {/* Session Cards List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((s) => {
            const isCompleted = s.status === 'completed';
            const dateFormatted = new Date(s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <div
                key={s.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {s.subject}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {s.chapter}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(s.masteryStatus, isCompleted)}
                    <span className="text-[11px] text-slate-500">
                      {dateFormatted}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">{s.topic}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      Mastery Score: <strong className="text-white font-bold">{s.masteryScore}%</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Stages Completed: <strong className="text-white font-bold">{s.completedStages?.length || 0}</strong>
                    </span>
                    {s.weakAreas && s.weakAreas.length > 0 && (
                      <span className="flex items-center gap-1 text-rose-400 font-semibold">
                        <Zap className="w-3.5 h-3.5" />
                        {s.weakAreas.length} Weak Area(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {!isCompleted ? (
                      <button
                        onClick={() => onResumeSession(s)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume Learning</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onReviewSession(s)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review Session</span>
                      </button>
                    )}

                    <button
                      onClick={() => onPracticeAgain(s)}
                      className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Practice Again (New Session)</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteSession(s.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete Session Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-md mx-auto">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Topic Mastery Sessions Found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery || subjectFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No sessions match your active filters. Try clearing search or filters.'
              : 'You have not started any Topic Mastery journeys yet. Choose a topic to begin!'}
          </p>
          <button
            onClick={onStartNewTopic}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <BookOpen className="w-4 h-4" />
            <span>Start Your First Topic</span>
          </button>
        </div>
      )}
    </div>
  );
};
