import React, { useState } from 'react';
import { PrismGeneratedMaterials } from './prismTypes';
import { PrismConflictBadge } from './PrismConflictBadge';
import { 
  Layers, 
  Sparkles, 
  Bookmark, 
  CheckCircle2, 
  Network, 
  Lightbulb, 
  Calculator, 
  FlaskConical, 
  Copy, 
  Check, 
  RotateCw,
  Share2,
  FolderPlus
} from 'lucide-react';
import { 
  saveUserFlashcards, 
  saveUserMindMap, 
  saveUserMnemonic, 
  saveUserFormula, 
  saveUserReaction 
} from '../../lib/firestoreService';
import type { User } from '../../lib/firebase';

interface PrismMaterialsViewProps {
  materials: PrismGeneratedMaterials;
  topic: string;
  subject: string;
  firebaseUser?: User | null;
  onSignIn?: () => void;
}

export const PrismMaterialsView: React.FC<PrismMaterialsViewProps> = ({
  materials,
  topic,
  subject,
  firebaseUser,
  onSignIn
}) => {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'mindmap' | 'mnemonics' | 'formulas' | 'reactions'>('flashcards');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleFlip = (cardId: string) => {
    setFlippedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleSaveFlashcard = async (fc: any) => {
    const key = `fc_${fc.id}`;
    setSavedStatus(prev => ({ ...prev, [key]: true }));

    // Save to localStorage for instant local access
    try {
      const existing = JSON.parse(localStorage.getItem('nmdcat_user_flashcards') || '[]');
      localStorage.setItem('nmdcat_user_flashcards', JSON.stringify([fc, ...existing]));
    } catch {}

    if (firebaseUser) {
      await saveUserFlashcards(firebaseUser.uid, [{
        subject: fc.subject,
        topic: fc.topic,
        front: fc.front,
        back: fc.back,
        cardType: 'standard'
      }]);
    }
  };

  const handleSaveMindMap = async (mm: any) => {
    const key = `mm_${mm.id}`;
    setSavedStatus(prev => ({ ...prev, [key]: true }));

    try {
      const existing = JSON.parse(localStorage.getItem('nmdcat_user_mindmaps') || '[]');
      localStorage.setItem('nmdcat_user_mindmaps', JSON.stringify([mm, ...existing]));
    } catch {}

    if (firebaseUser) {
      await saveUserMindMap(firebaseUser.uid, mm);
    }
  };

  const handleSaveMnemonic = async (mn: any) => {
    const key = `mn_${mn.id}`;
    setSavedStatus(prev => ({ ...prev, [key]: true }));

    const flashcardItem = {
      id: mn.id,
      subject: subject as any,
      topic: topic,
      front: `Mnemonic for ${mn.concept || topic}: ${mn.mnemonic}`,
      back: mn.explanation,
      cardType: 'standard' as const,
      mnemonic: mn.mnemonic
    };

    try {
      const existing = JSON.parse(localStorage.getItem('nmdcat_user_mnemonics') || '[]');
      localStorage.setItem('nmdcat_user_mnemonics', JSON.stringify([flashcardItem, ...existing]));
    } catch {}

    if (firebaseUser) {
      await saveUserMnemonic(firebaseUser.uid, flashcardItem);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Selector for Materials */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'flashcards', label: `Flashcards (${materials.flashcards?.length || 0})`, icon: Layers },
          { id: 'mindmap', label: 'Mind Map Visual', icon: Network },
          { id: 'mnemonics', label: `Mnemonics (${materials.mnemonics?.length || 0})`, icon: Lightbulb },
          { id: 'formulas', label: `Formulas (${materials.formulas?.length || 0})`, icon: Calculator },
          { id: 'reactions', label: `Reactions (${materials.reactions?.length || 0})`, icon: FlaskConical }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Flashcards View */}
      {activeTab === 'flashcards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(materials.flashcards || []).map((fc) => {
            const isFlipped = flippedCards[fc.id];
            const isSaved = savedStatus[`fc_${fc.id}`];

            return (
              <div
                key={fc.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between min-h-[220px] transition-all shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <PrismConflictBadge status={fc.knowledgeStatus || 'VERIFIED'} size="sm" />
                  <span className="text-[10px] text-slate-400 font-semibold">{fc.topic || topic}</span>
                </div>

                <div 
                  onClick={() => toggleFlip(fc.id)}
                  className="flex-1 cursor-pointer flex flex-col justify-center py-2 text-center"
                >
                  {!isFlipped ? (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Question Prompt</span>
                      <p className="text-sm font-bold text-white">{fc.front}</p>
                      <span className="text-[10px] text-slate-500 block">(Click to flip for answer)</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Verified Explanation</span>
                      <p className="text-xs text-slate-200 leading-relaxed">{fc.back}</p>
                      {fc.explanation && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">{fc.explanation}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => toggleFlip(fc.id)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Flip</span>
                  </button>

                  <button
                    onClick={() => handleSaveFlashcard(fc)}
                    disabled={isSaved}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSaved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Saved' : 'Save to My Cards'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Mind Map View */}
      {activeTab === 'mindmap' && materials.mindMap && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Visual Knowledge Tree</span>
              <h4 className="text-lg font-black text-white">{materials.mindMap.centerConcept || topic}</h4>
            </div>

            <button
              onClick={() => handleSaveMindMap(materials.mindMap)}
              disabled={savedStatus[`mm_${materials.mindMap.id}`]}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                savedStatus[`mm_${materials.mindMap.id}`]
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>{savedStatus[`mm_${materials.mindMap.id}`] ? 'Saved to My Mind Maps' : 'Save Mind Map'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(materials.mindMap.nodes || []).map((node, nIdx) => (
              <div key={node.id || nIdx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs">
                    {nIdx + 1}
                  </div>
                  <h5 className="font-bold text-white text-sm line-clamp-1">{node.label}</h5>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{node.description}</p>

                {node.subNodes && node.subNodes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-900">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Sub-Branches:</span>
                    {node.subNodes.map((sub, sIdx) => (
                      <div key={sub.id || sIdx} className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/80 text-[11px] space-y-0.5">
                        <strong className="text-cyan-300 block">{sub.label}</strong>
                        <p className="text-slate-400 text-[10px]">{sub.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Mnemonics View */}
      {activeTab === 'mnemonics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(materials.mnemonics || []).map((mn) => {
            const isSaved = savedStatus[`mn_${mn.id}`];

            return (
              <div key={mn.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                    {mn.type} Mnemonic
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{mn.concept || topic}</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Memory Hook</span>
                  <p className="text-base font-black text-amber-300 tracking-wider">{mn.mnemonic}</p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{mn.explanation}</p>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleSaveMnemonic(mn)}
                    disabled={isSaved}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSaved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Saved' : 'Save to My Mnemonics'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Formulas View */}
      {activeTab === 'formulas' && (
        <div className="space-y-4">
          {(materials.formulas || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              No mathematical formulas extracted for this topic.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.formulas.map((f, idx) => (
                <div key={f.id || idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">{f.title}</span>
                    <span className="text-[10px] text-slate-400">{f.chapter}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-sm text-emerald-300 font-bold text-center">
                    {f.formula}
                  </div>
                  <p className="text-xs text-slate-300">{f.derivationSummary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Reactions View */}
      {activeTab === 'reactions' && (
        <div className="space-y-4">
          {(materials.reactions || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              No chemical reactions extracted for this topic.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.reactions.map((r, idx) => (
                <div key={r.id || idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">{r.reactionName}</span>
                    <span className="text-[10px] text-slate-400">{r.chapter}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 font-bold">
                    {r.chemicalEquation}
                  </div>
                  <p className="text-xs text-slate-300">{r.mechanism}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
