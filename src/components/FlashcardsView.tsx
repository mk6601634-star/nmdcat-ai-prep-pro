import React, { useEffect, useState } from 'react';
import { SubjectType, Flashcard, EnglishVocabWord, AdminContentStatus } from '../types';
import { subscribeToPublishedFlashcards, subscribeToPublishedVocab, saveUserFlashcards, subscribeToUserFlashcards, deleteUserContent } from '../lib/firestoreService';
import { aiFetch, getAiFriendlyMessage } from '../lib/aiRequest';
import { 
  Library, 
  RotateCw, 
  Volume2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  BookOpen, 
  Sparkles,
  Dna,
  FlaskConical,
  Zap,
  Languages,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  LogIn
} from 'lucide-react';
import type { User } from '../lib/firebase';

interface FlashcardsViewProps {
  firebaseUser?: User | null;
  onSignIn?: () => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ firebaseUser, onSignIn }) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'vocab'>('cards');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [vocabSearch, setVocabSearch] = useState<string>('');
  const [publishedFlashcards, setPublishedFlashcards] = useState<Array<Flashcard & { id: string; status?: AdminContentStatus }>>([]);
  const [publishedVocab, setPublishedVocab] = useState<Array<EnglishVocabWord & { id: string; status?: AdminContentStatus }>>([]);
  const [userFlashcards, setUserFlashcards] = useState<Array<Flashcard & { id: string }>>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_user_flashcards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage synced with userFlashcards
  useEffect(() => {
    try {
      localStorage.setItem('nmdcat_user_flashcards', JSON.stringify(userFlashcards));
    } catch {}
  }, [userFlashcards]);

  // AI Generation State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'NORMAL' | 'ADVANCED' | 'ULTRA_ADVANCED'>('NORMAL');
  const [aiQuantity, setAiQuantity] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlashcards, setGeneratedFlashcards] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPublishedFlashcards((items) => {
      if (items && items.length > 0) {
        setPublishedFlashcards(items);
        setCardIndex(0);
        setIsFlipped(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPublishedVocab((items) => {
      if (items) {
        setPublishedVocab(items);
      }
    });
    return unsubscribe;
  }, []);

  // Load user flashcards from Firestore when authenticated
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribe = subscribeToUserFlashcards(firebaseUser.uid, (remoteItems) => {
      if (remoteItems && remoteItems.length > 0) {
        setUserFlashcards(prev => {
          const map = new Map();
          // Merge local and remote
          [...prev, ...remoteItems].forEach(c => map.set(c.id, c));
          return Array.from(map.values());
        });
      }
    });
    return unsubscribe;
  }, [firebaseUser]);

  // Combine published and user flashcards
  const sourceFlashcards = [...publishedFlashcards, ...userFlashcards];
  const allFlashcards = sourceFlashcards.length > 0 ? sourceFlashcards : [];
  const filteredCards = allFlashcards.filter(fc => fc.subject === selectedSubject);
  const currentCard = filteredCards[cardIndex] || allFlashcards[0] || {
    id: 'fallback',
    subject: selectedSubject,
    topic: 'No content available',
    front: 'No flashcards found for this subject yet. Generate your own or check back after the admin team publishes flashcards.',
    back: 'Use the AI generation feature to create flashcards for any topic.',
    cardType: 'standard'
  };

  const filteredVocab = publishedVocab.filter((v) =>
    v.word.toLowerCase().includes(vocabSearch.toLowerCase()) ||
    v.meaning.toLowerCase().includes(vocabSearch.toLowerCase())
  );

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  const getSubjectIcon = (sub: SubjectType) => {
    switch (sub) {
      case 'Biology': return <Dna className="w-4 h-4 text-emerald-400" />;
      case 'Chemistry': return <FlaskConical className="w-4 h-4 text-teal-400" />;
      case 'Physics': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'English': return <Languages className="w-4 h-4 text-indigo-400" />;
      default: return <BookOpen className="w-4 h-4 text-slate-400" />;
    }
  };

  // AI Generation
  const handleGenerateFlashcards = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setGeneratedFlashcards([]);

    try {
      const data = await aiFetch<{ flashcards?: any[] }>('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          topic: aiTopic,
          difficultyMode: aiDifficulty,
          quantity: aiQuantity
        })
      });

      setGeneratedFlashcards(data.flashcards || []);
    } catch (err: any) {
      setAiError(getAiFriendlyMessage(err) || err.message || 'Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveFlashcards = async () => {
    if (generatedFlashcards.length === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const flashcardsToSave = generatedFlashcards.map((fc: any, idx: number) => ({
        id: `card_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        subject: selectedSubject,
        topic: aiTopic,
        front: fc.front,
        back: fc.back,
        keyFormulaOrConcept: fc.explanation,
        cardType: 'standard' as const,
        createdAt: new Date().toISOString()
      }));

      // Always save to state and localStorage
      setUserFlashcards(prev => [...flashcardsToSave, ...prev]);

      // If signed in, also sync to Cloud Firestore
      if (firebaseUser) {
        saveUserFlashcards(firebaseUser.uid, flashcardsToSave).catch(e => {
          console.warn('[Firestore] Background cloud save error:', e);
        });
      }

      setSaveSuccess(true);
      setGeneratedFlashcards([]);
      setShowAiPanel(false);
      setAiTopic('');
    } catch (err: any) {
      setAiError(err.message || 'Failed to save flashcards');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFlashcard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;

    // Delete from state and localStorage immediately
    setUserFlashcards(prev => prev.filter(c => c.id !== cardId));

    if (firebaseUser) {
      deleteUserContent('userFlashcards', cardId).catch(e => {
        console.warn('[Firestore] Background delete error:', e);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <Library className="w-4 h-4" />
            <span>High-Yield Revision Deck</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Flashcards & English Vocabulary
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Master high-yield formulas, key biological concepts, chemical reactivity rules, and PMDC vocabulary list.
          </p>
        </div>

        {/* AI Generate Button */}
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate with AI</span>
        </button>

        {/* Tab Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cards'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Subject Flashcards
          </button>
          <button
            onClick={() => setActiveTab('vocab')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'vocab'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PMDC Vocab Deck
          </button>
        </div>
      </div>

      {/* Tab 1: Subject Flashcards */}
      {activeTab === 'cards' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Subject Bar */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {(['Biology', 'Chemistry', 'Physics', 'English'] as SubjectType[]).map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setSelectedSubject(sub);
                  setCardIndex(0);
                  setIsFlipped(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedSubject === sub
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {getSubjectIcon(sub)}
                <span>{sub}</span>
              </button>
            ))}
          </div>

          {/* AI Generation Panel */}
          {showAiPanel && (
            <div className="bg-slate-900/90 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Flashcards with AI</span>
                </div>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Topic</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g., Cell membrane transport, CRISPR gene editing"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Difficulty Mode</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['NORMAL', 'ADVANCED', 'ULTRA_ADVANCED'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setAiDifficulty(mode)}
                        className={`p-2 rounded-lg text-xs font-bold transition-all ${
                          aiDifficulty === mode
                            ? 'bg-indigo-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Number of Cards</label>
                  <div className="flex gap-2 mt-2">
                    {[5, 10, 20, 50].map((count) => (
                      <button
                        key={count}
                        onClick={() => setAiQuantity(count)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                          aiQuantity === count
                            ? 'bg-indigo-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateFlashcards}
                  disabled={isGenerating || !aiTopic.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Flashcards</span>
                    </>
                  )}
                </button>

                {aiError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{aiError}</span>
                  </div>
                )}

                {generatedFlashcards.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{generatedFlashcards.length} flashcards generated</span>
                    </div>
                    <button
                      onClick={handleSaveFlashcards}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>Save to My Flashcards</span>
                        </>
                      )}
                    </button>

                    {!firebaseUser && (
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-slate-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-emerald-400">Local Deck Saving Active</p>
                          <p className="text-slate-400 mt-0.5">Cards save to your local browser storage. Sign in with Google to sync across all devices.</p>
                        </div>
                        {onSignIn && (
                          <button
                            onClick={onSignIn}
                            className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold rounded-lg text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Sign In</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[280px] bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between relative hover:border-amber-500/40 transition-all text-center"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-amber-400">{currentCard.topic}</span>
              <div className="flex items-center gap-2">
                {userFlashcards.some(uf => uf.id === currentCard.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFlashcard(currentCard.id);
                    }}
                    className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
                <span className="flex items-center gap-1 text-[11px] bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  <RotateCw className="w-3 h-3 text-amber-400" />
                  <span>Click to Flip</span>
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div className="my-auto py-6 space-y-4">
              {!isFlipped ? (
                <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                  {currentCard.front}
                </h3>
              ) : (
                <div className="space-y-3">
                  <p className="text-base text-emerald-300 font-semibold leading-relaxed">
                    {currentCard.back}
                  </p>
                  {currentCard.keyFormulaOrConcept && (
                    <div className="p-3 bg-slate-800/80 rounded-xl text-xs text-slate-300 font-mono border border-slate-700/60">
                      {currentCard.keyFormulaOrConcept}
                    </div>
                  )}
                  {currentCard.mnemonic && (
                    <div className="text-xs text-amber-400 font-medium">
                      Mnemonic: {currentCard.mnemonic}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500">
              Card {cardIndex + 1} of {filteredCards.length}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setCardIndex(prev => Math.max(0, prev - 1));
                setIsFlipped(false);
              }}
              disabled={cardIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => {
                setIsFlipped(!isFlipped);
              }}
              className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
            >
              Flip Card
            </button>

            <button
              onClick={() => {
                setCardIndex(prev => Math.min(filteredCards.length - 1, prev + 1));
                setIsFlipped(false);
              }}
              disabled={cardIndex === filteredCards.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: PMDC Vocabulary Deck */}
      {activeTab === 'vocab' && (
        <div className="space-y-6">
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vocabulary word or meaning..."
              value={vocabSearch}
              onChange={(e) => setVocabSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVocab.length > 0 ? filteredVocab.map(v => (
              <div key={v.id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-white">{v.word}</h3>
                    <span className="text-[10px] italic text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {v.pos}
                    </span>
                  </div>

                  <button
                    onClick={() => speakWord(v.word)}
                    className="p-2 text-amber-400 hover:text-amber-300 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">{v.meaning}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                    <span className="font-bold text-emerald-400">Synonyms: </span>
                    <span className="text-slate-300">{v.synonyms.join(', ')}</span>
                  </div>
                  <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                    <span className="font-bold text-rose-400">Antonyms: </span>
                    <span className="text-slate-300">{v.antonyms.join(', ')}</span>
                  </div>
                </div>

                <div className="text-xs italic text-indigo-300 bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-500/20">
                  "{v.medicalSentence}"
                </div>
              </div>
            )) : (
              <div className="col-span-full p-6 bg-slate-900/90 rounded-3xl border border-slate-800 text-center text-slate-400">
                No published PMDC vocabulary is available yet. Please check back after the admin team publishes the vocabulary deck.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
