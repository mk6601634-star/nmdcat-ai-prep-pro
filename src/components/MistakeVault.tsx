import React, { useState } from 'react';
import { SavedMistake, SubjectType } from '../types';
import { 
  Bookmark, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  Check, 
  XCircle, 
  FileText,
  Filter,
  Sparkles
} from 'lucide-react';

interface MistakeVaultProps {
  savedMistakes: SavedMistake[];
  setSavedMistakes: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  setActiveTab: (tab: string) => void;
}

export const MistakeVault: React.FC<MistakeVaultProps> = ({
  savedMistakes,
  setSavedMistakes,
  setActiveTab,
}) => {
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('unresolved');
  const [retestMode, setRetestMode] = useState<boolean>(false);
  const [retestIndex, setRetestIndex] = useState<number>(0);
  const [retestAnswers, setRetestAnswers] = useState<Record<number, number>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  const filteredMistakes = savedMistakes.filter(m => {
    const matchesSub = subjectFilter === 'All' || m.question.subject === subjectFilter;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'unresolved' && !m.isResolved) || 
                          (statusFilter === 'resolved' && m.isResolved);
    return matchesSub && matchesStatus;
  });

  const toggleResolve = (id: string) => {
    setSavedMistakes(prev => prev.map(m => m.questionId === id ? { ...m, isResolved: !m.isResolved } : m));
  };

  const deleteMistake = (id: string) => {
    setSavedMistakes(prev => prev.filter(m => m.questionId !== id));
  };

  const handleSaveNote = (id: string) => {
    setSavedMistakes(prev => prev.map(m => m.questionId === id ? { ...m, notes: noteText } : m));
    setEditingNoteId(null);
    setNoteText('');
  };

  // Re-test quiz handlers
  const currentRetestItem = filteredMistakes[retestIndex];
  const isRetestAnswered = retestAnswers[retestIndex] !== undefined;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden rounded-[28px] border border-amber-500/20 bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_-32px_rgba(245,158,11,0.35)]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-amber-300 text-[11px] font-semibold uppercase tracking-[0.25em]">
            <Bookmark className="w-4 h-4" />
            <span>Personal Error Revision Log</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            NMDCAT Mistake Vault
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Every error is a stepping stone to a top medical college score. Re-test your mistakes until 100% accuracy.
          </p>
        </div>

        {filteredMistakes.length > 0 && !retestMode && (
          <button
            onClick={() => {
              setRetestMode(true);
              setRetestIndex(0);
              setRetestAnswers({});
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all w-full sm:w-auto justify-center"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Re-Test Saved Mistakes ({filteredMistakes.length})</span>
          </button>
        )}
      </div>

      {/* Retest Quiz Mode */}
      {retestMode && currentRetestItem && (
        <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-amber-500/30 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400">
              Mistake Re-Test: Question {retestIndex + 1} of {filteredMistakes.length}
            </span>
            <button
              onClick={() => setRetestMode(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Exit Re-Test
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {currentRetestItem.question.subject}
            </span>
            <h3 className="text-base font-bold text-white leading-relaxed">
              {currentRetestItem.question.question}
            </h3>
          </div>

          <div className="space-y-3">
            {currentRetestItem.question.options.map((opt, optIdx) => {
              const userChoice = retestAnswers[retestIndex];
              const isSelected = userChoice === optIdx;
              const isCorrect = optIdx === currentRetestItem.question.correctIndex;

              let btnStyle = 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600';
              if (isRetestAnswered) {
                if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold';
                else if (isSelected) btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200 font-semibold';
                else btnStyle = 'bg-slate-800/40 border-slate-800 text-slate-500';
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => {
                    if (!isRetestAnswered) {
                      setRetestAnswers(prev => ({ ...prev, [retestIndex]: optIdx }));
                      if (optIdx === currentRetestItem.question.correctIndex) {
                        toggleResolve(currentRetestItem.questionId);
                      }
                    }
                  }}
                  disabled={isRetestAnswered}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm text-left transition-all ${btnStyle}`}
                >
                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                  {isRetestAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isRetestAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {isRetestAnswered && (
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-2 text-xs">
              <div className="font-bold text-emerald-400">Explanation:</div>
              <p className="text-slate-300 leading-relaxed">{currentRetestItem.question.explanation}</p>
            </div>
          )}

          {isRetestAnswered && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (retestIndex < filteredMistakes.length - 1) {
                    setRetestIndex(prev => prev + 1);
                  } else {
                    setRetestMode(false);
                    alert('Re-test completed!');
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                {retestIndex < filteredMistakes.length - 1 ? 'Next Question' : 'Finish Re-Test'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter controls */}
      {!retestMode && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 shadow-inner">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="All">All Subjects</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
                <option value="English">English</option>
                <option value="Logical Reasoning">Logical Reasoning</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="unresolved">Unresolved Errors</option>
              <option value="resolved">Mastered Errors</option>
              <option value="all">All Vault Items</option>
            </select>
          </div>

          {/* Mistakes Cards List */}
          <div className="space-y-4">
            {filteredMistakes.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                No saved mistakes found. Keep practicing! When you answer an MCQ incorrectly during practice or mock exams, click "Save to Mistake Vault".
              </div>
            ) : (
              filteredMistakes.map(item => (
                <div
                  key={item.questionId}
                  className={`bg-slate-900/90 p-5 rounded-2xl border transition-all space-y-4 ${
                    item.isResolved ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                          {item.question.subject}
                        </span>
                        <span className="text-[10px] text-slate-500">Added: {item.dateAdded}</span>
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm">{item.question.question}</h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleResolve(item.questionId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          item.isResolved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{item.isResolved ? 'Mastered' : 'Mark Mastered'}</span>
                      </button>

                      <button
                        onClick={() => deleteMistake(item.questionId)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg bg-slate-800/60 hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {item.question.options.map((opt, oIdx) => {
                      let optStyle = 'bg-slate-800/40 text-slate-400 border-slate-800';
                      if (oIdx === item.question.correctIndex) optStyle = 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 font-semibold';
                      if (oIdx === item.wrongAnswerIndex) optStyle = 'bg-rose-500/20 text-rose-200 border-rose-500/50 font-semibold';

                      return (
                        <div key={oIdx} className={`p-2.5 rounded-lg border ${optStyle}`}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">Scientific Reason:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Error Pattern:</span>
                        <select
                          value={item.errorPattern || 'Conceptual Gap'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setSavedMistakes(prev => prev.map(m => m.questionId === item.questionId ? { ...m, errorPattern: val } : m));
                          }}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-amber-300 font-bold"
                        >
                          <option value="Conceptual Gap">Conceptual Gap</option>
                          <option value="Calculation Mistake">Calculation Mistake</option>
                          <option value="Careless Trap">Careless Trap</option>
                          <option value="Misread Question">Misread Question</option>
                          <option value="Memory Glitch">Memory Glitch</option>
                        </select>
                      </div>
                    </div>
                    <p className="leading-relaxed">{item.question.explanation}</p>
                  </div>

                  {/* Personal Study Notes */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {editingNoteId === item.questionId ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          placeholder="Add personal study note or trap reminder..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={() => handleSaveNote(item.questionId)}
                          className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full text-xs text-slate-400">
                        <span className="italic">{item.notes ? `Note: "${item.notes}"` : 'No study notes added yet.'}</span>
                        <button
                          onClick={() => {
                            setEditingNoteId(item.questionId);
                            setNoteText(item.notes || '');
                          }}
                          className="text-amber-400 hover:underline text-xs flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{item.notes ? 'Edit Note' : 'Add Note'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
