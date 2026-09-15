import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, NAV_CATEGORIES } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RightSidebar } from './components/RightSidebar';
import { UniversalSearchModal } from './components/UniversalSearchModal';
import { QuickActionFAB } from './components/QuickActionFAB';
import { BottomMobileNav } from './components/BottomMobileNav';

import { Dashboard } from './components/Dashboard';
import { LearnWorkspace } from './components/LearnWorkspace';
import { PracticeWorkspace } from './components/PracticeWorkspace';
import { ResourceWorkspace } from './components/ResourceWorkspace';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { InsightsWorkspace } from './components/InsightsWorkspace';
import { AIWorkspace } from './components/AIWorkspace';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { AdminPlatformSuite } from './components/AdminPlatformSuite';
import { SimpleAiQuizGenerator } from './components/SimpleAiQuizGenerator';
import { PrismWorkspace } from './components/prism/PrismWorkspace';

import type { User } from './lib/firebase';

import {
  PMDC_SYLLABUS_TOPICS
} from './data/nmdcatData';
import {
  SyllabusTopic,
  MCQQuestion,
  ExamAttempt,
  SavedMistake,
  DailyTarget,
  SubjectType
} from './types';

import NMDCAT_CONFIG from './constants/nmdcatConfig';

import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged
} from './lib/firebase';
import {
  saveUserProfile,
  getUserProfile,
  initializeUserTopics,
  subscribeToUserTopics,
  saveTopicStatusToFirestore,
  subscribeToSavedMistakes,
  saveMistakeToFirestore,
  subscribeToExamAttempts,
  saveExamAttemptToFirestore,
  subscribeToDailyTargets,
  saveDailyTargetToFirestore
} from './lib/firestoreService';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setFirebaseUser(usr);
        const profile = await getUserProfile(usr.uid);
        if (profile) {
          if (profile.userName) setUserName(profile.userName);
          if (profile.examDate) setExamDate(profile.examDate);
          if (typeof profile.targetScore === 'number') setTargetScore(profile.targetScore);
        }
      } else {
        setFirebaseUser(null);
        // Seamless anonymous fallback so that Firestore persistence is active immediately
        signInAnonymously(auth).catch((err) => {
          console.info('Anonymous authentication notice:', err?.message || err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('nmdcat_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('nmdcat_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const defaultUserName = 'NMDCAT Aspirant';
  const defaultExamDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);

  const [userName, setUserName] = useState<string>(() => {
    const saved = localStorage.getItem('nmdcat_user_name');
    return saved || defaultUserName;
  });

  const [examDate, setExamDate] = useState<string>(() => {
    const saved = localStorage.getItem('nmdcat_exam_date');
    return saved || defaultExamDate;
  });

  const [targetScore, setTargetScore] = useState<number>(() => {
    const saved = localStorage.getItem('nmdcat_target_score');
    return saved ? parseInt(saved, 10) || NMDCAT_CONFIG.TOTAL_MCQS : NMDCAT_CONFIG.TOTAL_MCQS;
  });

  useEffect(() => {
    localStorage.setItem('nmdcat_user_name', userName);
    localStorage.setItem('nmdcat_exam_date', examDate);
    localStorage.setItem('nmdcat_target_score', String(targetScore));

    if (firebaseUser) {
      saveUserProfile(firebaseUser.uid, { userName, examDate, targetScore, email: firebaseUser.email || undefined });
    }
  }, [userName, examDate, targetScore, firebaseUser]);

  const targetExamDate = new Date(examDate + 'T00:00:00');
  const today = new Date();
  const diffTime = targetExamDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const [topics, setTopics] = useState<SyllabusTopic[]>(() => {
    const saved = localStorage.getItem('nmdcat_topics');
    return saved ? JSON.parse(saved) : PMDC_SYLLABUS_TOPICS;
  });

  const initialTopicSeed = useRef<SyllabusTopic[]>(topics);
  const previousTopics = useRef<SyllabusTopic[]>([]);
  const isRemoteTopicsUpdate = useRef(false);

  useEffect(() => {
    if (previousTopics.current.length === 0) {
      previousTopics.current = topics;
    }
  }, [topics]);

  const [questionBank, setQuestionBank] = useState<MCQQuestion[]>(() => {
    const saved = localStorage.getItem('nmdcat_qbank');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedMistakes, setSavedMistakes] = useState<SavedMistake[]>(() => {
    const saved = localStorage.getItem('nmdcat_mistakes');
    return saved ? JSON.parse(saved) : [];
  });

  const [examHistory, setExamHistory] = useState<ExamAttempt[]>(() => {
    const saved = localStorage.getItem('nmdcat_exam_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyTargets, setDailyTargets] = useState<DailyTarget[]>(() => {
    const saved = localStorage.getItem('nmdcat_daily_targets');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (!firebaseUser) return;

    initializeUserTopics(firebaseUser.uid, initialTopicSeed.current, PMDC_SYLLABUS_TOPICS).catch(() => {
      // initialization errors are logged inside firestoreService
    });

    const unsubTopics = subscribeToUserTopics(firebaseUser.uid, (remoteTopics) => {
      isRemoteTopicsUpdate.current = true;
      previousTopics.current = remoteTopics;
      setTopics(remoteTopics);
    });

    const unsubMistakes = subscribeToSavedMistakes(firebaseUser.uid, (remoteMistakes) => {
      setSavedMistakes(remoteMistakes);
    });

    const unsubAttempts = subscribeToExamAttempts(firebaseUser.uid, (remoteAttempts) => {
      setExamHistory(remoteAttempts);
    });

    const unsubTargets = subscribeToDailyTargets(firebaseUser.uid, (remoteTargets) => {
      setDailyTargets(remoteTargets);
    });

    return () => {
      unsubTopics();
      unsubMistakes();
      unsubAttempts();
      unsubTargets();
    };
  }, [firebaseUser]);

  const [drillSubject, setDrillSubject] = useState<SubjectType>('Biology');
  const [drillTopic, setDrillTopic] = useState<string | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('nmdcat_topics', JSON.stringify(topics));

    if (!firebaseUser) return;
    if (isRemoteTopicsUpdate.current) {
      isRemoteTopicsUpdate.current = false;
      return;
    }

    const previous = previousTopics.current;
    previousTopics.current = topics;

    if (!previous.length) {
      return;
    }

    topics.forEach((topic: SyllabusTopic) => {
      const matching = previous.find((prev: SyllabusTopic) => prev.id === topic.id);
      if (!matching || matching.status !== topic.status) {
        saveTopicStatusToFirestore(firebaseUser.uid, topic).catch(() => {
          console.warn('Topic persistence failed for topic', topic.id);
        });
      }
    });
  }, [topics, firebaseUser]);

  useEffect(() => {
    localStorage.setItem('nmdcat_mistakes', JSON.stringify(savedMistakes));
  }, [savedMistakes]);

  useEffect(() => {
    localStorage.setItem('nmdcat_exam_history', JSON.stringify(examHistory));
  }, [examHistory]);

  useEffect(() => {
    localStorage.setItem('nmdcat_daily_targets', JSON.stringify(dailyTargets));
  }, [dailyTargets]);

  // Authentication handlers with developer-friendly error reporting
  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || err?.name || 'unknown_error';
      const message = err?.message || String(err);
      console.error(`[FirebaseAuth] Google sign-in failed (${code}):`, message, err);

      // Do not alert if user simply closed the popup window
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.info('[FirebaseAuth] Sign-in popup was closed by the user.');
        return;
      }

      if (code === 'auth/popup-blocked') {
        alert('Google sign-in popup was blocked by your browser. Please allow popups for localhost:3000 to sign in.');
        return;
      }

      if (code === 'auth/unauthorized-domain') {
        alert(`Google sign-in error: The domain "${window.location.hostname}" is not authorized in Firebase Console. Add it to Authorized Domains under Firebase Auth Settings.`);
        return;
      }

      alert(`Google sign-in failed (${code}): ${message}\n\nCheck browser console for full error details.`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out failed:', err);
      const code = err?.code || err?.name || 'unknown_error';
      const message = err?.message || String(err);
      alert(`Sign-out failed (${code}): ${message}\n\nCheck console for full error details.`);
    }
  };

  const handleSetExamHistory = (newHistory: ExamAttempt[] | ((prev: ExamAttempt[]) => ExamAttempt[])) => {
    setExamHistory((prev: ExamAttempt[]) => {
      const updated = typeof newHistory === 'function' ? newHistory(prev) : newHistory;
      if (firebaseUser && updated.length > 0) {
        saveExamAttemptToFirestore(firebaseUser.uid, updated[0]);
      }
      return updated;
    });
  };

  const handleSetSavedMistakes = (newMistakes: SavedMistake[] | ((prev: SavedMistake[]) => SavedMistake[])) => {
    setSavedMistakes((prev: SavedMistake[]) => {
      const updated = typeof newMistakes === 'function' ? newMistakes(prev) : newMistakes;
      if (firebaseUser) {
        updated.forEach((m: SavedMistake) => saveMistakeToFirestore(firebaseUser.uid, m));
      }
      return updated;
    });
  };

  const handleSetDailyTargets = (newTargets: DailyTarget[] | ((prev: DailyTarget[]) => DailyTarget[])) => {
    setDailyTargets((prev: DailyTarget[]) => {
      const updated = typeof newTargets === 'function' ? newTargets(prev) : newTargets;
      if (firebaseUser) {
        updated.forEach((t: DailyTarget) => saveDailyTargetToFirestore(firebaseUser.uid, t));
      }
      return updated;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApproveStagedMcq = (newMcq: MCQQuestion) => {
    setQuestionBank((prev: MCQQuestion[]) => [newMcq, ...prev]);
  };

  const getTabInfo = (tabId: string) => {
    for (const cat of NAV_CATEGORIES) {
      const found = cat.items.find(item => item.id === tabId);
      if (found) {
        return { category: cat.label, title: found.label };
      }
    }

    const fallbackMap: Record<string, { category: string; title: string }> = {
      learn: { category: 'LEARNING', title: 'Learn' },
      practice: { category: 'PRACTICE', title: 'Practice' },
      review: { category: 'REVIEW', title: 'Review' },
      progress: { category: 'PROGRESS', title: 'Progress' },
      ai: { category: 'AI WORKSPACE', title: 'AI Workspace' },
      resources: { category: 'RESOURCES', title: 'Resources' },
      settings: { category: 'ACCOUNT', title: 'Settings' },
      quick_practice: { category: 'PRACTICE', title: 'Practice Drill' },
      mock: { category: 'PRACTICE', title: 'Mock Exam' },
      aitutor: { category: 'LEARN', title: 'AI Tutor' },
      mistakes: { category: 'REVIEW', title: 'Mistake Book' },
      flashcards: { category: 'RESOURCES', title: 'Flashcards' },
      srs: { category: 'REVIEW', title: 'SRS Review' },
      simple_ai_quiz: { category: 'AI WORKSPACE', title: 'AI Quiz Generator' },
      prism: { category: 'RESOURCES', title: 'PRISM Engine' }
    };

    return fallbackMap[tabId] || { category: 'HOME', title: 'Dashboard' };
  };

  const currentTabInfo = getTabInfo(activeTab);

  const isLearnGroup = ['learn', 'sequential_practice', 'study_plan', 'learning_paths', 'ai_tutor', 'aitutor'].includes(activeTab);
  const isPracticeGroup = ['practice', 'quick_practice', 'custom_builder', 'mock_exams', 'past_papers', 'challenge_mode', 'mock'].includes(activeTab);
  const isResourceGroup = ['resources', 'notes', 'flashcards', 'formula_lib', 'reaction_lib', 'definitions', 'mind_maps', 'mnemonics', 'knowledge_graph', 'vault'].includes(activeTab);
  const isReviewGroup = ['review', 'mistake_book', 'weak_topics', 'bookmarks', 'srs_review', 'incorrect_qs', 'revision_queue', 'mistakes', 'srs', 'adaptive'].includes(activeTab);
  const isInsightsGroup = ['progress', 'performance_dash', 'subject_analytics', 'achievements', 'study_streak', 'ai_insights', 'rewards', 'ecosystem', 'productivity'].includes(activeTab);
  const isAIGroup = ['ai', 'ai_chat', 'ai_strategy', 'ai_recommendations', 'ai_question_gen', 'ai_study_planner', 'advanced_ai', 'studio'].includes(activeTab);
  const isSettingsGroup = ['settings', 'profile', 'downloads', 'offline_content', 'preferences', 'help', 'feedback', 'logout', 'content_pipeline'].includes(activeTab);

  if (activeTab === 'admin' || activeTab === 'admin_suite') {
    return (
      <AdminPlatformSuite
        onReturnToStudentApp={() => setActiveTab('dashboard')}
        currentUser={firebaseUser}
        userName={userName}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 flex flex-col ${
      isDarkMode
        ? 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950'
        : 'bg-slate-100 text-slate-900 selection:bg-emerald-500 selection:text-white'
    }`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        daysRemaining={daysRemaining}
        userName={userName}
        examHistory={examHistory}
        savedMistakes={savedMistakes}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        <TopBar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileMenu={() => setIsMobileOpen(prev => !prev)}
          activeTabTitle={currentTabInfo.title}
          activeTabCategory={currentTabInfo.category}
          userName={userName}
          userEmail={firebaseUser?.email ?? undefined}
          userPhotoUrl={firebaseUser?.photoURL || undefined}
          isFirebaseAuthenticated={!!firebaseUser}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOut}
          onNavigateToTab={setActiveTab}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(prev => !prev)}
          examHistory={examHistory}
          savedMistakes={savedMistakes}
          daysRemaining={daysRemaining}
        />

        <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-8">
          <main className="flex-1 min-w-0 pb-20 lg:pb-12">
            {(activeTab === 'dashboard' || activeTab === 'continue_learning' || activeTab === 'todays_plan' || activeTab === 'notifications') && (
              <Dashboard
                topics={topics}
                examHistory={examHistory}
                savedMistakes={savedMistakes}
                dailyTargets={dailyTargets}
                setDailyTargets={handleSetDailyTargets}
                setActiveTab={setActiveTab}
                daysRemaining={daysRemaining}
                userName={userName}
                setUserName={setUserName}
                examDate={examDate}
                setExamDate={setExamDate}
                targetScore={targetScore}
              />
            )}

            {isLearnGroup && (
              <LearnWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                questionBank={questionBank}
                topics={topics}
                dailyTargets={dailyTargets}
                setDailyTargets={handleSetDailyTargets}
                daysRemaining={daysRemaining}
                savedMistakes={savedMistakes}
                examHistory={examHistory}
              />
            )}

            {isPracticeGroup && (
              <PracticeWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                questionBank={questionBank}
                savedMistakes={savedMistakes}
                setSavedMistakes={handleSetSavedMistakes}
                examHistory={examHistory}
                setExamHistory={handleSetExamHistory}
                topics={topics}
                drillSubject={drillSubject}
                drillTopic={drillTopic}
                setDailyTargets={handleSetDailyTargets}
              />
            )}

            {isResourceGroup && (
              <ResourceWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                firebaseUser={firebaseUser}
                onSignInGoogle={handleSignInGoogle}
                savedMistakes={savedMistakes}
                setSavedMistakes={handleSetSavedMistakes}
                setExamHistory={handleSetExamHistory}
              />
            )}

            {isReviewGroup && (
              <ReviewWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                savedMistakes={savedMistakes}
                setSavedMistakes={handleSetSavedMistakes}
                questionBank={questionBank}
                setDailyTargets={handleSetDailyTargets}
                topics={topics}
              />
            )}

            {isInsightsGroup && (
              <InsightsWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                examHistory={examHistory}
                topics={topics}
              />
            )}

            {activeTab === 'simple_ai_quiz' && (
              <SimpleAiQuizGenerator
                savedMistakes={savedMistakes}
                setSavedMistakes={handleSetSavedMistakes}
                firebaseUser={firebaseUser}
                setExamHistory={handleSetExamHistory}
                onSignIn={handleSignInGoogle}
              />
            )}

            {activeTab === 'prism' && (
              <PrismWorkspace
                firebaseUser={firebaseUser}
                onSignIn={handleSignInGoogle}
                savedMistakes={savedMistakes}
                setSavedMistakes={handleSetSavedMistakes}
                setExamHistory={handleSetExamHistory}
              />
            )}

            {isAIGroup && (
              <AIWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                onApproveStagedMcq={handleApproveStagedMcq}
                topics={topics}
                savedMistakes={savedMistakes}
                setSavedMistakes={handleSetSavedMistakes}
                examHistory={examHistory}
                setExamHistory={handleSetExamHistory}
                dailyTargets={dailyTargets}
                setDailyTargets={handleSetDailyTargets}
                daysRemaining={daysRemaining}
              />
            )}

            {isSettingsGroup && (
              <SettingsWorkspace
                activeSubTab={activeTab}
                onNavigateToTab={setActiveTab}
                userName={userName}
                setUserName={setUserName}
                examDate={examDate}
                setExamDate={setExamDate}
                targetScore={targetScore}
                setTargetScore={setTargetScore}
                userEmail={firebaseUser?.email ?? undefined}
                daysRemaining={daysRemaining}
              />
            )}
          </main>

          <RightSidebar
            onNavigateToTab={setActiveTab}
            examHistory={examHistory}
            savedMistakes={savedMistakes}
            topics={topics}
            daysRemaining={daysRemaining}
          />
        </div>
      </div>

      <QuickActionFAB
        onNavigateToTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <BottomMobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(tabId) => setActiveTab(tabId)}
      />
    </div>
  );
}
