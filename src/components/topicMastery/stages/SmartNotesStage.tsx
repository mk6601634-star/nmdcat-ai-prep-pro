import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Bookmark, 
  MessageSquare, 
  CheckSquare, 
  ListChecks,
  AlertCircle
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { SyllabusTopic } from '../../../types';
import { PMDC_SYLLABUS_TOPICS } from '../../../data/nmdcatData';
import { FormattedMathContent } from '../../FormattedMathContent';

interface SmartNotesStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const SmartNotesStage: React.FC<SmartNotesStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [activeTab, setActiveTab] = useState<'high_yield' | 'textbook' | 'checklist'>('high_yield');

  // Find syllabus topic metadata
  const syllabusEntry = PMDC_SYLLABUS_TOPICS.find(t => 
    t.subject === context.subjectName && 
    (t.topic.toLowerCase().includes(context.topicName.toLowerCase()) || context.topicName.toLowerCase().includes(t.topic.toLowerCase()))
  );

  const keyPoints = syllabusEntry?.keyPoints || [
    `Core high-yield principle of ${context.topicName} according to PMDC guidelines.`,
    `Frequently tested in national entrance exams with high weightage.`,
    `Connects directly with prerequisite chapter concepts in ${context.chapterName}.`
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Smart Notes & Revision Sheet</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Curated PMDC High-Yield Study Notes for <strong className="text-emerald-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('high_yield')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'high_yield' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            High-Yield
          </button>
          <button
            onClick={() => setActiveTab('textbook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'textbook' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Textbook Core
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'checklist' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Checklist
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'high_yield' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {keyPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    High-Yield Rule #{idx + 1}
                  </span>
                  <button
                    onClick={() => onAskTutor(`Explain this key exam point about ${context.topicName}: "${point}"`)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                    title="Ask Tutor to explain this point"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Clarify</span>
                  </button>
                </div>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <FormattedMathContent content={point} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              <span>Syllabus Weightage & Priority Rank</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">Subject</span>
                <strong className="text-white font-bold">{context.subjectName}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">Unit / Chapter</span>
                <strong className="text-white font-bold">{context.chapterName}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">Exam Weightage</span>
                <strong className="text-emerald-400 font-bold">{syllabusEntry?.weightagePercentage || 6}%</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">Past Paper Frequency</span>
                <strong className="text-indigo-300 font-bold">Extremely High</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'textbook' && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span>PMDC & Provincial Textbook Standards</span>
          </h3>
          <p className="text-xs text-slate-400">
            Authoritative textbook concepts aligned with UHS, NUMS, SZABMU, KMU & Sindh MDCAT standards.
          </p>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 leading-relaxed space-y-3">
            <p>
              When preparing <strong>{context.topicName}</strong> for the NMDCAT, examiners place heavy emphasis on:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
              <li>Exact textbook definitions and terminological distinctions.</li>
              <li>Exceptions to generalized rules and boundary conditions.</li>
              <li>Mathematical formulas, variable dependencies, and graphic trends.</li>
              <li>Direct factual recall from Punjab, Sindh, KPK, and Federal Board textbooks.</li>
            </ul>
          </div>

          <button
            onClick={() => onAskTutor(`Give me a detailed textbook summary of ${context.topicName} comparing Punjab, Sindh, and Federal Board syllabus points.`)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Generate Full Multi-Board Comparison Note</span>
          </button>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-400" />
            <span>Mastery Revision Checklist</span>
          </h3>
          <p className="text-xs text-slate-400">
            Verify you have mastered all essential dimensions of {context.topicName}:
          </p>

          <div className="space-y-2.5">
            {[
              `Understood the core definition and physical/biological principle of ${context.topicName}`,
              `Memorized all formulas, units, or chemical equations`,
              `Identified common NMDCAT examiner distractors and exceptions`,
              `Practiced at least 10 database MCQs with >80% accuracy`,
              `Reviewed flashcards with active recall`
            ].map((item, idx) => (
              <label
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs text-slate-200 cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <input type="checkbox" className="w-4 h-4 accent-emerald-500 rounded" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Completion Footer */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={onToggleComplete}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isCompleted ? 'Smart Notes Stage Completed ✓' : 'Mark Smart Notes as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('flashcards')}
            className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Flashcards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
