import React, { useState, useEffect } from 'react';
import { PracticeDrill } from './PracticeDrill';
import { CustomTestBuilder } from './CustomTestBuilder';
import { MockExam } from './MockExam';
import TopicQuizBuilder from './TopicQuizBuilder';
import TopicQuizRunner from './TopicQuizRunner';
import { PastPaperImporterModal } from './PastPaperImporterModal';
import { PastPaperRunner } from './PastPaperRunner';
import UiCard from './UiCard';
import { 
  MCQQuestion, 
  SavedMistake, 
  ExamAttempt, 
  SyllabusTopic, 
  SubjectType, 
  DailyTarget,
  PastPaper 
} from '../types';
import { autoClearPlannerTasks } from '../utils/aiPlanner';
import { 
  subscribeToPastPapers, 
  savePastPaper, 
  deletePastPaper, 
  getLocalPastPapers 
} from '../lib/firestoreService';
import {
  Zap,
  Sliders,
  Award,
  FileCheck,
  Flame,
  Clock,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  FileText,
  ShieldCheck,
  Trash2,
  AlertCircle,
  Plus
} from 'lucide-react';

export interface PracticeWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  questionBank: MCQQuestion[];
  savedMistakes: SavedMistake[];
  setSavedMistakes: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  examHistory: ExamAttempt[];
  setExamHistory: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
  topics: SyllabusTopic[];
  drillSubject: SubjectType;
  drillTopic?: string;
  setDailyTargets?: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
}

export const PracticeWorkspace: React.FC<PracticeWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  questionBank,
  savedMistakes,
  setSavedMistakes,
  examHistory,
  setExamHistory,
  topics,
  drillSubject,
  drillTopic,
  setDailyTargets
}) => {
  const [showTopicBuilder, setShowTopicBuilder] = useState(false);
  const [runningQuiz, setRunningQuiz] = useState<{ questions: any[]; source: 'DATABASE' | 'AI'; meta: any } | null>(null);

  // Authentic Past Papers Vault State
  const [pastPapers, setPastPapers] = useState<PastPaper[]>(() => getLocalPastPapers());
  const [showImporter, setShowImporter] = useState(false);
  const [activeRunningPaper, setActiveRunningPaper] = useState<PastPaper | null>(null);

  useEffect(() => {
    const unsub = subscribeToPastPapers(setPastPapers);
    return () => unsub();
  }, []);

  const handleSaveImportedPaper = async (paper: PastPaper) => {
    const res = await savePastPaper('local_user', paper);
    if (res.success) {
      setPastPapers(prev => {
        const idx = prev.findIndex(p => p.id === paper.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = paper;
          return updated;
        }
        return [paper, ...prev];
      });
    }
    return res;
  };

  const handleDeletePaper = async (paperId: string) => {
    if (window.confirm('Are you sure you want to remove this authentic past paper from your library?')) {
      await deletePastPaper(paperId);
      setPastPapers(prev => prev.filter(p => p.id !== paperId));
    }
  };

  const handleSavePastPaperAttempt = (attempt: ExamAttempt) => {
    setExamHistory(prev => [attempt, ...prev]);
    if (setDailyTargets) {
      setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'exam' }));
    }
  };

  return (
    <div className="space-y-6">
      <UiCard className="rounded-[32px] border-cyan-500/20 bg-gradient-to-br from-cyan-950/85 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Practice studio</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100">Turn revision into high-yield practice</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Choose the mode that fits your current weakness, then move straight into timed questions, custom tests, authentic past papers, or AI-assisted review.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Available modes</p>
            <p className="mt-1 font-semibold text-slate-100">Quick practice, mock exams, custom builder, and authentic past papers</p>
          </div>
        </div>
      </UiCard>

      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'quick_practice', label: 'Quick Practice', icon: Zap },
          { id: 'custom_builder', label: 'Custom Test Builder', icon: Sliders, badge: 'Pro' },
          { id: 'mock_exams', label: 'Mock Exams', icon: Award },
          { id: 'past_papers', label: 'Past Papers', icon: FileCheck },
          { id: 'challenge_mode', label: 'Challenge Mode', icon: Flame, badge: 'Hot' }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id || (activeSubTab === 'practice' && sub.id === 'quick_practice');

          return (
            <button
              key={sub.id}
              onClick={() => onNavigateToTab(sub.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {sub.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}`}>
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Content Switching */}
      {(activeSubTab === 'quick_practice' || activeSubTab === 'practice') && (
        <div className="space-y-4">
          <PracticeDrill
            questionBank={questionBank}
            savedMistakes={savedMistakes}
            setSavedMistakes={setSavedMistakes}
            initialSubject={drillSubject}
            initialTopic={drillTopic}
          />
          <div className="pt-2">
            <button onClick={() => setShowTopicBuilder(true)} className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/10">
              Start Topic Quiz
            </button>
          </div>
        </div>
      )}

      {showTopicBuilder && (
        <TopicQuizBuilder
          questionBank={questionBank}
          onStartQuiz={(questions, source, meta) => {
            setRunningQuiz({ questions, source, meta });
            setShowTopicBuilder(false);
          }}
          onClose={() => setShowTopicBuilder(false)}
        />
      )}

      {runningQuiz && (
        <TopicQuizRunner questions={runningQuiz.questions} source={runningQuiz.source} meta={runningQuiz.meta} onClose={() => setRunningQuiz(null)} />
      )}

      {activeSubTab === 'custom_builder' && (
        <CustomTestBuilder
          questionBank={questionBank}
          savedMistakes={savedMistakes}
          examHistory={examHistory}
          topics={topics}
          setSavedMistakes={setSavedMistakes}
          onSaveExamAttempt={(attempt) => {
            setExamHistory(prev => [attempt, ...prev]);
            if (setDailyTargets) {
              setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'exam' }));
            }
          }}
        />
      )}

      {(activeSubTab === 'mock_exams' || activeSubTab === 'mock') && (
        <MockExam
          questionBank={questionBank}
          savedMistakes={savedMistakes}
          setSavedMistakes={setSavedMistakes}
          examHistory={examHistory}
          setExamHistory={(updater) => {
            setExamHistory(updater);
            if (setDailyTargets) {
              setDailyTargets(prev => autoClearPlannerTasks(prev, { type: 'exam' }));
            }
          }}
        />
      )}

      {/* Authentic Past Papers Vault Mode */}
      {activeSubTab === 'past_papers' && (
        <div className="space-y-6">
          {activeRunningPaper ? (
            <PastPaperRunner
              paper={activeRunningPaper}
              onClose={() => setActiveRunningPaper(null)}
              onSaveAttempt={handleSavePastPaperAttempt}
              savedMistakes={savedMistakes}
              setSavedMistakes={setSavedMistakes}
            />
          ) : (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <FileCheck className="w-4 h-4" />
                    <span>Authentic Past Papers Library</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">Source-Verified NMDCAT Past Papers</h2>
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    Solve real, imported past papers with authentic question numbering, original option sequence, and verified source provenance.
                  </p>
                </div>

                <button
                  onClick={() => setShowImporter(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload / Import Past Paper</span>
                </button>
              </div>

              {/* State A: Zero Uploaded Papers */}
              {pastPapers.length === 0 ? (
                <div className="p-12 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto border border-slate-700">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-100">No past papers uploaded yet.</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      A past paper is an authentic source document dataset. Upload an official past-paper file or structured transcript to create your Past Paper library.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowImporter(true)}
                    className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Your First Past Paper</span>
                  </button>
                </div>
              ) : (
                /* State B: Genuine Uploaded Papers List */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                            {paper.verificationStatus}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {paper.year}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-100 leading-snug">{paper.title}</h3>
                        
                        <div className="space-y-1 text-xs text-slate-400">
                          <p className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">{paper.questionCount}</span> Questions (Original Order)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Source: <span className="font-mono text-slate-400">{paper.sourceFileName || 'User Document'}</span>
                          </p>
                          <p className="text-[11px]">
                            Answer Key: <strong className={paper.hasAnswerKey ? 'text-emerald-400' : 'text-amber-400'}>{paper.hasAnswerKey ? 'Available' : 'Unavailable in Source'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                        <button
                          onClick={() => setActiveRunningPaper(paper)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-500/10"
                        >
                          <span>Solve Authentic Paper</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePaper(paper.id)}
                          className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                          title="Remove Paper"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showImporter && (
            <PastPaperImporterModal
              onClose={() => setShowImporter(false)}
              onSavePaper={handleSaveImportedPaper}
              existingPapers={pastPapers}
            />
          )}
        </div>
      )}

      {activeSubTab === 'challenge_mode' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <Flame className="w-4 h-4 animate-pulse" />
              <span>Speed Sprint Challenge Mode</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Test Your Speed & Accuracy Under Pressure</h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              20 High-yield MCQs in 12 minutes. Earn bonus streak points, unlock badges, and climb the leaderboard!
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <Flame className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Daily Speed Challenge</h3>
            <p className="text-xs text-slate-400">
              Random mix of Physics, Chemistry, and Biology questions with tight timer constraints.
            </p>
            <button
              onClick={() => onNavigateToTab('quick_practice')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform"
            >
              Start Speed Challenge Now ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

