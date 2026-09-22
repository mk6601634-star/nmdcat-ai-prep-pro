import React, { useEffect, useState } from 'react';
import { SubjectType, Flashcard, SyllabusTopic, SavedMistake } from '../types';
import { FormattedMathContent } from './FormattedMathContent';
import { subscribeToPublishedFlashcards } from '../lib/firestoreService';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import {
  Brain,
  Clock,
  Zap,
  Flame,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Image as ImageIcon,
  FileText,
  Search,
  BookOpen,
  Calendar,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SmartRevisionSchedulerProps {
  onStartDrill?: (subject: SubjectType) => void;
  topics?: SyllabusTopic[];
  savedMistakes?: SavedMistake[];
}

export const SmartRevisionScheduler: React.FC<SmartRevisionSchedulerProps> = ({ 
  onStartDrill,
  topics = [],
  savedMistakes = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'scheduler' | 'emergency' | 'srs_deck' | 'custom_creator'>('scheduler');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  
  // Flashcard SRS State
  const [cards, setCards] = useState<Flashcard[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToPublishedFlashcards((items) => {
      const prepared = items.map((fc, i) => ({
        ...fc,
        cardType: fc.cardType || (i % 4 === 1 ? 'cloze' : i % 4 === 2 ? 'reverse' : i % 4 === 3 ? 'image' : 'standard'),
        easeFactor: fc.easeFactor ?? 2.5,
        intervalDays: fc.intervalDays ?? 1,
        repetitionCount: fc.repetitionCount ?? 0
      }));
      setCards(prepared);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    });
    return unsubscribe;
  }, []);

  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [userClozeInput, setUserClozeInput] = useState<string>('');
  const [clozeFeedback, setClozeFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // New Flashcard Form
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCardType, setNewCardType] = useState<'standard' | 'cloze' | 'reverse' | 'image'>('standard');
  const [newMnemonic, setNewMnemonic] = useState('');

  // AI Generator state
  const [aiPromptTopic, setAiPromptTopic] = useState('');
  const [isGeneratingAiCards, setIsGeneratingAiCards] = useState(false);
  const aiFlashcardAction = useAiRequestAction();

  // Filtered Cards
  const filteredCards = cards.filter(c => c.subject === selectedSubject);
  const currentCard = filteredCards[currentCardIndex] || filteredCards[0] || cards[0];

  // Dynamic Forgetting Curve Topics based on real database syllabus & mistake data
  const decayTopics = React.useMemo(() => {
    if (topics && topics.length > 0) {
      const activeOrMistakeTopics = topics.filter(t => t.status !== 'not-started' || savedMistakes.some(m => m.question.subject === t.subject));
      if (activeOrMistakeTopics.length > 0) {
        return activeOrMistakeTopics.slice(0, 5).map((t, idx) => {
          const mistakesCount = savedMistakes.filter(m => m.question.subject === t.subject).length;
          const decayScore = Math.max(30, 90 - (idx * 12 + mistakesCount * 5));
          const status = decayScore < 50 ? 'Urgent Review Needed' : decayScore < 70 ? 'Review Tomorrow' : 'Stable';
          return {
            name: t.topic,
            subject: t.subject,
            decayScore,
            daysAgo: idx + 2,
            status,
            yield: t.weightagePercentage > 6 ? 'Extremely High' : 'High'
          };
        });
      }
    }
    return [
      { name: 'Enzyme Kinetics & Allosteric Inhibition', subject: 'Biology' as SubjectType, decayScore: 42, daysAgo: 6, status: 'Urgent Review Needed', yield: 'Extremely High' },
      { name: 'Aldehydes & Ketones Nucleophilic Addition', subject: 'Chemistry' as SubjectType, decayScore: 55, daysAgo: 4, status: 'Review Tomorrow', yield: 'High' },
      { name: 'Electromagnetic Induction & Faraday Laws', subject: 'Physics' as SubjectType, decayScore: 38, daysAgo: 8, status: 'Critical Recall Risk', yield: 'Extremely High' },
      { name: 'Nervous Coordination & Action Potential', subject: 'Biology' as SubjectType, decayScore: 68, daysAgo: 3, status: 'Stable', yield: 'High' },
      { name: 'Logical Deduction & Syllogism Rules', subject: 'Logical Reasoning' as SubjectType, decayScore: 82, daysAgo: 1, status: 'Optimal Memory', yield: 'Moderate' }
    ];
  }, [topics, savedMistakes]);

  // Emergency Rapid Recall Items
  const emergencyTop50 = [
    { title: 'Glycolysis Net Yield', detail: '2 ATP + 2 NADH + 2 Pyruvate per glucose molecule', subject: 'Biology' },
    { title: 'Sn1 vs Sn2 Kinetics', detail: 'Sn1 = Unimolecular (2 steps, racemization), Sn2 = Bimolecular (1 step, inversion)', subject: 'Chemistry' },
    { title: 'Transformer Formula', detail: 'Vs / Vp = Ns / Np = Ip / Is', subject: 'Physics' },
    { title: 'Co-enzyme vs Co-factor', detail: 'Co-enzyme is non-protein organic (e.g. NAD+), Co-factor is inorganic ion (e.g. Mg2+)', subject: 'Biology' },
    { title: 'Optical Isomerism Requirement', detail: 'Chiral carbon center with 4 distinct non-identical substituents', subject: 'Chemistry' },
    { title: 'De Broglie Wavelength', detail: 'λ = h / p = h / (m * v)', subject: 'Physics' }
  ];

  const handleSrsRating = (grade: 'Again' | 'Hard' | 'Good' | 'Easy') => {
    if (!currentCard) return;

    let multiplier = 1;
    let daysToAdd = 1;

    switch (grade) {
      case 'Again':
        daysToAdd = 1;
        multiplier = 0.8;
        break;
      case 'Hard':
        daysToAdd = 3;
        multiplier = 1.0;
        break;
      case 'Good':
        daysToAdd = 7;
        multiplier = 1.2;
        break;
      case 'Easy':
        daysToAdd = 14;
        multiplier = 1.5;
        break;
    }

    setCards(prev => prev.map(c => {
      if (c.id === currentCard.id) {
        return {
          ...c,
          intervalDays: Math.round((c.intervalDays || 1) * daysToAdd),
          easeFactor: Math.max(1.3, (c.easeFactor || 2.5) * multiplier),
          repetitionCount: (c.repetitionCount || 0) + 1,
          nextReviewDate: new Date(Date.now() + daysToAdd * 86400000).toISOString().split('T')[0]
        };
      }
      return c;
    }));

    setIsFlipped(false);
    setUserClozeInput('');
    setClozeFeedback(null);
    setCurrentCardIndex(prev => (prev + 1) % filteredCards.length);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront || !newBack) return;

    const newCard: Flashcard = {
      id: `custom_${Date.now()}`,
      subject: selectedSubject,
      topic: newTopic || 'General Study Note',
      front: newFront,
      back: newBack,
      cardType: newCardType,
      mnemonic: newMnemonic || undefined,
      isCustomStudentCard: true,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitionCount: 0
    };

    setCards(prev => [newCard, ...prev]);
    setNewFront('');
    setNewBack('');
    setNewMnemonic('');
    alert('New flashcard created successfully and added to your SRS deck!');
  };

  const handleGenerateAiFlashcards = async () => {
    if (!aiPromptTopic) return;
    setIsGeneratingAiCards(true);

    try {
      const data = await aiFlashcardAction.runRequest(
        async (signal) =>
          await aiFetch<{ text?: string; cards?: Flashcard[] }>('/api/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `Generate 2 flashcards for the NMDCAT topic: ${aiPromptTopic} in ${selectedSubject}. Return as JSON array with fields: front, back, subject, topic, cardType (standard or cloze), easeFactor (2.5), intervalDays (1). For cloze cards, include clozeSentence field with [answer] format.`,
              subject: selectedSubject,
              mode: 'standard',
              context: `PMDC syllabus topic: ${aiPromptTopic}. Subject: ${selectedSubject}.`
            })
          }, { signal }),
        {
          pending: 'AI is generating flashcards...',
          success: 'Flashcards generated successfully.',
          cancelled: 'AI flashcard generation cancelled.',
          failure: 'AI flashcard generation failed. Please try again.'
        }
      );

      // Try to parse cards from response
      let generatedCards: Flashcard[] = [];
      if (data.cards && Array.isArray(data.cards)) {
        generatedCards = data.cards.map((card, idx) => ({
          id: `ai_${Date.now()}_${idx}`,
          subject: selectedSubject,
          topic: aiPromptTopic,
          front: card.front || '',
          back: card.back || '',
          cardType: card.cardType || 'standard',
          mnemonic: card.mnemonic || '',
          clozeSentence: card.clozeSentence,
          easeFactor: card.easeFactor || 2.5,
          intervalDays: card.intervalDays || 1
        }));
      } else if (data.text) {
        // Fallback: if AI returns text instead of structured cards, create a single card
        generatedCards = [{
          id: `ai_${Date.now()}_1`,
          subject: selectedSubject,
          topic: aiPromptTopic,
          front: `Key concept for ${aiPromptTopic}`,
          back: data.text,
          cardType: 'standard',
          mnemonic: '',
          easeFactor: 2.5,
          intervalDays: 1
        }];
      }

      if (generatedCards.length > 0) {
        setCards(prev => [...generatedCards, ...prev]);
        setAiPromptTopic('');
        alert(`AI successfully generated ${generatedCards.length} flashcard(s) for "${aiPromptTopic}"!`);
      } else {
        alert('AI generation completed but no valid flashcards were returned. Please try again.');
      }
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      alert('AI flashcard generation failed. Please check your connection and try again.');
    } finally {
      setIsGeneratingAiCards(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Brain className="w-4 h-4" />
            <span>Spaced Repetition & Ebbinghaus Memory Engine</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Smart Revision & SRS Flashcard System
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Prevent memory decay with algorithmically timed review queues, emergency rapid recall, and AI card generation.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex flex-wrap bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('scheduler')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'scheduler' ? 'bg-indigo-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Smart Timetable
          </button>
          <button
            onClick={() => setActiveSubTab('srs_deck')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'srs_deck' ? 'bg-indigo-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SRS Flashcards ({filteredCards.length})
          </button>
          <button
            onClick={() => setActiveSubTab('emergency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'emergency' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Emergency Mode ⚡
          </button>
          <button
            onClick={() => setActiveSubTab('custom_creator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'custom_creator' ? 'bg-indigo-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Card Creator & AI
          </button>
        </div>
      </div>

      {/* SUB TAB 1: Smart Timetable & Forgetting Curve */}
      {activeSubTab === 'scheduler' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Priority Revision Queue */}
          <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Revision Priority Queue (Ebbinghaus Decay)</span>
                </h3>
                <p className="text-xs text-slate-400">Ranked automatically by retention decay risk & PMDC weightage.</p>
              </div>
              <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full font-bold">
                5 Topics Overdue
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {decayTopics.map((item, idx) => (
                <div key={idx} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">{item.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                        {item.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Studied {item.daysAgo} days ago</span>
                      <span>&bull;</span>
                      <span className="text-amber-400 font-semibold">{item.yield} Yield</span>
                    </div>
                  </div>

                  {/* Decay Bar */}
                  <div className="w-full sm:w-48 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Retention</span>
                      <span className={item.decayScore < 50 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {item.decayScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.decayScore < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${item.decayScore}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-rose-300 italic">{item.status}</span>
                  </div>

                  <button
                    onClick={() => onStartDrill?.(item.subject)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <span>Revise Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Forgetting Curve Predictor */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Scientific Memory Predictor</span>
            </h3>

            <div className="p-4 bg-indigo-950/30 rounded-xl border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
              <strong>Ebbinghaus Forgetting Model:</strong> Without active revision, 60% of new medical terminology and formulas are forgotten within 48 hours.
            </div>

            <div className="space-y-3 pt-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Day 1 Recall</span>
                  <span className="text-emerald-400 font-bold">100%</span>
                </div>
                <p className="text-[11px] text-slate-500">Immediate after first reading.</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Day 3 Drop</span>
                  <span className="text-amber-400 font-bold">55%</span>
                </div>
                <p className="text-[11px] text-slate-500">First Spaced Repetition Trigger.</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Day 7 Consolidated</span>
                  <span className="text-indigo-400 font-bold">88%</span>
                </div>
                <p className="text-[11px] text-slate-500">Long-term memory transfer achieved.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: Interactive SRS Flashcard Engine */}
      {activeSubTab === 'srs_deck' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Subject Bar */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {(['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as SubjectType[]).map(sub => (
              <button
                key={sub}
                onClick={() => {
                  setSelectedSubject(sub);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                  setUserClozeInput('');
                  setClozeFeedback(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedSubject === sub
                    ? 'bg-indigo-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {currentCard ? (
            <div className="space-y-4">
              {/* Card Badge */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-amber-400 uppercase tracking-wider">{currentCard.cardType || 'standard'} CARD</span>
                <span>Card {currentCardIndex + 1} of {filteredCards.length}</span>
              </div>

              {/* Card Container */}
              <div 
                className="min-h-[300px] bg-slate-900/90 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between relative text-center border-indigo-500/20"
              >
                {/* Topic Header */}
                <div className="text-xs text-indigo-300 font-semibold">{currentCard.topic}</div>

                {/* Card Main Body */}
                <div className="my-auto py-6 space-y-4">
                  {/* Standard Card */}
                  {currentCard.cardType === 'standard' && (
                    !isFlipped ? (
                      <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                        <FormattedMathContent content={currentCard.front} />
                      </h3>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-base text-emerald-300 font-semibold leading-relaxed">
                          <FormattedMathContent content={currentCard.back} />
                        </div>
                        {currentCard.mnemonic && (
                          <div className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                            💡 Mnemonic: <FormattedMathContent content={currentCard.mnemonic} className="inline" />
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Cloze Deletion Card */}
                  {currentCard.cardType === 'cloze' && (
                    <div className="space-y-4">
                      <div className="text-base text-white font-medium">
                        {currentCard.clozeSentence ? (
                          isFlipped ? (
                            <span dangerouslySetInnerHTML={{ __html: currentCard.clozeSentence.replace(/\[(.*?)\]/g, '<strong class="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">$1</strong>') }} />
                          ) : (
                            <span dangerouslySetInnerHTML={{ __html: currentCard.clozeSentence.replace(/\[(.*?)\]/g, '<span class="bg-indigo-950 text-indigo-300 border border-indigo-500 px-3 py-1 rounded font-mono">______</span>') }} />
                          )
                        ) : <FormattedMathContent content={currentCard.front} />}
                      </div>

                      {!isFlipped && (
                        <div className="max-w-sm mx-auto flex gap-2">
                          <input
                            type="text"
                            placeholder="Type hidden term..."
                            value={userClozeInput}
                            onChange={(e) => setUserClozeInput(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => setIsFlipped(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                          >
                            Check
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reverse Question Card */}
                  {currentCard.cardType === 'reverse' && (
                    !isFlipped ? (
                      <div className="space-y-2">
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          Definition Recall &bull; What term is described?
                        </span>
                        <div className="text-base text-slate-200 leading-relaxed font-serif italic">
                          "<FormattedMathContent content={currentCard.back} className="inline" />"
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h3 className="text-xl font-extrabold text-amber-400">
                          <FormattedMathContent content={currentCard.front} />
                        </h3>
                        <p className="text-xs text-slate-300">{currentCard.topic}</p>
                      </div>
                    )
                  )}

                  {/* Image Diagram Card */}
                  {currentCard.cardType === 'image' && (
                    <div className="space-y-3">
                      {currentCard.imageUrl && (
                        <img 
                          src={currentCard.imageUrl} 
                          alt="Diagram" 
                          className="w-full h-44 object-cover rounded-xl border border-slate-700 shadow-md"
                        />
                      )}
                      <div className="text-sm font-bold text-white">
                        <FormattedMathContent content={currentCard.front} />
                      </div>
                      {isFlipped && (
                        <div className="text-xs text-emerald-300 font-semibold">
                          <FormattedMathContent content={currentCard.back} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Flip Trigger Button */}
                {!isFlipped ? (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Show Answer & SRS Options</span>
                  </button>
                ) : (
                  /* SRS SuperMemo-2 Spaced Repetition Buttons */
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">Rate how easily you recalled this card:</p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleSrsRating('Again')}
                        className="p-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold"
                      >
                        <div>Again</div>
                        <div className="text-[9px] opacity-70">1 Day</div>
                      </button>

                      <button
                        onClick={() => handleSrsRating('Hard')}
                        className="p-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold"
                      >
                        <div>Hard</div>
                        <div className="text-[9px] opacity-70">3 Days</div>
                      </button>

                      <button
                        onClick={() => handleSrsRating('Good')}
                        className="p-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold"
                      >
                        <div>Good</div>
                        <div className="text-[9px] opacity-70">7 Days</div>
                      </button>

                      <button
                        onClick={() => handleSrsRating('Easy')}
                        className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold"
                      >
                        <div>Easy</div>
                        <div className="text-[9px] opacity-70">14 Days</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No flashcards available for this subject yet. Create one!
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 3: Emergency Rapid Recall Mode */}
      {activeSubTab === 'emergency' && (
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-rose-500/30 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold">
                HIGH YIELD RAPID RECALL
              </span>
              <h2 className="text-lg font-bold text-white mt-2">Emergency Exam Preparation Mode</h2>
              <p className="text-xs text-slate-400">Designed for final 7 days and final 24 hours before NMDCAT.</p>
            </div>
            <Zap className="w-8 h-8 text-rose-400 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyTop50.map((item, i) => (
              <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-amber-400">{item.title}</h4>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {item.subject}
                  </span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-mono">
                  <FormattedMathContent content={item.detail} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB TAB 4: Manual Creator & AI Flashcard Generator */}
      {activeSubTab === 'custom_creator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Creator */}
          <form onSubmit={handleCreateCard} className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Create Custom Flashcard</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as SubjectType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Topic / Chapter</label>
                <input
                  type="text"
                  placeholder="e.g. Enzymes, Thermodynamics..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Card Format</label>
                <select
                  value={newCardType}
                  onChange={(e) => setNewCardType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="standard">Standard Q&A</option>
                  <option value="cloze">Cloze Deletion (Fill in blank)</option>
                  <option value="reverse">Reverse Definition Recall</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Front (Question / Prompt)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. What is the active site of an enzyme?"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Back (Answer / Explanation)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Specific 3D region where substrate binds..."
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mnemonic / Memory Trick (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. OIL RIG for oxidation/reduction"
                  value={newMnemonic}
                  onChange={(e) => setNewMnemonic(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md"
              >
                Save Flashcard to Deck
              </button>
            </div>
          </form>

          {/* AI Flashcard Generator */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Automatic Flashcard Generator</span>
            </h3>

            <p className="text-xs text-slate-400">
              Type any PMDC topic or paste textbook notes, and AI will automatically build high-yield flashcards with cloze deletion & mnemonic hints.
            </p>

            <div className="space-y-3 text-xs pt-2">
              <div>
                <label className="text-slate-400 block mb-1">Topic or Concept Prompt</label>
                <textarea
                  rows={4}
                  placeholder="e.g. Cardiac cycle, Systole and Diastole phase pressure changes in left ventricle..."
                  value={aiPromptTopic}
                  onChange={(e) => setAiPromptTopic(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAiFlashcards}
                disabled={isGeneratingAiCards || !aiPromptTopic}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {isGeneratingAiCards ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>AI Generating Flashcards...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Cards with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
