import React, { useState } from 'react';
import UiCard from './UiCard';
import { ConceptNotesExplorer } from './ConceptNotesExplorer';
import { FlashcardsView } from './FlashcardsView';
import { ReferenceLibraries } from './ReferenceLibraries';
import { PrismWorkspace } from './prism/PrismWorkspace';
import { SubjectSelector } from './SubjectSelector';
import {
  FileText,
  Layers,
  Calculator,
  FlaskConical,
  BookMarked,
  Network,
  Lightbulb,
  BrainCircuit,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import type { User } from '../lib/firebase';
import { SavedMistake, ExamAttempt, SubjectType } from '../types';

export interface ResourceWorkspaceProps {
  activeSubTab: string;
  onNavigateToTab: (tabId: string) => void;
  firebaseUser?: User | null;
  onSignInGoogle?: () => void;
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  setExamHistory?: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
}

export const ResourceWorkspace: React.FC<ResourceWorkspaceProps> = ({
  activeSubTab,
  onNavigateToTab,
  firebaseUser,
  onSignInGoogle,
  savedMistakes = [],
  setSavedMistakes,
  setExamHistory
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');

  return (
    <div className="space-y-6">
      <UiCard className="rounded-[32px] border-emerald-500/20 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-emerald-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
              <FileText className="w-3.5 h-3.5" />
              <span>Study library</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-100">A clean reference library for every concept</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Open PRISM synthesis, notes, flashcards, formulas, definitions, and diagrams from one coherent workspace designed for fast retrieval.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reference categories</p>
            <p className="mt-1 font-semibold text-slate-100">PRISM, Notes, flashcards, formulas, reactions, and maps</p>
          </div>
        </div>
      </UiCard>

      {/* Authoritative Global Subject Context Bar */}
      <SubjectSelector
        variant="bar"
        value={selectedSubject}
        onChange={setSelectedSubject}
        label="Active Subject Context"
        allowedSubjects={['Biology', 'Chemistry', 'Physics']}
      />

      <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'prism', label: 'PRISM Engine', icon: Sparkles, badge: 'Source-Verified' },
          { id: 'notes', label: 'Notes', icon: FileText },
          { id: 'flashcards', label: 'Flashcards', icon: Layers },
          { id: 'formula_lib', label: 'Formula Library', icon: Calculator },
          { id: 'reaction_lib', label: 'Reaction Library', icon: FlaskConical },
          { id: 'definitions', label: 'Definitions', icon: BookMarked },
          { id: 'mind_maps', label: 'Mind Maps', icon: Network },
          { id: 'mnemonics', label: 'Mnemonics', icon: Lightbulb },
          { id: 'knowledge_graph', label: 'Knowledge Graph', icon: BrainCircuit }
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubTab === sub.id;

          return (
            <button
              key={sub.id}
              onClick={() => onNavigateToTab(sub.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              {sub.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                  isActive ? 'bg-slate-950 text-cyan-400' : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* View Content Switching */}
      {activeSubTab === 'prism' && (
        <PrismWorkspace
          firebaseUser={firebaseUser}
          onSignIn={onSignInGoogle}
          savedMistakes={savedMistakes}
          setSavedMistakes={setSavedMistakes}
          setExamHistory={setExamHistory}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
        />
      )}

      {activeSubTab === 'notes' && (
        <ConceptNotesExplorer
          firebaseUser={firebaseUser}
          onSignIn={onSignInGoogle}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
        />
      )}

      {activeSubTab === 'flashcards' && (
        <FlashcardsView
          firebaseUser={firebaseUser}
          onSignIn={onSignInGoogle}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
        />
      )}

      {(activeSubTab === 'formula_lib' ||
        activeSubTab === 'reaction_lib' ||
        activeSubTab === 'definitions' ||
        activeSubTab === 'mind_maps' ||
        activeSubTab === 'mnemonics' ||
        activeSubTab === 'knowledge_graph' ||
        activeSubTab === 'vault') && (
        <ReferenceLibraries
          firebaseUser={firebaseUser}
          onSignIn={onSignInGoogle}
          activeSubTab={activeSubTab}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
        />
      )}
    </div>
  );
};


