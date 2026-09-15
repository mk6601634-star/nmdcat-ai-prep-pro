import React, { useState, useEffect, useRef } from 'react';
import NMDCAT_CONFIG from '../constants/nmdcatConfig';
import {
  Search,
  X,
  FileText,
  Layers,
  HelpCircle,
  Calculator,
  Network,
  GitCommit,
  Sliders,
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  Command,
  Flame,
  FlaskConical
} from 'lucide-react';

export interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (tabId: string, payload?: any) => void;
}

interface SearchItem {
  id: string;
  category: 'Notes' | 'Flashcards' | 'Questions' | 'Formulas' | 'Mind Maps' | 'Sequential Practice' | 'Commands' | 'Settings';
  title: string;
  snippet: string;
  targetTab: string;
  icon: React.ElementType;
  tag?: string;
}

const SEARCH_DATABASE: SearchItem[] = [
  // Glycolysis related items (Instant match for prompt example)
  {
    id: 'g-1',
    category: 'Notes',
    title: 'Glycolysis & Bioenergetics Core Notes',
    snippet: 'Complete breakdown of 10 enzymatic steps, ATP consumption phase, and net 2 ATP + 2 NADH production in cytosol.',
    targetTab: 'notes',
    icon: FileText,
    tag: 'Biology'
  },
  {
    id: 'g-2',
    category: 'Flashcards',
    title: 'Glycolysis Net Yield Flashcard Deck',
    snippet: 'Q: What is the rate-limiting enzyme in Glycolysis? A: Phosphofructokinase-1 (PFK-1).',
    targetTab: 'flashcards',
    icon: Layers,
    tag: '56 Due'
  },
  {
    id: 'g-3',
    category: 'Questions',
    title: 'Glycolysis MCQ Practice Drill (15 Qs)',
    snippet: 'Which enzyme catalyzes the conversion of Fructose-6-Phosphate to Fructose-1,6-Bisphosphate?',
    targetTab: 'sequential_practice',
    icon: HelpCircle,
    tag: 'Past Paper Q'
  },
  {
    id: 'g-4',
    category: 'Formulas',
    title: 'ATP Stoichiometry & Free Energy Equations',
    snippet: 'ΔG°′ = -30.5 kJ/mol for ATP hydrolysis under standard cellular conditions.',
    targetTab: 'formula_lib',
    icon: Calculator,
    tag: 'High Yield'
  },
  {
    id: 'g-5',
    category: 'Mind Maps',
    title: 'Cellular Respiration & Glycolysis Pathway Map',
    snippet: 'Visual pathway nodes linking Glucose -> Pyruvate -> Acetyl-CoA -> Krebs Cycle.',
    targetTab: 'mind_maps',
    icon: Network,
    tag: 'Interactive Map'
  },
  {
    id: 'g-6',
    category: 'Sequential Practice',
    title: 'Biology Unit 4: Bioenergetics & Glycolysis',
    snippet: 'Launch PMDC Sequential Practice mode directly at Chapter 4.1.',
    targetTab: 'sequential_practice',
    icon: GitCommit,
    tag: 'PMDC Syllabus'
  },

  // Other High Yield Subjects & Topics
  {
    id: 'p-1',
    category: 'Formulas',
    title: 'Kinematics Equations of Motion (Physics)',
    snippet: 'v = u + at, s = ut + ½at², v² - u² = 2as. Vector components and projectile trajectory.',
    targetTab: 'formula_lib',
    icon: Calculator,
    tag: 'Physics'
  },
  {
    id: 'c-1',
    category: 'Formulas',
    title: 'Organic Chemistry Reaction Reagents & Mechanisms',
    snippet: 'Electrophilic addition to Alkanes, Nucleophilic substitution SN1 vs SN2 comparison chart.',
    targetTab: 'reaction_lib',
    icon: FlaskConical,
    tag: 'Chemistry'
  },
  {
    id: 'b-1',
    category: 'Notes',
    title: 'Cell Structure & Organelles Digest',
    snippet: 'Mitochondria double membrane, Endoplasmic Reticulum rough vs smooth functions.',
    targetTab: 'notes',
    icon: FileText,
    tag: 'Biology'
  },
  // Direct Feature Navigation Entries
  {
    id: 'f-1',
    category: 'Commands',
    title: 'AI Textbook & Guide Extractor (Material Studio)',
    snippet: 'Paste raw textbook text -> Extract high-yield MCQs, notes & flashcards -> 1-Click Database Approval.',
    targetTab: 'ai_question_gen',
    icon: Command,
    tag: '1-Click DB'
  },
  {
    id: 'f-2',
    category: 'Commands',
    title: `PMDC Full Mock Exams (${NMDCAT_CONFIG.TOTAL_MCQS} MCQs)`,
    snippet: 'Full 3-hour simulated PMDC entrance test with realistic score report and provincial ranking.',
    targetTab: 'mock_exams',
    icon: Flame,
    tag: 'Real Exam'
  },
  {
    id: 'f-3',
    category: 'Commands',
    title: 'PMDC Past Papers (10 Years)',
    snippet: 'Solved past paper questions (2015-2025) categorized by subject and PMDC syllabus subtopics.',
    targetTab: 'past_papers',
    icon: FileText,
    tag: '10 Years'
  },
  {
    id: 'f-4',
    category: 'Commands',
    title: 'Mistake Book & Spaced Repetition Vault',
    snippet: 'Review all logged incorrect questions with step-by-step AI scientific explanations.',
    targetTab: 'mistake_book',
    icon: Sliders,
    tag: 'Vault'
  },
];

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredResults = query.trim()
    ? SEARCH_DATABASE.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.snippet.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        (item.tag && item.tag.toLowerCase().includes(query.toLowerCase()))
      )
    : SEARCH_DATABASE.slice(0, 6); // Default popular suggestions

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        onSelectResult(filteredResults[selectedIndex].targetTab);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-[18px] flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div
        className="w-full max-w-2xl bg-slate-950/95 border border-slate-800 rounded-[28px] shadow-[0_40px_120px_-60px_rgba(15,23,42,0.9)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <label htmlFor="universal-search-input" className="sr-only">Universal search</label>
          <input
            id="universal-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Type "Glycolysis", "Physics", "Notes", "Test Builder"...'
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 text-sm sm:text-base font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700"
          >
            ESC
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Try searching:</span>
          {['Glycolysis', 'Kinematics', 'Organic Reactions', 'Mind Maps', 'Custom Test'].map(term => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-slate-700/50 text-[11px] transition-colors shrink-0"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto text-slate-700 mb-2" />
              <p className="text-sm font-medium">No direct matches found for &quot;{query}&quot;</p>
              <p className="text-xs text-slate-600 mt-1">Try searching broader keywords like &quot;Biology&quot;, &quot;Physics&quot;, or &quot;Mock Exam&quot;</p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectResult(item.targetTab);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-slate-100 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 truncate">{item.title}</h4>
                      </div>
                      {item.tag && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.snippet}</p>
                  </div>

                  {isSelected && (
                    <CornerDownLeft className="w-4 h-4 text-emerald-400 shrink-0 self-center" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span>Showing {filteredResults.length} results</span>
        </div>
      </div>
    </div>
  );
};
