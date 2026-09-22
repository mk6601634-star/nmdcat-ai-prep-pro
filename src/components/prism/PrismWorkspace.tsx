import React, { useState, useEffect } from 'react';
import { 
  PrismKnowledgeLayer, 
  PrismGeneratedMaterials, 
  PrismSession, 
  SubjectType 
} from './prismTypes';
import { PrismSourceEvidenceView } from './PrismSourceEvidenceView';
import { PrismMaterialsView } from './PrismMaterialsView';
import { PrismQuizRunner } from './PrismQuizRunner';
import { PMDC_SYLLABUS_TOPICS } from '../../data/nmdcatData';
import { SavedMistake, ExamAttempt } from '../../types';
import { 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  FileText, 
  Search, 
  Layers, 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FolderOpen, 
  Trash2, 
  Save, 
  RefreshCw, 
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../../lib/aiRequest';
import { useAiRequestAction } from '../../lib/useAiRequestAction';
import { AiActionStatus } from '../AiActionStatus';
import { 
  saveUserPrismSession, 
  subscribeToUserPrismSessions, 
  deleteUserPrismSession 
} from '../../lib/firestoreService';
import type { User } from '../../lib/firebase';

export interface PrismWorkspaceProps {
  firebaseUser?: User | null;
  onSignIn?: () => void;
  savedMistakes?: SavedMistake[];
  setSavedMistakes?: React.Dispatch<React.SetStateAction<SavedMistake[]>>;
  setExamHistory?: React.Dispatch<React.SetStateAction<ExamAttempt[]>>;
  selectedSubject?: SubjectType;
  onSubjectChange?: (subject: SubjectType) => void;
}

export const PrismWorkspace: React.FC<PrismWorkspaceProps> = ({
  firebaseUser,
  onSignIn,
  savedMistakes = [],
  setSavedMistakes,
  setExamHistory,
  selectedSubject,
  onSubjectChange
}) => {
  // Stepper & Active Stage state
  const [activeStage, setActiveStage] = useState<'input' | 'evidence' | 'materials' | 'quiz' | 'saved'>('input');
  
  // Inputs
  const [subject, setSubject] = useState<SubjectType>(selectedSubject || 'Biology');

  useEffect(() => {
    if (selectedSubject && selectedSubject !== subject) {
      setSubject(selectedSubject);
    }
  }, [selectedSubject]);

  const handleSubjectChange = (newSubject: SubjectType) => {
    setSubject(newSubject);
    onSubjectChange?.(newSubject);
  };
  const [topic, setTopic] = useState<string>('Cell Membrane & Fluid Mosaic Model');
  const [textbookContent, setTextbookContent] = useState<string>(
    'The cell membrane follows the Fluid Mosaic Model proposed by Singer and Nicolson (1972). It is composed of a phospholipid bilayer with embedded intrinsic and extrinsic proteins. Phospholipids have hydrophilic polar phosphate heads and hydrophobic non-polar fatty acid tails. Carbohydrates form glycoproteins and glycolipids on the outer surface (glycocalyx). Cholesterol regulates membrane fluidity at varying temperatures. In plants and bacteria, active transport is driven by proton gradients.'
  );
  const [examReferences, setExamReferences] = useState<string>('PMDC NMDCAT Syllabus Section: Cell Structure and Function (Biomembranes and Transport Mechanisms).');
  const [externalSnippets, setExternalSnippets] = useState<string>('Biophysical studies show lipid rafts and membrane microdomains with distinct protein segregation.');
  const [generationMode, setGenerationMode] = useState<'SIMPLE' | 'ADVANCED' | 'ULTRA_ADVANCED'>('ADVANCED');

  // Synthesized outputs
  const [currentSession, setCurrentSession] = useState<PrismSession | null>(null);
  const [knowledgeLayer, setKnowledgeLayer] = useState<PrismKnowledgeLayer | null>(null);
  const [materials, setMaterials] = useState<PrismGeneratedMaterials | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);

  // Research queries
  const [researchQueries, setResearchQueries] = useState<string[]>([]);
  const [isLoadingQueries, setIsLoadingQueries] = useState(false);

  // Saved Sessions list
  const [savedSessions, setSavedSessions] = useState<PrismSession[]>(() => {
    try {
      const saved = localStorage.getItem('nmdcat_prism_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const prismAction = useAiRequestAction();

  // Sync saved sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nmdcat_prism_sessions', JSON.stringify(savedSessions));
    } catch {}
  }, [savedSessions]);

  // Subscribe to Firestore for signed in users
  useEffect(() => {
    if (!firebaseUser) return;
    const unsubscribe = subscribeToUserPrismSessions(firebaseUser.uid, (sessions) => {
      if (sessions && sessions.length > 0) {
        setSavedSessions(prev => {
          const map = new Map();
          [...prev, ...sessions].forEach(s => map.set(s.id, s));
          return Array.from(map.values());
        });
      }
    });
    return () => unsubscribe();
  }, [firebaseUser]);

  // Pre-fill quick preset topics
  const handleSelectPreset = (presetSubject: SubjectType, presetTopic: string, presetText: string, presetExam: string) => {
    setSubject(presetSubject);
    setTopic(presetTopic);
    setTextbookContent(presetText);
    setExamReferences(presetExam);
  };

  // Generate Supplementary Research Queries
  const handleFetchResearchQueries = async () => {
    if (isLoadingQueries || !topic) return;
    setIsLoadingQueries(true);

    try {
      const data = await aiFetch<{ success: boolean; queries: string[] }>('/api/prism/research-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic })
      });

      if (data && data.queries) {
        setResearchQueries(data.queries);
      }
    } catch (err) {
      console.warn('Failed to fetch research queries:', err);
    } finally {
      setIsLoadingQueries(false);
    }
  };

  // Run PRISM Synthesis
  const handleRunPrismSynthesis = async () => {
    if (prismAction.isLoading || !topic.trim()) return;

    try {
      const data = await prismAction.runRequest(
        async (signal) =>
          await aiFetch<{
            success: boolean;
            knowledgeLayer: PrismKnowledgeLayer;
            materials: PrismGeneratedMaterials;
            provider: string;
          }>('/api/prism/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject,
              topic,
              textbookContent,
              examReferences,
              externalSnippets,
              generationMode
            })
          }, { signal }),
        {
          pending: `Auditing sources & synthesizing verified knowledge for "${topic}"...`,
          success: 'PRISM Knowledge Synthesis complete! Sources audited and verified.',
          cancelled: 'PRISM synthesis cancelled.',
          failure: 'PRISM synthesis failed. Please retry.'
        }
      );

      if (data && data.knowledgeLayer && data.materials) {
        setKnowledgeLayer(data.knowledgeLayer);
        setMaterials(data.materials);
        setAiProvider(data.provider);

        const newSession: PrismSession = {
          id: `prism_sess_${Date.now()}`,
          userId: firebaseUser ? firebaseUser.uid : 'local_student',
          subject,
          topic,
          textbookInput: textbookContent,
          examReferenceInput: examReferences,
          externalSnippetsInput: externalSnippets,
          knowledgeLayer: data.knowledgeLayer,
          materials: data.materials,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          provider: data.provider
        };

        setCurrentSession(newSession);
        setSavedSessions(prev => [newSession, ...prev]);

        if (firebaseUser) {
          try {
            await saveUserPrismSession(firebaseUser.uid, newSession);
          } catch (e) {
            console.warn('Failed to background save PRISM session to Firestore', e);
          }
        }

        // Switch to Evidence View automatically
        setActiveStage('evidence');
      }
    } catch (err) {
      if (isAiRequestCancelled(err)) return;
      if (import.meta.env.DEV) console.error('PRISM synthesis failed:', err);
    }
  };

  const handleLoadSession = (session: PrismSession) => {
    setCurrentSession(session);
    setSubject(session.subject);
    setTopic(session.topic);
    setTextbookContent(session.textbookInput);
    setExamReferences(session.examReferenceInput || '');
    setExternalSnippets(session.externalSnippetsInput || '');
    setKnowledgeLayer(session.knowledgeLayer);
    setMaterials(session.materials);
    setAiProvider(session.provider || null);
    setActiveStage('evidence');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this PRISM session?')) return;
    setSavedSessions(prev => prev.filter(s => s.id !== sessionId));
    if (firebaseUser) {
      try {
        await deleteUserPrismSession(sessionId);
      } catch (e) {
        console.warn('Failed to delete PRISM session in Firestore', e);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* PRISM Top Navigation Banner */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PRISM Engine &bull; Precision Reference & Integrated Source-verified Material</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Source-Audited Knowledge Synthesis</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Synthesizes textbooks, PMDC exam standards, and peer-reviewed science with zero hallucinations and explicit conflict preservation.
            </p>
          </div>

          {/* Saved Sessions Counter & Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStage('saved')}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
            >
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <span>Saved Sessions ({savedSessions.length})</span>
            </button>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'input', label: '1. Input & Sources', icon: FileText },
            { id: 'evidence', label: '2. Audited Evidence & Conflicts', icon: ShieldCheck, disabled: !knowledgeLayer },
            { id: 'materials', label: '3. Generated Materials', icon: Layers, disabled: !materials },
            { id: 'quiz', label: '4. Practice Drill & Mistake Vault', icon: Brain, disabled: !materials?.mcqs?.length },
            { id: 'saved', label: '5. Session Vault', icon: FolderOpen }
          ].map(stg => {
            const Icon = stg.icon;
            const isActive = activeStage === stg.id;

            return (
              <button
                key={stg.id}
                onClick={() => !stg.disabled && setActiveStage(stg.id as any)}
                disabled={stg.disabled}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                    : stg.disabled
                      ? 'bg-slate-950/40 text-slate-600 border border-slate-900 cursor-not-allowed'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{stg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Status Banner */}
      <AiActionStatus
        statusMessage={prismAction.statusMessage}
        errorMessage={prismAction.errorMessage}
        isLoading={prismAction.isLoading}
      />

      {/* STAGE 1: INPUT WORKSPACE */}
      {activeStage === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Input Form */}
          <div className="lg:col-span-8 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Study Topic & Source Excerpts
              </h3>

              {/* Subject Selector */}
              <div className="flex items-center gap-1">
                {(['Biology', 'Chemistry', 'Physics'] as SubjectType[]).map(subj => (
                  <button
                    key={subj}
                    onClick={() => setSubject(subj)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      subject === subj
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Topic or Concept Name:</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Chemical Equilibrium / Fluid Mosaic Model / Projectile Motion"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
              />
            </div>

            {/* Prescribed Textbook Excerpt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Prescribed Textbook / Curriculum Content (Tier 2):
                </label>
                <span className="text-[10px] text-slate-500">Auto-filled or paste textbook section</span>
              </div>
              <textarea
                rows={4}
                value={textbookContent}
                onChange={(e) => setTextbookContent(e.target.value)}
                placeholder="Enter textbook sentences, formulas, reaction conditions, or definition statements..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans scrollbar-thin"
              />
            </div>

            {/* Official Exam Reference (Tier 1) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Official PMDC Exam Reference / Syllabus Guidelines (Tier 1):
              </label>
              <input
                type="text"
                value={examReferences}
                onChange={(e) => setExamReferences(e.target.value)}
                placeholder="PMDC Syllabus Learning Outcome & Past Exam Emphasis"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* External Research / Scientific Snippets (Tier 3) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                External Scientific Research / Literature Snippets (Tier 3 - Optional):
              </label>
              <input
                type="text"
                value={externalSnippets}
                onChange={(e) => setExternalSnippets(e.target.value)}
                placeholder="Peer-reviewed findings, IUPAC conventions, modern biophysics context"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Mode:</span>
                {(['SIMPLE', 'ADVANCED', 'ULTRA_ADVANCED'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setGenerationMode(m)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      generationMode === m ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRunPrismSynthesis}
                disabled={prismAction.isLoading || !topic.trim()}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:scale-105 text-slate-950 font-black rounded-xl text-xs shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prismAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{prismAction.isLoading ? 'Synthesizing Knowledge...' : 'Execute PRISM Synthesis'}</span>
              </button>
            </div>
          </div>

          {/* Sidebar: Presets & Research Queries Generator */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Presets */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Quick NMDCAT Benchmark Presets
              </h4>

              <div className="space-y-2">
                <button
                  onClick={() => handleSelectPreset(
                    'Biology',
                    'Cell Membrane & Fluid Mosaic Model',
                    'The cell membrane follows the Fluid Mosaic Model (Singer & Nicolson 1972). Composed of phospholipid bilayer with hydrophobic nonpolar tails and hydrophilic polar heads. Glycoproteins on outer surface form glycocalyx. Cholesterol regulates fluidity.',
                    'PMDC Syllabus: Cell Biology - Structure and Function of Biological Membranes.'
                  )}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all text-xs space-y-1"
                >
                  <span className="font-bold text-cyan-300 block">Biology: Fluid Mosaic Model</span>
                  <p className="text-[11px] text-slate-400 line-clamp-1">Lipid bilayer, cholesterol, membrane proteins</p>
                </button>

                <button
                  onClick={() => handleSelectPreset(
                    'Chemistry',
                    'Chemical Equilibrium & Le Chatelier Principle',
                    'At chemical equilibrium, the rate of forward reaction equals the rate of reverse reaction. Dynamic in nature. Kc depends ONLY on temperature. Adding catalyst increases rate but does NOT shift equilibrium or change Kc. According to Le Chatelier, shifting conditions causes the system to counteract change.',
                    'PMDC Syllabus: Chemical Equilibrium - Equilibrium Constant and Factors Affecting Equilibrium.'
                  )}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all text-xs space-y-1"
                >
                  <span className="font-bold text-emerald-300 block">Chemistry: Le Chatelier & Kc</span>
                  <p className="text-[11px] text-slate-400 line-clamp-1">Equilibrium constants, temperature effects, catalyst role</p>
                </button>

                <button
                  onClick={() => handleSelectPreset(
                    'Physics',
                    'Work and Energy / Gravitational Potential Energy',
                    'Work is scalar product of Force and Displacement (W = F.d = Fd cos theta). Work is zero when force is perpendicular to displacement. Gravitational potential energy U = mgh near Earth surface, but absolute gravitational PE = -GMm/r. Work-energy theorem states total work equals change in kinetic energy.',
                    'PMDC Syllabus: Work & Energy - Work done by constant and variable force, conservative forces.'
                  )}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all text-xs space-y-1"
                >
                  <span className="font-bold text-indigo-300 block">Physics: Work & Energy</span>
                  <p className="text-[11px] text-slate-400 line-clamp-1">Dot product, conservative forces, PE derivations</p>
                </button>
              </div>
            </div>

            {/* Targeted Supplementary Research Queries Generator */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  Supplementary Inquiries
                </h4>
                <button
                  onClick={handleFetchResearchQueries}
                  disabled={isLoadingQueries}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  {isLoadingQueries ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Generate</span>
                </button>
              </div>

              {researchQueries.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  Generate 6-10 targeted inquiries to uncover historical exceptions, distractor traps, and numerical constants for this topic.
                </p>
              ) : (
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  {researchQueries.map((q, idx) => (
                    <li key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: EVIDENCE & CONFLICT MATRIX VIEW */}
      {activeStage === 'evidence' && knowledgeLayer && (
        <div className="space-y-6">
          <PrismSourceEvidenceView knowledgeLayer={knowledgeLayer} />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStage('materials')}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <span>Proceed to Study Materials</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: GENERATED STUDY MATERIALS VIEW */}
      {activeStage === 'materials' && materials && (
        <div className="space-y-6">
          <PrismMaterialsView
            materials={materials}
            topic={topic}
            subject={subject}
            firebaseUser={firebaseUser}
            onSignIn={onSignIn}
          />

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStage('evidence')}
              className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
            >
              Back to Evidence View
            </button>

            {materials.mcqs?.length > 0 && (
              <button
                onClick={() => setActiveStage('quiz')}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:scale-105 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform"
              >
                <Brain className="w-4 h-4" />
                <span>Start Interactive PRISM Quiz</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 4: QUIZ RUNNER & MISTAKE VAULT INTEGRATION */}
      {activeStage === 'quiz' && materials?.mcqs && (
        <div className="space-y-6">
          <PrismQuizRunner
            questions={materials.mcqs}
            topic={topic}
            subject={subject}
            savedMistakes={savedMistakes}
            setSavedMistakes={setSavedMistakes}
            firebaseUser={firebaseUser}
            setExamHistory={setExamHistory}
            onSignIn={onSignIn}
            onResetQuiz={() => {}}
          />

          <div className="flex justify-start pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveStage('materials')}
              className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
            >
              Back to Study Materials
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: SAVED SESSIONS VAULT */}
      {activeStage === 'saved' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              Saved PRISM Syntheses Vault
            </h3>
            <span className="text-xs text-slate-400">{savedSessions.length} total saved</span>
          </div>

          {savedSessions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-slate-600" />
              <p>No saved PRISM sessions yet. Synthesize any topic to record verified study material.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
                        {sess.subject}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(sess.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{sess.topic}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{sess.knowledgeLayer?.verifiedSummary}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-900 text-xs">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{sess.materials?.mcqs?.length || 0} MCQs</span>
                      <span>&bull;</span>
                      <span>{sess.materials?.flashcards?.length || 0} Cards</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleLoadSession(sess)}
                        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
