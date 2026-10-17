import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Target, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle2, 
  Clock, 
  History, 
  RotateCcw, 
  BookOpen, 
  Bot, 
  ChevronRight, 
  Layers, 
  Award, 
  AlertTriangle,
  HelpCircle,
  Minimize2,
  Maximize2,
  X,
  Send,
  MessageSquare,
  FileText,
  Calculator,
  Network,
  FlaskConical,
  Zap,
  Trophy
} from 'lucide-react';
import { 
  TopicMasterySession, 
  TopicMasteryContext, 
  TopicMasteryStageId,
  TopicMasteryChatMessage
} from '../../types/topicMastery';
import { SyllabusTopic, MCQQuestion, SavedMistake, ExamAttempt } from '../../types';
import { PMDC_SYLLABUS_TOPICS } from '../../data/nmdcatData';
import { 
  getRelevantStagesForSubject, 
  getRecommendedNextStage, 
  calculateTopicMasteryScore,
  filterDatabaseMCQsForTopic
} from '../../utils/topicMasteryUtils';
import { 
  saveTopicMasterySession, 
  subscribeToUserTopicMasterySessions, 
  deleteTopicMasterySession 
} from '../../lib/firestoreService';
import type { User } from '../../lib/firebase';
import { FormattedMathContent } from '../FormattedMathContent';

// Components
import { TopicMasteryLauncher } from './TopicMasteryLauncher';
import { TopicMasteryHistory } from './TopicMasteryHistory';

// Stages
import { TutorStage } from './stages/TutorStage';
import { MindMapStage } from './stages/MindMapStage';
import { SmartNotesStage } from './stages/SmartNotesStage';
import { FormulasStage } from './stages/FormulasStage';
import { ReactionsStage } from './stages/ReactionsStage';
import { DefinitionsStage } from './stages/DefinitionsStage';
import { MnemonicsStage } from './stages/MnemonicsStage';
import { TrapsAndApplicationsStage } from './stages/TrapsAndApplicationsStage';
import { FlashcardsStage } from './stages/FlashcardsStage';
import { PracticeMCQStage } from './stages/PracticeMCQStage';
import { WeakAreaRepairStage } from './stages/WeakAreaRepairStage';
import { FinalTestStage } from './stages/FinalTestStage';

export interface TopicMasteryWorkspaceProps {
  firebaseUser?: User | null;
  topics?: SyllabusTopic[];
  questionBank?: MCQQuestion[];
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  onSignIn?: () => void;
  initialTopicContext?: TopicMasteryContext | null;
}

export const TopicMasteryWorkspace: React.FC<TopicMasteryWorkspaceProps> = ({
  firebaseUser,
  topics = PMDC_SYLLABUS_TOPICS,
  questionBank = [],
  savedMistakes = [],
  setSavedMistakes,
  onSignIn,
  initialTopicContext
}) => {
  // Navigation View State
  const [viewState, setViewState] = useState<'launcher' | 'workspace' | 'history'>('launcher');
  const [userSessions, setUserSessions] = useState<TopicMasterySession[]>([]);
  const [currentSession, setCurrentSession] = useState<TopicMasterySession | null>(null);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'fast_track' | 'focus'>('fast_track');

  // Floating AI Assistant Drawer
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [assistantQuestion, setAssistantQuestion] = useState<string>('');

  // Target stage requested by other stages (e.g. asking tutor from mindmap)
  const [initialTutorPrompt, setInitialTutorPrompt] = useState<string | undefined>(undefined);

  // Subscribe to user's persistent topic mastery sessions from Firestore / LocalStorage
  useEffect(() => {
    const userId = firebaseUser?.uid || 'anonymous_student';
    const unsubscribe = subscribeToUserTopicMasterySessions(userId, (sessions) => {
      setUserSessions(sessions);
    });
    return () => unsubscribe();
  }, [firebaseUser?.uid]);

  // Handle initial topic context if provided from outside
  useEffect(() => {
    if (initialTopicContext && viewState === 'launcher' && !currentSession) {
      handleStartNewSession(initialTopicContext);
    }
  }, [initialTopicContext]);

  // Autosave current session whenever it changes
  const saveSessionRef = useRef<(session: TopicMasterySession) => void>(() => {});
  saveSessionRef.current = (session: TopicMasterySession) => {
    if (!session) return;
    saveTopicMasterySession(session).catch(err => {
      console.warn('Auto-saving topic mastery session notice:', err);
    });
  };

  const updateSession = useCallback((updater: (prev: TopicMasterySession) => TopicMasterySession) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      const updated = updater(prev);
      saveSessionRef.current(updated);
      return updated;
    });
  }, []);

  // Handler: Start a brand new mastery session
  const handleStartNewSession = (context: TopicMasteryContext) => {
    const userId = firebaseUser?.uid || 'anonymous_student';
    const firstStage = getRelevantStagesForSubject(context.subjectName)[0]?.id || 'notes';
    const newSession: TopicMasterySession = {
      sessionId: context.sessionId || `tms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      subjectId: context.subjectId,
      chapterId: context.chapterId,
      topicId: context.topicId,
      subjectName: context.subjectName,
      chapterName: context.chapterName,
      topicName: context.topicName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'in_progress',
      currentStage: firstStage,
      completedStages: [],
      progress: 0,
      tutorConversation: [],
      mcqPerformance: [],
      flashcardPerformance: [],
      weakAreas: [],
      remediationHistory: [],
      masteryScore: 0,
      timeSpent: 0
    };

    setCurrentSession(newSession);
    setIsReviewMode(false);
    setViewMode('fast_track');
    setViewState('workspace');
    saveTopicMasterySession(newSession).catch(err => console.warn(err));
  };

  // Handler: Resume an unfinished session
  const handleResumeSession = (session: TopicMasterySession) => {
    setCurrentSession(session);
    setIsReviewMode(false);
    setViewState('workspace');
  };

  // Handler: Review an existing completed session
  const handleReviewSession = (session: TopicMasterySession) => {
    setCurrentSession(session);
    setIsReviewMode(true);
    setViewState('workspace');
  };

  // Handler: Practice Again (Creates a fresh new session for the same topic)
  const handlePracticeAgain = (session: TopicMasterySession) => {
    const context: TopicMasteryContext = {
      subjectId: session.subjectId,
      subjectName: session.subjectName,
      chapterId: session.chapterId,
      chapterName: session.chapterName,
      topicId: session.topicId,
      topicName: session.topicName,
      sessionId: `tms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    handleStartNewSession(context);
  };

  // Handler: Delete session
  const handleDeleteSession = async (sessionId: string) => {
    const userId = firebaseUser?.uid || 'anonymous_student';
    await deleteTopicMasterySession(userId, sessionId);
    if (currentSession?.sessionId === sessionId) {
      setCurrentSession(null);
      setViewState('launcher');
    }
  };

  // Handler: Change active stage
  const handleStageSelect = (stageId: TopicMasteryStageId) => {
    if (!currentSession) return;
    updateSession(prev => ({
      ...prev,
      currentStage: stageId,
      updatedAt: new Date().toISOString()
    }));
  };

  // Handler: Mark stage completed & advance or recommend
  const handleStageComplete = (completedStageId: TopicMasteryStageId) => {
    if (!currentSession) return;
    updateSession(prev => {
      const alreadyCompleted = prev.completedStages.includes(completedStageId);
      const newCompletedStages = alreadyCompleted
        ? prev.completedStages
        : [...prev.completedStages, completedStageId];

      const stages = getRelevantStagesForSubject(prev.subjectName);
      const nextStage = getRecommendedNextStage(prev.subjectName, newCompletedStages);

      const progress = Math.round((newCompletedStages.length / stages.length) * 100);
      const score = calculateTopicMasteryScore({
        ...prev,
        completedStages: newCompletedStages,
        progress
      });

      return {
        ...prev,
        completedStages: newCompletedStages,
        progress,
        masteryScore: score,
        updatedAt: new Date().toISOString()
      };
    });
  };

  // Handler: Cross-stage quick tutor prompt (e.g. clicking "Ask Tutor" in MindMap or WeakAreas)
  const handleAskTutor = (prompt: string) => {
    setInitialTutorPrompt(prompt);
    if (currentSession?.currentStage !== 'tutor') {
      handleStageSelect('tutor');
    }
    // Also scroll top if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic stages relevant for current subject
  const currentSubjectStages = useMemo(() => {
    if (!currentSession) return [];
    return getRelevantStagesForSubject(currentSession.subjectName);
  }, [currentSession?.subjectName]);

  const recommendedStage = useMemo(() => {
    if (!currentSession) return null;
    return getRecommendedNextStage(currentSession.subjectName, currentSession.completedStages);
  }, [currentSession?.subjectName, currentSession?.completedStages]);

  const activeMasteryScore = useMemo(() => {
    if (!currentSession) return 0;
    return calculateTopicMasteryScore(currentSession);
  }, [currentSession]);

  const currentStageIndex = useMemo(() => {
    if (!currentSession) return 0;
    const idx = currentSubjectStages.findIndex(s => s.id === currentSession.currentStage);
    return idx >= 0 ? idx : 0;
  }, [currentSubjectStages, currentSession?.currentStage]);

  const currentStageDef = currentSubjectStages[currentStageIndex];
  const prevStage = currentStageIndex > 0 ? currentSubjectStages[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < currentSubjectStages.length - 1 
    ? currentSubjectStages[currentStageIndex + 1] 
    : null;

  // Handler: Advance to next stage smoothly
  const handleAdvanceToNextStage = () => {
    if (!currentSession) return;
    handleStageComplete(currentSession.currentStage);

    if (nextStage) {
      handleStageSelect(nextStage.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoToPreviousStage = () => {
    if (!currentSession || !prevStage) return;
    handleStageSelect(prevStage.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkAllPreReadingsComplete = () => {
    if (!currentSession) return;
    const preReadingStageIds: TopicMasteryStageId[] = ['notes', 'formulas', 'reactions', 'definitions', 'traps', 'mnemonics', 'mindmap'];
    updateSession(prev => {
      const combined = Array.from(new Set([...prev.completedStages, ...preReadingStageIds]));
      const progress = Math.round((combined.length / currentSubjectStages.length) * 100);
      const score = calculateTopicMasteryScore({ ...prev, completedStages: combined, progress });
      return {
        ...prev,
        completedStages: combined,
        currentStage: 'mcqs',
        progress,
        masteryScore: score,
        updatedAt: new Date().toISOString()
      };
    });
    setViewMode('focus');
    handleStageSelect('mcqs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render Launcher View
  if (viewState === 'launcher') {
    return (
      <TopicMasteryLauncher
        topics={topics}
        onStartMastery={handleStartNewSession}
        inProgressSessions={userSessions}
        onResumeSession={handleResumeSession}
        onOpenHistory={() => setViewState('history')}
      />
    );
  }

  // Render History View
  if (viewState === 'history') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewState('launcher')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Topic Selector
          </button>
        </div>
        <TopicMasteryHistory
          sessions={userSessions}
          onResume={handleResumeSession}
          onReview={handleReviewSession}
          onPracticeAgain={handlePracticeAgain}
          onDelete={handleDeleteSession}
        />
      </div>
    );
  }

  // Render Main Workspace View
  if (!currentSession) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">No active topic mastery session.</p>
        <button
          onClick={() => setViewState('launcher')}
          className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm"
        >
          Select a Topic
        </button>
      </div>
    );
  }

  const topicContext: TopicMasteryContext = {
    subjectId: currentSession.subjectId,
    subjectName: currentSession.subjectName,
    chapterId: currentSession.chapterId,
    chapterName: currentSession.chapterName,
    topicId: currentSession.topicId,
    topicName: currentSession.topicName,
    sessionId: currentSession.sessionId
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-5 animate-in fade-in duration-300 relative">
      {/* Review Mode Banner */}
      {isReviewMode && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center gap-2.5 text-indigo-200">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
            <span>
              <strong className="font-bold text-white">Review Mode:</strong> You are viewing a completed historical attempt. Your changes will not overwrite past results.
            </span>
          </div>
          <button
            onClick={() => handlePracticeAgain(currentSession)}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Practice Again
          </button>
        </div>
      )}

      {/* Top Workspace Header Bar */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Topic Breadcrumb & Name */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
            <button
              onClick={() => setViewState('launcher')}
              className="hover:text-amber-400 transition-colors flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Topic Mastery
            </button>
            <span>/</span>
            <span className="font-bold text-indigo-400">{currentSession.subjectName}</span>
            <span>/</span>
            <span className="text-slate-300 truncate max-w-xs">{currentSession.chapterName}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>{currentSession.topicName}</span>
            {currentSession.status === 'completed' && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Mastered
              </span>
            )}
          </h1>
        </div>

        {/* Mastery Score & Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mastery Progress Card */}
          <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Mastery Score</span>
              <span className={`text-base font-extrabold ${activeMasteryScore >= 80 ? 'text-emerald-400' : activeMasteryScore >= 60 ? 'text-amber-400' : 'text-slate-300'}`}>
                {activeMasteryScore}%
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Quick Buttons */}
          <button
            onClick={() => setViewState('history')}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Session History"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => handlePracticeAgain(currentSession)}
            className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restart Topic from scratch"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Practice Again</span>
          </button>
        </div>
      </div>

      {/* Study Mode Selector & Rapid Jump Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('fast_track')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'fast_track'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast-Track Flow (All-in-One)</span>
          </button>

          <button
            onClick={() => setViewMode('focus')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'focus'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Step-by-Step Focus</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllPreReadingsComplete}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Mark theory as reviewed and jump straight into MCQs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Skip to Practice MCQs ⚡</span>
          </button>
        </div>
      </div>

      {viewMode === 'fast_track' ? (
        /* FAST-TRACK CONTINUOUS FLOW (Zero-click comprehensive study stream) */
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Quick Nav Anchors Bar */}
          <div className="sticky top-2 z-30 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider px-2">Jump To:</span>
              <button
                onClick={() => document.getElementById('ft-notes')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>1. Summary</span>
              </button>
              <button
                onClick={() => document.getElementById('ft-fundamentals')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Key Equations & Traps</span>
              </button>
              <button
                onClick={() => document.getElementById('ft-mindmap')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>3. Mind Map</span>
              </button>
              <button
                onClick={() => document.getElementById('ft-practice')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>4. Drills & Exam</span>
              </button>
            </div>
          </div>

          {/* Section 1: Smart Notes & High-Yield Summary */}
          <div id="ft-notes" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold text-xs flex items-center justify-center">1</span>
                <h3 className="text-base font-bold text-white">Smart Notes & High-Yield Summary</h3>
              </div>
              <button
                onClick={() => handleStageComplete('notes')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  currentSession.completedStages.includes('notes')
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentSession.completedStages.includes('notes') ? 'Completed' : 'Mark Done'}
              </button>
            </div>
            <SmartNotesStage
              context={topicContext}
              onAskTutor={handleAskTutor}
              isCompleted={currentSession.completedStages.includes('notes')}
              onToggleComplete={() => handleStageComplete('notes')}
              onNavigateStage={handleStageSelect}
            />
          </div>

          {/* Section 2: Subject-Specific Fundamentals */}
          <div id="ft-fundamentals" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center">2</span>
                <h3 className="text-base font-bold text-white">
                  {currentSession.subjectName === 'Physics' ? 'Formulas, Units & Exam Traps' :
                   currentSession.subjectName === 'Chemistry' ? 'Reactions, Formulas & Traps' :
                   currentSession.subjectName === 'Biology' ? 'Key Terms, Traps & Mnemonics' :
                   'Rules, Traps & Distractors'}
                </h3>
              </div>
            </div>

            {currentSession.subjectName === 'Physics' && (
              <div className="space-y-6">
                <FormulasStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('formulas')}
                  onToggleComplete={() => handleStageComplete('formulas')}
                  onNavigateStage={handleStageSelect}
                />
                <TrapsAndApplicationsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('traps')}
                  onToggleComplete={() => handleStageComplete('traps')}
                  onNavigateStage={handleStageSelect}
                />
              </div>
            )}

            {currentSession.subjectName === 'Chemistry' && (
              <div className="space-y-6">
                <ReactionsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('reactions')}
                  onToggleComplete={() => handleStageComplete('reactions')}
                  onNavigateStage={handleStageSelect}
                />
                <FormulasStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('formulas')}
                  onToggleComplete={() => handleStageComplete('formulas')}
                  onNavigateStage={handleStageSelect}
                />
                <TrapsAndApplicationsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('traps')}
                  onToggleComplete={() => handleStageComplete('traps')}
                  onNavigateStage={handleStageSelect}
                />
              </div>
            )}

            {currentSession.subjectName === 'Biology' && (
              <div className="space-y-6">
                <DefinitionsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('definitions')}
                  onToggleComplete={() => handleStageComplete('definitions')}
                  onNavigateStage={handleStageSelect}
                />
                <TrapsAndApplicationsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('traps')}
                  onToggleComplete={() => handleStageComplete('traps')}
                  onNavigateStage={handleStageSelect}
                />
                <MnemonicsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('mnemonics')}
                  onToggleComplete={() => handleStageComplete('mnemonics')}
                  onNavigateStage={handleStageSelect}
                />
              </div>
            )}

            {(currentSession.subjectName === 'English' || currentSession.subjectName === 'Logical Reasoning') && (
              <div className="space-y-6">
                {currentSession.subjectName === 'English' && (
                  <DefinitionsStage
                    context={topicContext}
                    onAskTutor={handleAskTutor}
                    isCompleted={currentSession.completedStages.includes('definitions')}
                    onToggleComplete={() => handleStageComplete('definitions')}
                    onNavigateStage={handleStageSelect}
                  />
                )}
                <TrapsAndApplicationsStage
                  context={topicContext}
                  onAskTutor={handleAskTutor}
                  isCompleted={currentSession.completedStages.includes('traps')}
                  onToggleComplete={() => handleStageComplete('traps')}
                  onNavigateStage={handleStageSelect}
                />
              </div>
            )}
          </div>

          {/* Section 3: Visual Concept Mind Map */}
          <div id="ft-mindmap" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center justify-center">3</span>
                <h3 className="text-base font-bold text-white">Visual Concept Mind Map</h3>
              </div>
              <button
                onClick={() => handleStageComplete('mindmap')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  currentSession.completedStages.includes('mindmap')
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentSession.completedStages.includes('mindmap') ? 'Completed' : 'Mark Done'}
              </button>
            </div>
            <MindMapStage
              context={topicContext}
              onAskTutor={handleAskTutor}
              isCompleted={currentSession.completedStages.includes('mindmap')}
              onToggleComplete={() => handleStageComplete('mindmap')}
            />
          </div>

          {/* Section 4: Interactive Drills & Testing Dashboard */}
          <div id="ft-practice" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center">4</span>
                <h3 className="text-base font-bold text-white">Practice Drills & Final Certification</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Practice MCQs */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Practice MCQs Drill</h4>
                      <p className="text-xs text-slate-400">PMDC Past Papers + AI Generation</p>
                    </div>
                  </div>
                  {currentSession.completedStages.includes('mcqs') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Solve topic MCQs with instant explanations, distractor analysis, and automatic mistake vault integration.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400 font-semibold">
                    {(currentSession.mcqPerformance || []).length} questions attempted
                  </span>
                  <button
                    onClick={() => {
                      setViewMode('focus');
                      handleStageSelect('mcqs');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <span>Start Practice MCQs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2: Flashcards */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Active Recall Flashcards</h4>
                      <p className="text-xs text-slate-400">Spaced Repetition Flashcards</p>
                    </div>
                  </div>
                  {currentSession.completedStages.includes('flashcards') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reinforce terms, definitions, and values with 3D active recall flip cards.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400 font-semibold">
                    {(currentSession.flashcardPerformance || []).length} cards reviewed
                  </span>
                  <button
                    onClick={() => {
                      setViewMode('focus');
                      handleStageSelect('flashcards');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <span>Start Flashcards</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 3: AI Medical Tutor */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Medical Tutor</h4>
                      <p className="text-xs text-slate-400">Interactive Socratic Dialogue & Q&A</p>
                    </div>
                  </div>
                  {currentSession.completedStages.includes('tutor') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Clarify any doubt, request analogies, or drill high-yield clinical correlations with the dedicated tutor.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400 font-semibold">
                    {(currentSession.tutorConversation || []).length} messages exchanged
                  </span>
                  <button
                    onClick={() => {
                      setViewMode('focus');
                      handleStageSelect('tutor');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <span>Chat with Tutor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 4: Final Timed Mastery Test */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Final Timed Mastery Test</h4>
                      <p className="text-xs text-slate-400">10 Questions • 80% Required for Badge</p>
                    </div>
                  </div>
                  {currentSession.completedStages.includes('final_test') && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Demonstrate complete mastery under timed exam conditions. Score ≥ 80% to earn your verified badge.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-amber-400 font-bold">
                    {currentSession.finalTestResult ? `${currentSession.finalTestResult.percentage}% Score` : 'Not attempted yet'}
                  </span>
                  <button
                    onClick={() => {
                      setViewMode('focus');
                      handleStageSelect('final_test');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    <span>Take Final Test</span>
                    <Trophy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP-BY-STEP FOCUS VIEW WITH PERSISTENT PROGRESSION BAR */
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Non-Linear Learning Stage Tabs */}
          <div className="bg-slate-900/60 p-2 rounded-2xl border border-slate-800/80 shadow-md">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {currentSubjectStages.map((stage, idx) => {
                const Icon = stage.icon || Layers;
                const isActive = currentSession.currentStage === stage.id;
                const isCompleted = currentSession.completedStages.includes(stage.id);
                const isRecommended = recommendedStage === stage.id && !isCompleted;

                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageSelect(stage.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : isCompleted
                        ? 'bg-slate-800/90 text-emerald-300 border border-emerald-500/30 hover:bg-slate-800'
                        : isRecommended
                        ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-500/50 hover:bg-indigo-900/60'
                        : 'bg-slate-900/40 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isActive ? 'bg-slate-950 text-amber-400' : isCompleted ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span>{stage.shortLabel || stage.label}</span>

                    {isCompleted && (
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                    )}

                    {isRecommended && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Active Stage Component Container */}
          <div className="min-h-[500px]">
            {currentSession.currentStage === 'notes' && (
              <SmartNotesStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('notes')}
                onToggleComplete={() => handleStageComplete('notes')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'formulas' && (
              <FormulasStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('formulas')}
                onToggleComplete={() => handleStageComplete('formulas')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'reactions' && (
              <ReactionsStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('reactions')}
                onToggleComplete={() => handleStageComplete('reactions')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'definitions' && (
              <DefinitionsStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('definitions')}
                onToggleComplete={() => handleStageComplete('definitions')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'mnemonics' && (
              <MnemonicsStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('mnemonics')}
                onToggleComplete={() => handleStageComplete('mnemonics')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'traps' && (
              <TrapsAndApplicationsStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('traps')}
                onToggleComplete={() => handleStageComplete('traps')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'mindmap' && (
              <MindMapStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('mindmap')}
                onToggleComplete={() => handleStageComplete('mindmap')}
              />
            )}

            {currentSession.currentStage === 'mcqs' && (
              <PracticeMCQStage
                context={topicContext}
                questionBank={questionBank}
                savedMistakes={savedMistakes}
                setSavedMistakes={setSavedMistakes}
                mcqResults={currentSession.mcqPerformance || []}
                onUpdateResults={(results) => updateSession(prev => ({ ...prev, mcqPerformance: results }))}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('mcqs')}
                onToggleComplete={() => handleStageComplete('mcqs')}
                onNavigateStage={handleStageSelect}
              />
            )}

            {currentSession.currentStage === 'flashcards' && (
              <FlashcardsStage
                context={topicContext}
                onAskTutor={handleAskTutor}
                flashcardResults={currentSession.flashcardPerformance || []}
                onUpdateResults={(results) => updateSession(prev => ({ ...prev, flashcardPerformance: results }))}
                isCompleted={currentSession.completedStages.includes('flashcards')}
                onToggleComplete={() => handleStageComplete('flashcards')}
              />
            )}

            {currentSession.currentStage === 'weak_areas' && (
              <WeakAreaRepairStage
                context={topicContext}
                mcqResults={currentSession.mcqPerformance || []}
                flashcardResults={currentSession.flashcardPerformance || []}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('weak_areas')}
                onToggleComplete={() => handleStageComplete('weak_areas')}
              />
            )}

            {currentSession.currentStage === 'tutor' && (
              <TutorStage
                context={topicContext}
                messages={currentSession.tutorConversation}
                onUpdateMessages={(msgs) => updateSession(prev => ({ ...prev, tutorConversation: msgs }))}
                onAskTutor={handleAskTutor}
                isCompleted={currentSession.completedStages.includes('tutor')}
                onToggleComplete={() => handleStageComplete('tutor')}
                initialPrompt={initialTutorPrompt}
                onClearExternalPrompt={() => setInitialTutorPrompt(undefined)}
              />
            )}

            {currentSession.currentStage === 'final_test' && (
              <FinalTestStage
                context={topicContext}
                questionBank={questionBank}
                finalTestResult={currentSession.finalTestResult}
                onCompleteTest={(result) => {
                  updateSession(prev => ({
                    ...prev,
                    finalTestResult: result,
                    status: 'completed',
                    completedStages: prev.completedStages.includes('final_test')
                      ? prev.completedStages
                      : [...prev.completedStages, 'final_test']
                  }));
                  handleStageComplete('final_test');
                }}
                onAskTutor={handleAskTutor}
                onPracticeAgain={() => handlePracticeAgain(currentSession)}
              />
            )}
          </div>

          {/* Sticky Persistent Stage Bottom Navigation Bar */}
          <div className="sticky bottom-4 z-30 mt-6 p-4 rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={handleGoToPreviousStage}
                disabled={currentStageIndex <= 0}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous: {prevStage?.shortLabel || 'Back'}</span>
                <span className="sm:hidden">Back</span>
              </button>

              <button
                onClick={() => handleStageComplete(currentSession.currentStage)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  currentSession.completedStages.includes(currentSession.currentStage)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentSession.completedStages.includes(currentSession.currentStage) ? 'Done ✓' : 'Mark Done'}</span>
              </button>
            </div>

            <div className="text-center hidden md:block">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Step {currentStageIndex + 1} of {currentSubjectStages.length}
              </span>
              <span className="text-xs font-extrabold text-white">
                {currentStageDef?.label}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {nextStage ? (
                <button
                  onClick={handleAdvanceToNextStage}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Continue to {nextStage.shortLabel}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setViewMode('fast_track');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Topic Completed • View All</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Tutor Quick Assistant Button & Drawer (Available anywhere in workspace) */}
      {currentSession.currentStage !== 'tutor' && (
        <>
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="p-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-2xl shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Bot className="w-5 h-5 text-slate-950" />
              <span className="text-xs font-extrabold hidden md:inline">Ask AI Tutor</span>
            </button>
          </div>

          {isAssistantOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Ask Tutor about this Topic</h4>
                      <p className="text-[11px] text-slate-400 truncate">{currentSession.topicName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAssistantOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    What question do you have about this concept?
                  </label>
                  <textarea
                    value={assistantQuestion}
                    onChange={e => setAssistantQuestion(e.target.value)}
                    placeholder={`e.g. Can you explain the key trap in ${currentSession.topicName}?`}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsAssistantOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!assistantQuestion.trim()) return;
                      setIsAssistantOpen(false);
                      handleAskTutor(assistantQuestion.trim());
                      setAssistantQuestion('');
                    }}
                    disabled={!assistantQuestion.trim()}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send to AI Tutor
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TopicMasteryWorkspace;

