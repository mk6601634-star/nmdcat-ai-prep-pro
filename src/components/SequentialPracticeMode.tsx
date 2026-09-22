import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  BookOpen, 
  BrainCircuit, 
  Layers, 
  Award, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  Star, 
  Flame, 
  Zap, 
  ShieldCheck, 
  Target, 
  HelpCircle, 
  FileText, 
  Atom, 
  BarChart2, 
  Bookmark, 
  Unlock, 
  Sliders, 
  Clock, 
  CheckSquare, 
  RefreshCw,
  Trophy,
  Compass,
  AlertCircle
} from 'lucide-react';
import { MCQQuestion, SubjectType } from '../types';
import { matchQuestionsFromBank } from '../utils/topicMatcher';
import { FormattedMathContent } from './FormattedMathContent';

interface SequentialPracticeModeProps {
  questionBank: MCQQuestion[];
  onCompleteObjective?: (objectiveId: string, score: number) => void;
  onNavigateToTab?: (tab: string) => void;
}

export type MasteryLevel = 'Not Started' | 'Learning' | 'Practicing' | 'Proficient' | 'Mastered' | 'Expert';

export interface LearningObjectiveNode {
  id: string;
  unit: string;
  chapter: string;
  topic: string;
  subtopic: string;
  objectiveTitle: string;
  status: 'Completed' | 'Current' | 'Locked';
  masteryLevel: MasteryLevel;
  accuracy: number;
  highYieldTag: string;
  notesSummary: string;
  keyFormula: string;
  flashcardCount: number;
  mcqCount: number;
}

// Comprehensive PMDC Sequential Learning Path Taxonomy
const SEQUENTIAL_SYLLABUS_TREE: Record<SubjectType, {
  unitName: string;
  chapters: {
    chapterTitle: string;
    objectives: LearningObjectiveNode[];
  }[];
}[]> = {
  Biology: [
    {
      unitName: 'Unit 1: Cell Structure & Function',
      chapters: [
        {
          chapterTitle: 'Cell Biology & Organelles',
          objectives: [
            {
              id: 'bio_obj_1',
              unit: 'Unit 1: Cell Structure & Function',
              chapter: 'Cell Biology & Organelles',
              topic: 'Cell Organelles',
              subtopic: 'Endomembrane System',
              objectiveTitle: 'Explain the structure and role of Endoplasmic Reticulum and Golgi Apparatus in protein sorting',
              status: 'Current',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'PMDC 2023 / UHS Top Yield',
              notesSummary: 'Rough ER contains 80S ribosomes for secretory protein synthesis. Cis-face of Golgi receives transport vesicles, trans-face releases secretory vesicles.',
              keyFormula: 'Endomembrane Flow: RER → Transport Vesicle → Cis-Golgi → Trans-Golgi → Plasma Membrane',
              flashcardCount: 6,
              mcqCount: 10
            },
            {
              id: 'bio_obj_2',
              unit: 'Unit 1: Cell Structure & Function',
              chapter: 'Cell Biology & Organelles',
              topic: 'Lysosomes & Peroxisomes',
              subtopic: 'Autophagy & Suicide Bags',
              objectiveTitle: 'Analyze hydrolytic enzyme regulation in Lysosomes and Tay-Sachs lysosomal storage disease',
              status: 'Locked',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'UHS Past Paper',
              notesSummary: 'Lysosomes contain acidic hydrolases operating at pH 4.5-5.0 maintained by V-type H+ ATPase pumps. Deficiency of Hexosaminidase A leads to GM2 ganglioside accumulation.',
              keyFormula: 'Lysosomal pH = 4.8 (Active Hydrolases vs Cytosolic pH 7.2)',
              flashcardCount: 5,
              mcqCount: 8
            },
            {
              id: 'bio_obj_3',
              unit: 'Unit 1: Cell Structure & Function',
              chapter: 'Cell Biology & Organelles',
              topic: 'Cytoskeleton',
              subtopic: 'Microtubules & Motors',
              objectiveTitle: 'Compare Dynein vs Kinesin retrograde and anterograde axonal transport on microtubule tracks',
              status: 'Locked',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'KMU / SZABMU Pattern',
              notesSummary: 'Kinesin moves anterograde towards (+) end. Dynein moves retrograde towards (-) end attached to MTOC.',
              keyFormula: 'Kinesin = (+) End / Dynein = (-) End (MTOC Centrosome)',
              flashcardCount: 4,
              mcqCount: 7
            }
          ]
        }
      ]
    },
    {
      unitName: 'Unit 2: Bioenergetics',
      chapters: [
        {
          chapterTitle: 'Cellular Respiration & Photosynthesis',
          objectives: [
            {
              id: 'bio_obj_4',
              unit: 'Unit 2: Bioenergetics',
              chapter: 'Cellular Respiration & Photosynthesis',
              topic: 'Glycolysis',
              subtopic: 'Substrate-Level Phosphorylation',
              objectiveTitle: 'Calculate net ATP and NADH yield in Glycolysis and identify PFK-1 as key rate-limiting step',
              status: 'Locked',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'PMDC Core Standard',
              notesSummary: 'Phosphofructokinase-1 (PFK-1) is inhibited by ATP and Citrate, activated by AMP and Fructose-2,6-bisphosphate. Net yield: 2 ATP + 2 NADH per glucose.',
              keyFormula: 'Glucose + 2 NAD+ + 2 ADP + 2 Pi → 2 Pyruvate + 2 NADH + 2 ATP + 2 H2O',
              flashcardCount: 8,
              mcqCount: 12
            }
          ]
        }
      ]
    }
  ],
  Chemistry: [
    {
      unitName: 'Unit 1: Chemical Kinetics & Equilibrium',
      chapters: [
        {
          chapterTitle: 'Reaction Kinetics',
          objectives: [
            {
              id: 'chem_obj_1',
              unit: 'Unit 1: Chemical Kinetics & Equilibrium',
              chapter: 'Reaction Kinetics',
              topic: 'Rate Laws',
              subtopic: 'Order of Reaction & Units',
              objectiveTitle: 'Derive units of rate constant k for Zero, First, and Second-order reactions',
              status: 'Current',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'UHS Formula Frequent',
              notesSummary: 'General unit formula for rate constant k: (mol/dm3)^(1-n) * s^-1 where n is total order of reaction.',
              keyFormula: 'Unit of k = (mol dm^-3)^(1-n) s^-1',
              flashcardCount: 5,
              mcqCount: 8
            }
          ]
        }
      ]
    }
  ],
  Physics: [
    {
      unitName: 'Unit 1: Work, Power & Energy',
      chapters: [
        {
          chapterTitle: 'Work & Energy Principles',
          objectives: [
            {
              id: 'phys_obj_1',
              unit: 'Unit 1: Work, Power & Energy',
              chapter: 'Work & Energy Principles',
              topic: 'Conservative Forces',
              subtopic: 'Closed Loop Work',
              objectiveTitle: 'Prove that work done by gravitational field in a closed loop equals zero',
              status: 'Current',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'PMDC Concept Trap',
              notesSummary: 'Gravitational field is conservative: work depends only on initial and final positions, independent of path taken.',
              keyFormula: '∮ F_gravity · dr = 0',
              flashcardCount: 4,
              mcqCount: 6
            }
          ]
        }
      ]
    }
  ],
  English: [
    {
      unitName: 'Unit 1: Grammar & Contextual Vocab',
      chapters: [
        {
          chapterTitle: 'Rules of English Structure',
          objectives: [
            {
              id: 'eng_obj_1',
              unit: 'Unit 1: Grammar & Contextual Vocab',
              chapter: 'Rules of English Structure',
              topic: 'Subject-Verb Agreement',
              subtopic: 'Collective Nouns & Either/Or',
              objectiveTitle: 'Apply proximity rules for subject-verb agreement with compound subjects and correlative conjunctions',
              status: 'Current',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'UHS English Section',
              notesSummary: 'When using "either...or" or "neither...nor", the verb agrees with the subject closest to it.',
              keyFormula: 'Neither [Subj 1] nor [Subj 2 (Plural)] → Verb (Plural)',
              flashcardCount: 4,
              mcqCount: 6
            }
          ]
        }
      ]
    }
  ],
  'Logical Reasoning': [
    {
      unitName: 'Unit 1: Deductive Logic & Syllogisms',
      chapters: [
        {
          chapterTitle: 'Critical Thinking',
          objectives: [
            {
              id: 'log_obj_1',
              unit: 'Unit 1: Deductive Logic & Syllogisms',
              chapter: 'Critical Thinking',
              topic: 'Syllogisms',
              subtopic: 'Venn Diagram Validity',
              objectiveTitle: 'Determine logical necessity vs logical possibility in categorical syllogisms',
              status: 'Current',
              masteryLevel: 'Not Started',
              accuracy: 0,
              highYieldTag: 'PMDC Logical Reasoning',
              notesSummary: 'A conclusion is logically valid only if it must follow directly from premises without assuming outside facts.',
              keyFormula: 'Premise 1 + Premise 2 → Necessary Conclusion',
              flashcardCount: 3,
              mcqCount: 5
            }
          ]
        }
      ]
    }
  ]
};

export const SequentialPracticeMode: React.FC<SequentialPracticeModeProps> = ({
  questionBank,
  onCompleteObjective,
  onNavigateToTab
}) => {
  // Navigation State
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  const [allowFreeNavigation, setAllowFreeNavigation] = useState<boolean>(false);
  
  // Local storage persisted progress
  const [objectiveProgress, setObjectiveProgress] = useState<Record<string, { status: 'Completed' | 'Current' | 'Locked'; accuracy: number; mastery: MasteryLevel }>>(() => {
    const saved = localStorage.getItem('nmdcat_sequential_progress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      bio_obj_1: { status: 'Current', accuracy: 0, mastery: 'Not Started' },
      bio_obj_2: { status: 'Locked', accuracy: 0, mastery: 'Not Started' },
      bio_obj_3: { status: 'Locked', accuracy: 0, mastery: 'Not Started' },
      bio_obj_4: { status: 'Locked', accuracy: 0, mastery: 'Not Started' },
      chem_obj_1: { status: 'Current', accuracy: 0, mastery: 'Not Started' },
      phys_obj_1: { status: 'Current', accuracy: 0, mastery: 'Not Started' },
      eng_obj_1: { status: 'Current', accuracy: 0, mastery: 'Not Started' },
      log_obj_1: { status: 'Current', accuracy: 0, mastery: 'Not Started' }
    };
  });

  useEffect(() => {
    localStorage.setItem('nmdcat_sequential_progress', JSON.stringify(objectiveProgress));
  }, [objectiveProgress]);

  // Selected Active Objective for Practice
  const [activeObjective, setActiveObjective] = useState<LearningObjectiveNode | null>(null);

  // Practice Session Step: 1 Notes -> 2 Flashcards -> 3 Formula -> 4 MCQs -> 5 AI Review -> 6 Mastery Check
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeMcqIndex, setActiveMcqIndex] = useState<number>(0);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [sessionScore, setSessionScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const [flashcardFlipped, setFlashcardFlipped] = useState<boolean>(false);
  const [minAccuracyThreshold, setMinAccuracyThreshold] = useState<number>(80);

  // Open objective session
  const handleStartObjectiveSession = (obj: LearningObjectiveNode) => {
    const currentProgress = objectiveProgress[obj.id] || { status: obj.status, accuracy: obj.accuracy, mastery: obj.masteryLevel };
    
    if (currentProgress.status === 'Locked' && !allowFreeNavigation) {
      alert('This learning objective is locked. Complete the previous objectives first to unlock sequential progression!');
      return;
    }

    setActiveObjective(obj);
    setCurrentStep(1);
    setActiveMcqIndex(0);
    setUserSelectedOption(null);
    setSessionScore({ correct: 0, total: 0 });
    setFlashcardFlipped(false);
  };

  // Generate session questions matching objective topic
  const sessionQuestions = React.useMemo(() => {
    if (!activeObjective) return [];
    return matchQuestionsFromBank(questionBank, {
      subject: selectedSubject,
      chapter: activeObjective.chapter,
      topic: activeObjective.topic || activeObjective.subtopic,
      limit: 5
    });
  }, [activeObjective, selectedSubject, questionBank]);

  // Handle MCQ Option Choice
  const handleAnswerMcq = (optIdx: number) => {
    if (userSelectedOption !== null) return;
    setUserSelectedOption(optIdx);

    const isCorrect = optIdx === sessionQuestions[activeMcqIndex]?.correctIndex;
    if (isCorrect) {
      setSessionScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    }
    setSessionScore(prev => ({ ...prev, total: prev.total + 1 }));
  };

  const handleNextMcq = () => {
    setUserSelectedOption(null);
    if (activeMcqIndex + 1 < sessionQuestions.length) {
      setActiveMcqIndex(prev => prev + 1);
    } else {
      // Move to Step 5: AI Review
      setCurrentStep(5);
    }
  };

  // Finalize Objective Mastery & Unlock Next
  const handleCompleteMasteryCheck = () => {
    if (!activeObjective) return;
    
    const finalAccuracy = sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 85;
    const passed = finalAccuracy >= minAccuracyThreshold;

    let newMastery: MasteryLevel = 'Practicing';
    if (finalAccuracy >= 90) newMastery = 'Mastered';
    else if (finalAccuracy >= 80) newMastery = 'Proficient';
    else if (finalAccuracy >= 70) newMastery = 'Practicing';
    else newMastery = 'Learning';

    setObjectiveProgress(prev => {
      const updated = { ...prev };
      updated[activeObjective.id] = {
        status: passed ? 'Completed' : 'Current',
        accuracy: finalAccuracy,
        mastery: newMastery
      };

      // Auto-unlock next objective in list if passed
      if (passed) {
        const units = SEQUENTIAL_SYLLABUS_TREE[selectedSubject];
        let foundCurrent = false;
        units.forEach(u => u.chapters.forEach(c => c.objectives.forEach(o => {
          if (foundCurrent && (!updated[o.id] || updated[o.id].status === 'Locked')) {
            updated[o.id] = { status: 'Current', accuracy: 0, mastery: 'Not Started' };
            foundCurrent = false;
          }
          if (o.id === activeObjective.id) foundCurrent = true;
        })));
      }

      return updated;
    });

    if (onCompleteObjective) {
      onCompleteObjective(activeObjective.id, finalAccuracy);
    }

    setActiveObjective(null);
  };

  // Calculated overall subject stats
  const subjectStats = React.useMemo(() => {
    const units = SEQUENTIAL_SYLLABUS_TREE[selectedSubject] || [];
    let totalObjs = 0;
    let completedObjs = 0;
    let sumAccuracy = 0;

    units.forEach(u => u.chapters.forEach(c => c.objectives.forEach(o => {
      totalObjs += 1;
      const p = objectiveProgress[o.id];
      if (p && p.status === 'Completed') {
        completedObjs += 1;
        sumAccuracy += p.accuracy;
      }
    })));

    const percentComplete = totalObjs > 0 ? Math.round((completedObjs / totalObjs) * 100) : 0;
    const avgAccuracy = completedObjs > 0 ? Math.round(sumAccuracy / completedObjs) : 0;
    const masteryStatusLabel = completedObjs === 0 ? 'Not Started' : avgAccuracy >= 85 ? 'Mastered' : 'Practicing Level';

    return { totalObjs, completedObjs, percentComplete, avgAccuracy, masteryStatusLabel };
  }, [selectedSubject, objectiveProgress]);

  return (
    <div className="space-y-6">
      {/* Top Header & Roadmap Navigator */}
      <div className="overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_-32px_rgba(16,185,129,0.45)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-300 text-[11px] font-semibold uppercase tracking-[0.25em]">
            <GitCommit className="w-4 h-4" />
            <span>PMDC Structured Sequential Learning Path Engine</span>
          </div>
          <h1 className="flex items-center gap-2 text-xl lg:text-2xl font-bold text-white tracking-tight">
            <span>Sequential Practice & Mastery Path</span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              Step-by-Step
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Master PMDC learning objectives sequentially. Each step requires completing notes, flashcards, formulas, and targeted practice before unlocking the next objective.
          </p>
        </div>

        {/* Free Navigation Toggle & Threshold Setting */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-2.5 text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Free Nav Mode:</span>
            <button
              onClick={() => setAllowFreeNavigation(!allowFreeNavigation)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                allowFreeNavigation ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {allowFreeNavigation ? 'Unlocked' : 'Sequential'}
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Mastery Min:</span>
            <select
              value={minAccuracyThreshold}
              onChange={(e) => setMinAccuracyThreshold(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold px-2 py-1 rounded"
            >
              <option value={70}>70% Pass</option>
              <option value={80}>80% Standard</option>
              <option value={90}>90% High Yield</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subject Tabs & Overall Roadmap Bar */}
      <div className="space-y-3 rounded-[24px] border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_20px_50px_-30px_rgba(2,6,23,0.9)]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {(['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as SubjectType[]).map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedSubject === sub
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{sub}</span>
              <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded font-mono">
                {subjectStats.completedObjs}/{subjectStats.totalObjs}
              </span>
            </button>
          ))}
        </div>

        {/* Progress Metric Bar */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-xs shadow-inner">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white">{selectedSubject} Progress:</span>
            <div className="w-32 sm:w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${subjectStats.percentComplete}%` }}
              />
            </div>
            <span className="font-mono text-emerald-400 font-bold">{subjectStats.percentComplete}%</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Avg Accuracy: <strong className="text-white">{subjectStats.avgAccuracy}%</strong></span>
            <span>Mastery Status: <strong className={subjectStats.completedObjs === 0 ? "text-slate-400" : "text-amber-400"}>{subjectStats.masteryStatusLabel}</strong></span>
          </div>
        </div>
      </div>

      {/* MAIN VIEW: ACTIVE OBJECTIVE SESSION OR ROADMAP TREE */}
      {activeObjective ? (
        /* ACTIVE OBJECTIVE 6-STEP SESSION CONTAINER */
        <div className="space-y-6 rounded-[24px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.95)]">
          {/* Step Breadcrumb Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-emerald-400 font-semibold">{activeObjective.chapter} &bull; {activeObjective.topic}</span>
              <h2 className="text-base font-bold text-white mt-0.5">{activeObjective.objectiveTitle}</h2>
            </div>
            <button
              onClick={() => setActiveObjective(null)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Session</span>
            </button>
          </div>

          {/* 6-Step Visual Progress Bar */}
          <div className="grid grid-cols-6 gap-2 text-center text-xs font-bold">
            {[
              { num: 1, label: 'Notes', icon: BookOpen },
              { num: 2, label: 'Flashcards', icon: Layers },
              { num: 3, label: 'Formulas', icon: Atom },
              { num: 4, label: 'MCQs', icon: HelpCircle },
              { num: 5, label: 'AI Review', icon: BrainCircuit },
              { num: 6, label: 'Mastery', icon: Award }
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => isDone && setCurrentStep(step.num)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-extrabold border-emerald-400 shadow-lg scale-[1.02]'
                      : isDone
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span>Step {step.num}</span>
                  </div>
                  <span className="text-[10px] block truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* STEP 1: STUDY NOTES */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>Essential Concept High-Yield Notes</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                    {activeObjective.highYieldTag}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                  {activeObjective.notesSummary}
                </p>

                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1 text-xs text-amber-300">
                  <strong className="block font-bold">PMDC Exam Trap Alert:</strong>
                  <p className="text-[11px]">
                    Pay special attention to regulatory feedback loops and rate-limiting catalytic steps. Past papers frequently confuse substrates with competitive inhibitors!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                <span>Read & Understood &rarr; Continue to Step 2: Flashcards</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: FLASHCARDS */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div
                onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                className="bg-slate-950 p-8 rounded-2xl border border-slate-800 min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 transition-all shadow-xl space-y-4"
              >
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                  {flashcardFlipped ? 'Answer Side' : 'Question Side (Click to Flip)'}
                </span>

                {!flashcardFlipped ? (
                  <p className="font-bold text-white text-base">
                    What is the primary rate-limiting step and key formula governing {activeObjective.subtopic}?
                  </p>
                ) : (
                  <FormattedMathContent content={activeObjective.keyFormula} className="font-semibold text-emerald-300 text-sm leading-relaxed" />
                )}
              </div>

              <button
                onClick={() => setCurrentStep(3)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                <span>Flashcards Completed &rarr; Continue to Step 3: Formulas</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: FORMULAS & DEFINITIONS */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Atom className="w-4 h-4 text-emerald-400" />
                  <span>Key Formula & Definition Sheet</span>
                </h3>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified Formula / Law</span>
                  <FormattedMathContent content={activeObjective.keyFormula} className="text-emerald-400 text-sm font-bold text-center" />
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(4)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                <span>Ready for Practice &rarr; Continue to Step 4: MCQ Session</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 4: MCQS PRACTICE SESSION */}
          {currentStep === 4 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                <span>Question {activeMcqIndex + 1} of {sessionQuestions.length}</span>
                <span>Score: <strong className="text-emerald-400">{sessionScore.correct} / {sessionScore.total}</strong></span>
              </div>

              {sessionQuestions[activeMcqIndex] && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
                  <FormattedMathContent content={sessionQuestions[activeMcqIndex].question} className="font-bold text-white text-sm leading-relaxed" />

                  <div className="space-y-2">
                    {sessionQuestions[activeMcqIndex].options.map((opt, idx) => {
                      const isSelected = userSelectedOption === idx;
                      const isCorrect = idx === sessionQuestions[activeMcqIndex].correctIndex;

                      let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700';
                      if (userSelectedOption !== null) {
                        if (isCorrect) btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold';
                        else if (isSelected) btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold';
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerMcq(idx)}
                          disabled={userSelectedOption !== null}
                          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${btnStyle}`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <FormattedMathContent content={opt} className="inline-block" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {userSelectedOption !== null && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 pt-3">
                      <div className="text-slate-300 text-[11px] flex items-start gap-1">
                        <strong className="text-emerald-400 shrink-0">Explanation:</strong>
                        <FormattedMathContent content={sessionQuestions[activeMcqIndex].explanation} className="inline" />
                      </div>

                      <button
                        onClick={handleNextMcq}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5"
                      >
                        <span>{activeMcqIndex + 1 < sessionQuestions.length ? 'Next Question' : 'Complete Practice & View AI Review'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: AI REVIEW */}
          {currentStep === 5 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 text-xs">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Learning Coach Performance Briefing</span>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-white font-bold block">Session Summary:</span>
                  <p className="text-slate-300">
                    You scored <strong>{sessionScore.correct} out of {sessionScore.total}</strong> ({sessionScore.total > 0 ? Math.round((sessionScore.correct / sessionScore.total) * 100) : 0}%).
                  </p>

                  <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                    <p>&bull; <strong>Strength:</strong> Good grasp of foundational terminology.</p>
                    <p>&bull; <strong>Recommendation:</strong> Re-visit rate-limiting kinetics before taking the chapter checkpoint test.</p>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(6)}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
                >
                  <span>Proceed to Final Mastery Check</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: MASTERY CHECK & UNLOCK */}
          {currentStep === 6 && (
            <div className="space-y-4 max-w-xl mx-auto text-center">
              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8" />
                </div>

                <h3 className="text-lg font-bold text-white">Objective Mastery Verified!</h3>
                <p className="text-xs text-slate-400">
                  You have successfully demonstrated mastery over objective: <strong>{activeObjective.objectiveTitle}</strong>.
                </p>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-emerald-400 text-sm font-bold">
                  Mastery Level: Mastered (90%+)
                </div>

                <button
                  onClick={handleCompleteMasteryCheck}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Objective & Unlock Next Syllabus Step</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SYLLABUS ROADMAP TREE VIEW */
        <div className="space-y-6">
          {SEQUENTIAL_SYLLABUS_TREE[selectedSubject]?.map((unit) => (
            <div key={unit.unitName} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>{unit.unitName}</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">PMDC Syllabus Unit</span>
              </div>

              <div className="space-y-4">
                {unit.chapters.map((chap) => (
                  <div key={chap.chapterTitle} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="font-bold text-slate-300 text-xs block">{chap.chapterTitle}</span>

                    <div className="space-y-2">
                      {chap.objectives.map((obj) => {
                        const prog = objectiveProgress[obj.id] || { status: obj.status, accuracy: obj.accuracy, mastery: obj.masteryLevel };
                        const isLocked = prog.status === 'Locked' && !allowFreeNavigation;

                        return (
                          <div
                            key={obj.id}
                            onClick={() => handleStartObjectiveSession(obj)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                              prog.status === 'Completed'
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 hover:border-emerald-500'
                                : prog.status === 'Current'
                                ? 'bg-slate-900 border-emerald-500 text-white shadow-md'
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-0.5">
                                {prog.status === 'Completed' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : prog.status === 'Current' ? (
                                  <PlayCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
                                ) : (
                                  <Lock className="w-4 h-4 text-slate-600" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-white">{obj.subtopic}</span>
                                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                                    {obj.highYieldTag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-1">{obj.objectiveTitle}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-auto text-xs">
                              {prog.accuracy > 0 && (
                                <span className="font-mono font-bold text-emerald-400 text-[11px]">
                                  {prog.accuracy}% Acc
                                </span>
                              )}

                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                prog.mastery === 'Mastered' || prog.mastery === 'Expert'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : prog.mastery === 'Proficient' || prog.mastery === 'Practicing'
                                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                  : 'bg-slate-800 text-slate-500'
                              }`}>
                                {prog.mastery}
                              </span>

                              <button
                                disabled={isLocked}
                                className={`px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 ${
                                  isLocked
                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow'
                                }`}
                              >
                                <span>{prog.status === 'Completed' ? 'Review' : 'Start'}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
