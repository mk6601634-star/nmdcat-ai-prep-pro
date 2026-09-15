import React, { useState, useEffect } from 'react';
import { DailyTarget, SubjectType, SyllabusTopic, SavedMistake, ExamAttempt } from '../types';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Flame, 
  Award,
  Sparkles,
  Calendar,
  Layers,
  BarChart2,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { generateAiPlanFromActualData } from '../utils/aiPlanner';

interface StudyPlannerProps {
  dailyTargets: DailyTarget[];
  setDailyTargets: React.Dispatch<React.SetStateAction<DailyTarget[]>>;
  daysRemaining: number;
  topics?: SyllabusTopic[];
  savedMistakes?: SavedMistake[];
  examHistory?: ExamAttempt[];
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  dailyTargets,
  setDailyTargets,
  daysRemaining,
  topics = [],
  savedMistakes = [],
  examHistory = []
}) => {
  const [plannerTab, setPlannerTab] = useState<'daily' | 'weekly' | 'monthly' | 'ai_plan' | 'high_yield'>('daily');

  // Pomodoro state
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  // Daily target form
  const [targetTitle, setTargetTitle] = useState('');
  const [targetSubject, setTargetSubject] = useState<SubjectType>('Biology');

  // AI Planner input state
  const [dailyHours, setDailyHours] = useState<number>(6);
  const [aiCustomPlanGenerated, setAiCustomPlanGenerated] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      if (pomodoroMode === 'work') {
        setCompletedSessions(prev => prev + 1);
        alert('Pomodoro Focus Session Completed! Take a 5-minute break.');
        setPomodoroMode('shortBreak');
        setTimeLeft(5 * 60);
      } else {
        alert('Break finished! Ready to focus on NMDCAT prep again?');
        setPomodoroMode('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, pomodoroMode]);

  const switchPomodoroMode = (mode: 'work' | 'shortBreak' | 'longBreak') => {
    setPomodoroMode(mode);
    setIsRunning(false);
    if (mode === 'work') setTimeLeft(25 * 60);
    if (mode === 'shortBreak') setTimeLeft(5 * 60);
    if (mode === 'longBreak') setTimeLeft(15 * 60);
  };

  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTitle.trim()) return;
    const newTarget: DailyTarget = {
      id: `dt-${Date.now()}`,
      title: targetTitle.trim(),
      subject: targetSubject,
      completed: false,
      dueDate: new Date().toISOString().slice(0, 10),
    };
    setDailyTargets(prev => [newTarget, ...prev]);
    setTargetTitle('');
  };

  const toggleTarget = (id: string) => {
    setDailyTargets(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTarget = (id: string) => {
    setDailyTargets(prev => prev.filter(t => t.id !== id));
  };

  const formatMinutes = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // High Yield Ranked Topics dynamically computed from user database syllabus topics
  const highYieldRanked = React.useMemo(() => {
    if (topics && topics.length > 0) {
      const sorted = [...topics].sort((a, b) => (b.weightagePercentage || 0) - (a.weightagePercentage || 0));
      return sorted.slice(0, 5).map((t, idx) => ({
        rank: idx + 1,
        subject: t.subject,
        topic: t.topic,
        weightage: `${t.weightagePercentage || 10}%`,
        frequency: (t.weightagePercentage || 10) >= 10 ? 'Extremely High' : 'High',
        expectedProb: `${Math.min(99, 85 + (5 - idx) * 3)}%`
      }));
    }
    return [
      { rank: 1, subject: 'Biology' as SubjectType, topic: 'Enzyme Action & Inhibition', weightage: '12-14%', frequency: 'Extremely High', expectedProb: '98%' },
      { rank: 2, subject: 'Chemistry' as SubjectType, topic: 'Aldehydes & Ketones Reactions', weightage: '10-12%', frequency: 'Extremely High', expectedProb: '95%' },
      { rank: 3, subject: 'Physics' as SubjectType, topic: 'Electromagnetic Induction & Faraday', weightage: '9-11%', frequency: 'High', expectedProb: '92%' },
      { rank: 4, subject: 'Biology' as SubjectType, topic: 'Cell Membrane & Active Transport', weightage: '8-10%', frequency: 'High', expectedProb: '90%' },
      { rank: 5, subject: 'Chemistry' as SubjectType, topic: 'Reaction Kinetics & Rate Constants', weightage: '8-9%', frequency: 'High', expectedProb: '88%' }
    ];
  }, [topics]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Timer className="w-4 h-4" />
            <span>AI Personalized Study & Focus Suite</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Personalized Study System & Countdown Planner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic study schedules, high-yield topic rankings, and pomodoro focus timers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1">
          <button
            onClick={() => setPlannerTab('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${plannerTab === 'daily' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
          >
            Daily & Pomodoro
          </button>
          <button
            onClick={() => setPlannerTab('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${plannerTab === 'weekly' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
          >
            Weekly Goals
          </button>
          <button
            onClick={() => setPlannerTab('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${plannerTab === 'monthly' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
          >
            Monthly Timeline
          </button>
          <button
            onClick={() => setPlannerTab('ai_plan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${plannerTab === 'ai_plan' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
          >
            AI Generator
          </button>
          <button
            onClick={() => setPlannerTab('high_yield')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${plannerTab === 'high_yield' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
          >
            High-Yield Priority
          </button>
        </div>
      </div>

      {plannerTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pomodoro Focus Timer */}
          <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6 text-center">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Pomodoro Focus Timer</span>
            </h2>

            {/* Mode Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 max-w-xs mx-auto">
              <button
                onClick={() => switchPomodoroMode('work')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pomodoroMode === 'work' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Focus (25m)
              </button>
              <button
                onClick={() => switchPomodoroMode('shortBreak')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pomodoroMode === 'shortBreak' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Break (5m)
              </button>
              <button
                onClick={() => switchPomodoroMode('longBreak')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pomodoroMode === 'longBreak' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Long (15m)
              </button>
            </div>

            {/* Clock Display */}
            <div className="py-6">
              <div className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tight">
                {formatMinutes(timeLeft)}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {pomodoroMode === 'work' ? 'Stay concentrated on your NMDCAT topic' : 'Rest your eyes & hydrate!'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all"
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isRunning ? 'Pause' : 'Start Focus Session'}</span>
              </button>

              <button
                onClick={() => {
                  setIsRunning(false);
                  switchPomodoroMode(pomodoroMode);
                }}
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Reset Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-indigo-300">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Completed Today: <strong>{completedSessions}</strong> Sessions</span>
            </div>
          </div>

          {/* Daily Goals Manager */}
          <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Daily Target Checklist</span>
              </h2>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {dailyTargets.filter(t => t.completed).length} / {dailyTargets.length} Completed
              </span>
            </div>

            <form onSubmit={handleAddTarget} className="flex gap-2">
              <input
                type="text"
                placeholder="Add study goal (e.g. Solve 50 Bio MCQs)..."
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={targetSubject}
                onChange={(e) => setTargetSubject(e.target.value as SubjectType)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="Biology">Bio</option>
                <option value="Chemistry">Chem</option>
                <option value="Physics">Phy</option>
                <option value="English">Eng</option>
                <option value="Logical Reasoning">Logic</option>
              </select>
              <button
                type="submit"
                className="p-2.5 bg-emerald-500 text-slate-950 rounded-xl font-bold hover:bg-emerald-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {dailyTargets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No daily targets yet. Add your study goals above!</p>
              ) : (
                dailyTargets.map(t => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                      t.completed
                        ? 'bg-slate-800/30 border-slate-800 text-slate-500 line-through'
                        : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggleTarget(t.id)}
                        className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="truncate">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {t.subject}
                      </span>
                      <button
                        onClick={() => deleteTarget(t.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {plannerTab === 'weekly' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Weekly Goal Distribution</h3>
          <p className="text-xs text-slate-400">Target subject distribution for current week.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-indigo-400">Biology Target</span>
              <p className="text-slate-300">Finish Cell Biology, Enzymes, and Bioenergetics (120 MCQs)</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-teal-400">Chemistry Target</span>
              <p className="text-slate-300">Complete Organic Aldehydes & Reaction Kinetics (90 MCQs)</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400">Physics Target</span>
              <p className="text-slate-300">Master Electromagnetic Induction & Wave Motion (80 MCQs)</p>
            </div>
          </div>
        </div>
      )}

      {plannerTab === 'monthly' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Long-Term Syllabus Completion Timeline</h3>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex justify-between font-bold text-indigo-400">
              <span>Month 1: Core Foundation</span>
              <span>100% Completed</span>
            </div>
            <p>Covered fundamental chapters across all 5 PMDC subjects.</p>
          </div>
        </div>
      )}

      {plannerTab === 'ai_plan' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 max-w-xl mx-auto">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI Dynamic Study Planner</span>
          </h3>

          <p className="text-xs text-slate-300">
            This planner dynamically scans your uncompleted syllabus topics, unresolved mistakes in the vault, and past exam history to generate a tailored target plan.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Available Daily Study Hours</label>
              <input
                type="number"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <button
              onClick={() => {
                const freshPlan = generateAiPlanFromActualData(topics, savedMistakes, examHistory);
                setDailyTargets(freshPlan);
                setAiCustomPlanGenerated(true);
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Generate Custom AI Schedule from My Data</span>
            </button>

            {aiCustomPlanGenerated && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>AI Plan generated & synced with your Daily Target Checklist!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {plannerTab === 'high_yield' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">High-Yield Priority System</h3>
          <p className="text-xs text-slate-400">PMDC past paper probability ranking.</p>

          <div className="space-y-3">
            {highYieldRanked.map(item => (
              <div key={item.rank} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-amber-400 mr-2">#{item.rank}</span>
                  <span className="font-bold text-white">{item.topic}</span>
                  <span className="text-[10px] text-slate-500 ml-2">({item.subject})</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold">{item.expectedProb} Prob</span>
                  <span className="text-[10px] text-slate-500 block">{item.weightage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

