import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Flame, 
  Calendar, 
  Clock, 
  Volume2, 
  BarChart2, 
  Sparkles, 
  Bell, 
  Plus, 
  Moon, 
  Sun, 
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Target
} from 'lucide-react';

export const ProductivityAndHabitHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'habits' | 'focus_mode' | 'calendar' | 'reports'>('habits');

  // Habit Tracker State
  const [habits, setHabits] = useState([
    { id: 'h1', title: 'Solve 50 Biology MCQs Daily', streak: 0, days: [false, false, false, false, false, false, false] },
    { id: 'h2', title: 'Review 20 Chemistry SRS Cards', streak: 0, days: [false, false, false, false, false, false, false] },
    { id: 'h3', title: 'Complete 2 Pomodoro Focus Blocks', streak: 0, days: [false, false, false, false, false, false, false] },
    { id: 'h4', title: 'Read English Vocab Flashcards', streak: 0, days: [false, false, false, false, false, false, false] }
  ]);

  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Focus Mode State
  const [isFocusModeActive, setIsFocusModeActive] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'white_noise' | 'lofi'>('none');

  // Calendar Integration State
  const events = [
    { date: '2026-08-15', title: 'PMDC Full Syllabus Mock Exam #1', type: 'Exam' },
    { date: '2026-08-28', title: 'Organic Chemistry Final Revision Deadline', type: 'Revision' },
    { date: '2026-09-10', title: 'Official NMDCAT Test Date', type: 'Official' }
  ];

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle) return;
    setHabits(prev => [
      ...prev,
      { id: `h_${Date.now()}`, title: newHabitTitle, streak: 1, days: [true, false, false, false, false, false, false] }
    ]);
    setNewHabitTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <Target className="w-4 h-4" />
            <span>Productivity & Discipline Hub</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Habit Tracker, Focus Mode & Study Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build long-term study discipline, eliminate distractions, sync exam calendar deadlines, and analyze daily time utilization.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'habits' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Habit Tracker
          </button>
          <button
            onClick={() => setActiveTab('focus_mode')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'focus_mode' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Distraction-Free Focus
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'calendar' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Exam Calendar
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'reports' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Time Analytics
          </button>
        </div>
      </div>

      {/* TAB 1: Habit Tracker */}
      {activeTab === 'habits' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Daily NMDCAT Habit Matrix</span>
              </h3>
              <p className="text-xs text-slate-400">Track 7-day continuous study consistency.</p>
            </div>
          </div>

          <form onSubmit={handleAddHabit} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              placeholder="Add habit (e.g. Read Physics Formula Sheet)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400"
            >
              Add Habit
            </button>
          </form>

          <div className="space-y-3">
            {habits.map((h) => (
              <div key={h.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-xs text-white">{h.title}</h4>
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Flame className="w-3 h-3 fill-amber-400" />
                    <span>{h.streak} Day Continuous Streak</span>
                  </span>
                </div>

                {/* 7 Day Matrix */}
                <div className="flex items-center gap-1.5">
                  {h.days.slice(-7).map((done, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      ✓
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Distraction-Free Focus Mode */}
      {activeTab === 'focus_mode' && (
        <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 text-center space-y-6 max-w-xl mx-auto">
          <div className="space-y-2">
            <h3 className="font-bold text-white text-lg flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Distraction-Free Focus Mode</span>
            </h3>
            <p className="text-xs text-slate-400">
              Blocks non-essential UI elements and notifications to provide a pristine study canvas.
            </p>
          </div>

          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <button
              onClick={() => setIsFocusModeActive(!isFocusModeActive)}
              className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
                isFocusModeActive ? 'bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isFocusModeActive ? 'Exit Distraction-Free Mode' : 'Enter Distraction-Free Focus Mode'}
            </button>

            {isFocusModeActive && (
              <p className="text-xs text-emerald-400 font-bold animate-pulse">
                &bull; Focus Mode Active: Notifications & sidebars suppressed.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Exam Calendar */}
      {activeTab === 'calendar' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>PMDC Exam & Revision Calendar</span>
          </h3>

          <div className="space-y-3">
            {events.map((ev, i) => (
              <div key={i} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{ev.title}</span>
                  <span className="text-[10px] text-indigo-400">{ev.date}</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {ev.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Time Analytics */}
      {activeTab === 'reports' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Time Utilization & Daily Study Analysis</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">Today's Total Study Time</span>
              <p className="text-2xl font-black text-white">5 hrs 45 mins</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">MCQs Solved Today</span>
              <p className="text-2xl font-black text-emerald-400">140 Questions</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">Focus Efficiency Score</span>
              <p className="text-2xl font-black text-amber-400">92%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
