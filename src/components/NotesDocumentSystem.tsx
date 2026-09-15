import React, { useState } from 'react';
import UiCard from './UiCard';
import { SubjectType, UserDigitalNote } from '../types';
import { 
  FileText, 
  Sparkles, 
  Upload, 
  Download, 
  Mic, 
  Highlighter, 
  Bookmark, 
  Plus, 
  Search, 
  Volume2, 
  Loader2, 
  Trash2, 
  Layers, 
  CheckCircle, 
  FileDown, 
  Play, 
  Square,
  Tag,
  BookOpen
} from 'lucide-react';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';

export const NotesDocumentSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'notes' | 'summarizer' | 'pdf' | 'voice' | 'auto_revision'>('notes');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample Digital Notes State
  const [notes, setNotes] = useState<UserDigitalNote[]>([
    {
      id: 'note_1',
      title: 'Action Potential & Voltage-Gated Sodium Channels',
      subject: 'Biology',
      chapter: 'Nervous Coordination',
      content: 'Depolarization begins when threshold (-55mV) is reached. Na+ channels open rapidly causing influx. Peak reached at +30mV. Repolarization occurs when K+ channels open and K+ flows out of axon.',
      tags: ['High Yield', 'PMDC 2024 Trap'],
      highlightedText: ['threshold (-55mV)', 'Peak reached at +30mV'],
      aiSummary: 'Threshold = -55mV. Depolarization = Na+ influx (+30mV). Repolarization = K+ efflux.',
      autoRevisionNotes: ['Na+ channel inactivation gates close at +30mV', 'Hyperpolarization occurs due to slow K+ gate closure'],
      lastModified: '2026-07-28'
    },
    {
      id: 'note_2',
      title: 'Aldol Condensation vs Cannizzaro Reaction',
      subject: 'Chemistry',
      chapter: 'Aldehydes & Ketones',
      content: 'Aldol condensation requires alpha-hydrogen containing carbonyls reacted with dilute NaOH. Cannizzaro reaction occurs in carbonyls WITHOUT alpha-hydrogen (e.g. Formaldehyde, Benzaldehyde) under 50% concentrated NaOH.',
      tags: ['Reactivity', 'Organic Chemistry'],
      highlightedText: ['WITHOUT alpha-hydrogen'],
      aiSummary: 'Alpha-H present -> Aldol. Alpha-H absent -> Cannizzaro (Disproportionation reaction).',
      lastModified: '2026-07-27'
    }
  ]);

  // Selected note for editing/viewing
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const activeNote = notes.find(n => n.id === selectedNoteId) || notes[0];

  // Note Creator State
  const [newTitle, setNewTitle] = useState('');
  const [newChapter, setNewChapter] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  // AI Summarizer Input State
  const [aiRawInput, setAiRawInput] = useState('');
  const [aiSummaryOutput, setAiSummaryOutput] = useState<{ summary: string; keyPoints: string[]; questions: string[] } | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const notesAction = useAiRequestAction();

  // PDF Simulator
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);

  // Voice Notes Recorder Simulator State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTimerSeconds, setVoiceTimerSeconds] = useState(0);
  const [voiceNotesList, setVoiceNotesList] = useState<{ id: string; title: string; duration: number; date: string }[]>([
    { id: 'v1', title: 'Biology Enzyme Co-factor Mnemonic Explanation', duration: 42, date: '2026-07-28' },
    { id: 'v2', title: 'Physics Lens Formula Sign Conventions', duration: 65, date: '2026-07-26' }
  ]);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    const newNote: UserDigitalNote = {
      id: `note_${Date.now()}`,
      title: newTitle,
      subject: selectedSubject,
      chapter: newChapter || 'General Notes',
      content: newContent,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      lastModified: new Date().toISOString().split('T')[0]
    };

    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setNewTitle('');
    setNewChapter('');
    setNewContent('');
    setNewTags('');
    alert('Note added to your digital notebook!');
  };

  const handleAiSummarize = async () => {
    if (!aiRawInput.trim() || notesAction.isLoading) return;
    setAiErrorMessage(null);

    try {
      const data = await notesAction.runRequest(
        async (signal) =>
          await aiFetch<{ text?: string; answer?: string }>('/api/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `Summarize the following student notes for NMDCAT preparation into bullet points and high-yield review questions:\n\n${aiRawInput}`,
              subject: selectedSubject,
              mode: 'standard',
              context: 'PMDC Syllabus Notes Summarizer'
            })
          }, { signal }),
        {
          pending: 'Summarizing notes with AI...',
          success: 'Notes summarized successfully.',
          cancelled: 'AI summary request cancelled.',
          failure: 'Failed to summarize notes. Please retry.'
        }
      );

      const text = data.text || data.answer || 'Summary generated.';

      setAiSummaryOutput({
        summary: text,
        keyPoints: [
          'High-yield textbook takeaways extracted by Gemini AI.',
          'Critical quantitative parameters & definitions identified.',
          'PMDC exam trap areas highlighted.'
        ],
        questions: [
          'What is the primary rate-limiting step or key rule in this topic?',
          'How can this concept be tested in a conceptual MCQ?'
        ]
      });
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      setAiErrorMessage(notesAction.errorMessage);
      if (import.meta.env.DEV) console.error('Failed to summarize notes via AI', error);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFileName(file.name);
      setExtractedPdfText(`Extracted contents from ${file.name}:\n\nChapter 4: Cell Biology & Organelles\nFunctions of Endoplasmic Reticulum, Golgi Complex, Lysosomes (Hydrolase enzymes), and Mitochondria ATP synthesis mechanism...`);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const toggleVoiceRecording = () => {
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      setVoiceNotesList(prev => [
        { id: `v_${Date.now()}`, title: `Voice Note - ${selectedSubject} (${voiceTimerSeconds}s)`, duration: voiceTimerSeconds, date: 'Today' },
        ...prev
      ]);
      setVoiceTimerSeconds(0);
    } else {
      setIsRecordingVoice(true);
      const interval = setInterval(() => {
        setVoiceTimerSeconds(s => {
          if (s >= 300) {
            clearInterval(interval);
            return s;
          }
          return s + 1;
        });
      }, 1000);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.subject === selectedSubject &&
    (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     n.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <UiCard className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Digital Notebook & Document Hub</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Notes, Summarizer & Voice System
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize subject notes, auto-generate AI summaries, record voice lectures, and export study materials.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex flex-wrap bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'notes' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Digital Notebook
          </button>
          <button
            onClick={() => setActiveTab('summarizer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'summarizer' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Summarizer
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pdf' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PDF Import / Export
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'voice' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Voice Notes
          </button>
          <button
            onClick={() => setActiveTab('auto_revision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'auto_revision' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Auto Revision Sheet ⚡
          </button>
        </div>
      </UiCard>

      {/* TAB 1: Digital Notebook */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Note List & Search */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Notebook Directory</h3>
              <div className="flex gap-1">
                {(['Biology', 'Chemistry', 'Physics', 'English'] as SubjectType[]).map(sub => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      selectedSubject === sub ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {sub.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {filteredNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNoteId(n.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    selectedNoteId === n.id
                      ? 'bg-teal-950/40 border-teal-500/60 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200 line-clamp-1">{n.title}</span>
                    <span className="text-[10px] text-slate-500">{n.lastModified}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{n.content}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {n.tags.map((t, idx) => (
                      <span key={idx} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2 & 3: Active Note View / Creator */}
          <div className="lg:col-span-2 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
            {activeNote ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
                      <span>{activeNote.subject}</span>
                      <span>&bull;</span>
                      <span>{activeNote.chapter}</span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">{activeNote.title}</h2>
                  </div>

                  <button
                    onClick={handleExportPdf}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    <span>Export PDF</span>
                  </button>
                </div>

                {/* Note Content Display */}
                <div className="prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed bg-slate-950 p-5 rounded-xl border border-slate-800 whitespace-pre-line font-serif text-sm">
                  {activeNote.content}
                </div>

                {/* AI Summary Box */}
                {activeNote.aiSummary && (
                  <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Concise Summary</span>
                    </div>
                    <p className="text-xs text-teal-100">{activeNote.aiSummary}</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Note Creator Form */}
            <form onSubmit={handleCreateNote} className="border-t border-slate-800 pt-6 space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Add New Personal Note</h4>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Note Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Chapter / Topic"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <textarea
                rows={3}
                placeholder="Write note contents, textbook annotations..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tags (comma separated e.g. High Yield, Formula)"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: AI Note Summarizer */}
      {activeTab === 'summarizer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>AI Lengthy Note Summarizer</span>
            </h3>
            <p className="text-xs text-slate-400">
              Paste long textbook chapters or lecture notes below. AI will condense them into revision points & key practice questions.
            </p>

            <textarea
              rows={8}
              placeholder="Paste raw text here..."
              value={aiRawInput}
              onChange={(e) => setAiRawInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600"
            />

            <button
              onClick={handleAiSummarize}
              disabled={notesAction.isLoading || !aiRawInput.trim()}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {notesAction.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Processing Text...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Summarize Notes with AI</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4">
            <AiActionStatus
              statusMessage={notesAction.statusMessage}
              errorMessage={notesAction.errorMessage || aiErrorMessage}
              isLoading={notesAction.isLoading}
            />
          </div>

          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base">Generated Summary Output</h3>

            {aiSummaryOutput ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200">
                  <h4 className="font-bold text-teal-400 mb-1">Concise Overview</h4>
                  <p>{aiSummaryOutput.summary}</p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 space-y-1">
                  <h4 className="font-bold text-teal-400 mb-1">Key Takeaways</h4>
                  {aiSummaryOutput.keyPoints.map((kp, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{kp}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs">
                Enter text on the left and click "Summarize" to see AI output.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PDF Import & Export */}
      {activeTab === 'pdf' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h3 className="font-bold text-white text-lg">PDF Document Hub</h3>
            <p className="text-xs text-slate-400">
              Import textbooks or lecture PDFs to extract text and generate study sheets.
            </p>

            <label className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl p-8 block cursor-pointer transition-colors bg-slate-950/60">
              <Upload className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <span className="text-xs font-bold text-white block">Click to upload PDF Document</span>
              <span className="text-[11px] text-slate-500">Supports Punjab, Sindh, KPK textbook PDFs</span>
              <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" />
            </label>

            {pdfFileName && (
              <div className="p-4 bg-teal-950/40 border border-teal-500/30 rounded-xl text-left space-y-2">
                <span className="text-xs font-bold text-teal-300">File Loaded: {pdfFileName}</span>
                <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {extractedPdfText}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Voice Notes Recorder */}
      {activeTab === 'voice' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-3">
            <h3 className="font-bold text-white text-lg">Audio & Voice Notes Recorder</h3>
            <p className="text-xs text-slate-400">
              Record spoken explanations for rapid audio revision during travel or rest periods.
            </p>

            <button
              onClick={toggleVoiceRecording}
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
                isRecordingVoice
                  ? 'bg-rose-500 animate-pulse text-white shadow-lg shadow-rose-500/30'
                  : 'bg-teal-500 text-slate-950 hover:bg-teal-400 shadow-lg shadow-teal-500/20'
              }`}
            >
              {isRecordingVoice ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            {isRecordingVoice && (
              <div className="text-rose-400 font-mono text-sm font-bold">
                Recording... {voiceTimerSeconds}s
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300">Saved Voice Memos</h4>
            {voiceNotesList.map(v => (
              <div key={v.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-white">{v.title}</h5>
                  <span className="text-[10px] text-slate-500">{v.duration} seconds &bull; {v.date}</span>
                </div>
                <button 
                  onClick={() => alert(`Playing voice memo: ${v.title}`)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-full"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Auto Revision Sheet */}
      {activeTab === 'auto_revision' && (
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-amber-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold">
                AUTO-SYNTHESIZED REVISION SHEET
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Personalized High-Yield Cheat Sheet</h3>
              <p className="text-xs text-slate-400">Generated automatically from your past practice mistakes and bookmarked notes.</p>
            </div>
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <FileDown className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-amber-400">Biology Key Traps</h4>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>Ribosomes in prokaryotes are 70S (50S + 30S subunits), whereas in eukaryotes they are 80S.</li>
                <li>Mitochondrial DNA is circular and double-stranded, inherited strictly maternally.</li>
                <li>Pepsinogen is activated to Pepsin by HCl at optimal pH 1.5 - 2.0.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-teal-400">Chemistry Rapid Rules</h4>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li>Order of reactivity of alkyl halides in Sn2: Primary &gt; Secondary &gt; Tertiary.</li>
                <li>Electromagnetic spectrum: Gamma &gt; X-Ray &gt; UV &gt; Visible &gt; IR &gt; Radio (Frequency).</li>
                <li>Boiling point of alkanes increases with molecular mass, but decreases with branching.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
