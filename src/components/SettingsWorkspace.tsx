import React, { useState, useEffect } from 'react';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import UiCard from './UiCard';
import { ContentPipelineAndOfflineHub } from './ContentPipelineAndOfflineHub';
import {
  User,
  Download,
  WifiOff,
  Sliders as SlidersIcon,
  HelpCircle,
  MessageCircle,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Save,
  Moon,
  Volume2,
  Calendar
} from 'lucide-react';

export interface SettingsWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  userName?: string;
  setUserName?: (name: string) => void;
  examDate?: string;
  setExamDate?: (date: string) => void;
  targetScore?: number;
  setTargetScore?: (score: number) => void;
  userEmail?: string;
  daysRemaining?: number;
}

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  userName = 'NMDCAT Aspirant',
  setUserName,
  examDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10),
  setExamDate,
  targetScore = NMDCAT_CONFIG.TOTAL_MCQS,
  setTargetScore,
  userEmail,
  daysRemaining
}) => {
  const [name, setName] = useState(userName);
  const [dateInput, setDateInput] = useState(examDate);
  const [email, setEmail] = useState(userEmail || '');
  const [targetScoreInput, setTargetScoreInput] = useState(String(targetScore));
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setName(userName);
  }, [userName]);

  useEffect(() => {
    setDateInput(examDate);
  }, [examDate]);

  useEffect(() => {
    setEmail(userEmail || '');
  }, [userEmail]);

  useEffect(() => {
    setTargetScoreInput(String(targetScore));
  }, [targetScore]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (setUserName) setUserName(name.trim() || 'NMDCAT Aspirant');
    if (setExamDate) setExamDate(dateInput);
    if (setTargetScore) setTargetScore(Math.max(150, Math.min(180, parseInt(targetScoreInput, 10) || NMDCAT_CONFIG.TOTAL_MCQS)));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase() || 'MK';
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header Sub Navigation */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Profile & Exam Date', icon: User },
          { id: 'downloads', label: 'Downloads', icon: Download },
          { id: 'offline_content', label: 'Offline Content', icon: WifiOff },
          { id: 'preferences', label: 'Preferences', icon: SlidersIcon },
          { id: 'help', label: 'Help', icon: HelpCircle },
          { id: 'feedback', label: 'Feedback', icon: MessageCircle },
          { id: 'logout', label: 'Logout', icon: LogOut }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id || (activeSubTab === 'content_pipeline' && sub.id === 'offline_content');

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
            </button>
          );
        })}
      </div>

      {/* Sub Views */}
      {activeSubTab === 'profile' && (
        <UiCard className="max-w-2xl space-y-6 border-cyan-500/20 bg-slate-950/95">
          <div className="flex items-center gap-4 pb-4 border-b border-cyan-500/20">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg">
              {getInitials(name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{name}</h2>
              <p className="text-xs text-cyan-300 font-semibold">PMDC Medical Aspirant • Target: {dateInput}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Target Exam Date (NMDCAT)
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500 font-medium cursor-pointer"
              />
              {daysRemaining !== undefined && (
                <p className="text-[11px] text-cyan-300 font-semibold">
                  ⏳ {daysRemaining} Days remaining from today until {dateInput}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your Google account email"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-500"
                disabled={Boolean(userEmail)}
              />
              {userEmail && (
                <p className="text-[11px] text-slate-500 mt-1">Signed in as {userEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target NMDCAT Score (Out of 200)</label>
              <input
                type="number"
                min={150}
                max={180}
                value={targetScoreInput}
                onChange={e => setTargetScoreInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile & Target Exam Date updated successfully!</span>
              </div>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </form>
        </UiCard>
      )}

      {(activeSubTab === 'offline_content' || activeSubTab === 'content_pipeline' || activeSubTab === 'downloads') && (
        <ContentPipelineAndOfflineHub />
      )}

      {activeSubTab === 'preferences' && (
        <UiCard className="max-w-2xl space-y-6 text-xs border-cyan-500/20 bg-slate-950/95">
          <h2 className="text-lg font-bold text-slate-100">Application Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-cyan-500/20">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-cyan-300" />
                <div>
                  <p className="font-bold text-slate-200">Dark High-Contrast Theme</p>
                  <p className="text-[11px] text-slate-500">Optimized for late-night study sessions</p>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-cyan-300" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-cyan-500/20">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-violet-300" />
                <div>
                  <p className="font-bold text-slate-200">Sound Effects & Haptics</p>
                  <p className="text-[11px] text-slate-500">Play subtle audio chime on correct MCQ choices</p>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-violet-300" />
            </div>
          </div>
        </UiCard>
      )}

      {activeSubTab === 'help' && (
        <UiCard className="max-w-3xl space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Help & Support Center</h2>
          <div className="space-y-3 text-xs">
            <details className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <summary className="font-bold text-slate-200 cursor-pointer">How is my NMDCAT readiness score calculated?</summary>
              <p className="mt-2 text-slate-400 leading-relaxed">
                Your readiness score weighs your overall MCQ practice accuracy, mock exam performance, PMDC syllabus coverage, and SRS retention speed.
              </p>
            </details>
            <details className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <summary className="font-bold text-slate-200 cursor-pointer">Can I use NMDCAT AI Prep Pro offline?</summary>
              <p className="mt-2 text-slate-400 leading-relaxed">
                Yes! Head to Offline Content under Settings to sync flashcards, notes, and question banks directly to your browser storage.
              </p>
            </details>
          </div>
        </UiCard>
      )}

      {activeSubTab === 'feedback' && (
        <UiCard className="max-w-xl space-y-4 text-xs">
          <h2 className="text-lg font-bold text-slate-100">Send Feedback</h2>
          <textarea
            rows={4}
            placeholder="Tell us how we can make NMDCAT Prep Pro better for your study routine..."
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-500"
          />
          <button className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
            Submit Feedback
          </button>
        </UiCard>
      )}

      {activeSubTab === 'logout' && (
        <UiCard className="max-w-md text-center space-y-4 p-8">
          <LogOut className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-100">Logged Out</h2>
          <p className="text-xs text-slate-400">Your study data and local progress are securely saved.</p>
          <button
            onClick={() => onNavigateToTab('dashboard')}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Return to Dashboard
          </button>
        </UiCard>
      )}
    </div>
  );
};
