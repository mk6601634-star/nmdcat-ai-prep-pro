import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Layers, 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Zap, 
  Stethoscope, 
  GraduationCap, 
  Award,
  Loader2,
  RefreshCw,
  Search,
  Plus,
  Save,
  Trash2,
  Copy,
  Download,
  Eye,
  Edit3,
  Columns,
  Tag,
  Clock,
  Share2,
  Check,
  Filter,
  FolderOpen,
  ArrowRight,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import type { User } from '../lib/firebase';
import { DefinitionItem, SubjectType, SyllabusTopic, UserNote, NoteDetailLevel, NoteType } from '../types';
import { PMDC_SYLLABUS_TOPICS } from '../data/nmdcatData';
import { 
  subscribeToPublishedNotes, 
  saveUserNote, 
  updateUserNote, 
  deleteUserNote, 
  subscribeToUserNotes 
} from '../lib/firestoreService';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';
import { FormattedMathContent } from './FormattedMathContent';

interface ConceptNotesExplorerProps {
  firebaseUser?: User | null;
  onSignIn?: () => void;
}

const POPULAR_CUSTOM_TOPICS = [
  { topic: 'Explain chromosome structure & nucleosomes', subject: 'Biology', noteType: 'CONCEPT EXPLANATION' },
  { topic: 'Newton’s 3 Laws of Motion & Applications', subject: 'Physics', noteType: 'FORMULA NOTES' },
  { topic: 'Sn1 vs Sn2 Reaction Mechanisms & Stereochemistry', subject: 'Chemistry', noteType: 'COMPARISON' },
  { topic: 'Enzyme Kinetics & Michaelis-Menten Constant (Km)', subject: 'Biology', noteType: 'HIGH-YIELD NOTES' },
  { topic: 'Electrolysis & Faraday’s Quantitative Laws', subject: 'Chemistry', noteType: 'STUDY NOTES' },
  { topic: 'Difference between Mitosis and Meiosis Stages', subject: 'Biology', noteType: 'COMPARISON' },
  { topic: 'Simple Harmonic Motion & Energy Conservation', subject: 'Physics', noteType: 'FORMULA NOTES' },
  { topic: 'Aldol Condensation vs Cannizzaro Reaction', subject: 'Chemistry', noteType: 'HIGH-YIELD NOTES' },
];

export const ConceptNotesExplorer: React.FC<ConceptNotesExplorerProps> = ({
  firebaseUser,
  onSignIn
}) => {
  // Main Navigation Tabs
  const [mainTab, setMainTab] = useState<'custom_builder' | 'syllabus_explorer' | 'my_notes'>('custom_builder');

  // ----------------------------------------------------
  // Custom Notes Builder State
  // ----------------------------------------------------
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [customSubject, setCustomSubject] = useState<SubjectType>('Biology');
  const [customChapter, setCustomChapter] = useState('');
  const [detailLevel, setDetailLevel] = useState<NoteDetailLevel>('STANDARD');
  const [noteType, setNoteType] = useState<NoteType>('STUDY NOTES');
  const [customInstructions, setCustomInstructions] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Editor Content State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [editorViewMode, setEditorViewMode] = useState<'preview' | 'edit' | 'split'>('split');
  
  // Autosave & Notification State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const isDirtyRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------------------------
  // User Saved Notes Library State
  // ----------------------------------------------------
  const [myNotes, setMyNotes] = useState<UserNote[]>([]);
  const [myNotesSearch, setMyNotesSearch] = useState('');
  const [myNotesSubjectFilter, setMyNotesSubjectFilter] = useState<string>('All');
  const [myNotesTypeFilter, setMyNotesTypeFilter] = useState<string>('All');

  // ----------------------------------------------------
  // Syllabus Explorer State
  // ----------------------------------------------------
  const [publishedNotes, setPublishedNotes] = useState<DefinitionItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<DefinitionItem | null>(null);
  const [selectedSyllabusTopic, setSelectedSyllabusTopic] = useState<SyllabusTopic>(PMDC_SYLLABUS_TOPICS[0]);
  const [explanationLevel, setExplanationLevel] = useState<'basic' | 'intermediate' | 'advanced' | 'nmdcatLevel' | 'medicalLevel'>('nmdcatLevel');
  const [aiExplanations, setAiExplanations] = useState<Record<string, string> | null>(null);
  const [syllabusSubjectFilter, setSyllabusSubjectFilter] = useState<string>('All');
  const [syllabusSearchQuery, setSyllabusSearchQuery] = useState('');

  // AI Action Hook
  const notesAction = useAiRequestAction();

  const userId = firebaseUser?.uid || 'anonymous';

  // ----------------------------------------------------
  // Effects: Subscriptions
  // ----------------------------------------------------
  useEffect(() => {
    const unsubPublished = subscribeToPublishedNotes((items) => {
      setPublishedNotes(items);
      if (items.length > 0 && !selectedNote) {
        setSelectedNote(items[0]);
      }
    });

    const unsubUserNotes = subscribeToUserNotes(userId, (notes) => {
      setMyNotes(notes);
    });

    return () => {
      unsubPublished();
      unsubUserNotes();
    };
  }, [userId]);

  // ----------------------------------------------------
  // Debounced Autosave Effect
  // ----------------------------------------------------
  useEffect(() => {
    if (!editorContent.trim() || !editorTitle.trim() || !isDirtyRef.current) {
      return;
    }

    setSaveStatus('unsaved');

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const res = await saveUserNote(userId, {
          id: activeNoteId || undefined,
          title: editorTitle,
          content: editorContent,
          subject: customSubject,
          chapter: customChapter || 'General',
          topic: customTopic || editorTitle,
          detailLevel,
          noteType,
          tags: editorTags,
          customInstructions,
          isAiGenerated: true
        });

        if (res.success && res.noteId) {
          if (!activeNoteId) {
            setActiveNoteId(res.noteId);
          }
          setSaveStatus('saved');
          isDirtyRef.current = false;
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        setSaveStatus('error');
      }
    }, 1800);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [editorContent, editorTitle, editorTags, customSubject, customChapter, customTopic, detailLevel, noteType, userId, activeNoteId]);

  // ----------------------------------------------------
  // Handlers: AI Custom Note Generation
  // ----------------------------------------------------
  const handleGenerateCustomNote = async (overrideTopic?: string, overrideSubject?: SubjectType, overrideNoteType?: NoteType) => {
    const targetTopic = (overrideTopic || customTopic).trim();
    const targetSubject = overrideSubject || customSubject;
    const targetNoteType = overrideNoteType || noteType;

    if (!targetTopic || notesAction.isLoading) return;

    try {
      const data = await notesAction.runRequest(
        async (signal) =>
          await aiFetch<{
            success: boolean;
            title: string;
            summary: string;
            tags: string[];
            content: string;
            noteType: NoteType;
            detailLevel: NoteDetailLevel;
            subject: SubjectType;
          }>('/api/generate-custom-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: targetTopic,
              subject: targetSubject,
              chapter: customChapter,
              detailLevel,
              noteType: targetNoteType,
              customInstructions,
              pastedContent
            })
          }, { signal }),
        {
          pending: `Generating ${detailLevel.toLowerCase()} ${targetNoteType.toLowerCase()} for "${targetTopic}"...`,
          success: 'Custom note generated successfully with mathematical precision.',
          cancelled: 'Note generation cancelled.',
          failure: 'Failed to generate note. Please retry.'
        }
      );

      if (data && data.content) {
        setEditorTitle(data.title || targetTopic);
        setEditorContent(data.content);
        setEditorTags(data.tags || [targetSubject, targetNoteType, 'NMDCAT']);
        setActiveNoteId(null); // Fresh note
        isDirtyRef.current = true;
        setSaveStatus('unsaved');
      }
    } catch (err) {
      if (isAiRequestCancelled(err)) return;
      if (import.meta.env.DEV) console.error('Failed to generate custom note', err);
    }
  };

  // ----------------------------------------------------
  // Handlers: Manual Save, Copy, Download
  // ----------------------------------------------------
  const handleManualSave = async () => {
    if (!editorTitle.trim() || !editorContent.trim()) return;

    setSaveStatus('saving');
    try {
      const res = await saveUserNote(userId, {
        id: activeNoteId || undefined,
        title: editorTitle,
        content: editorContent,
        subject: customSubject,
        chapter: customChapter || 'General',
        topic: customTopic || editorTitle,
        detailLevel,
        noteType,
        tags: editorTags,
        customInstructions,
        isAiGenerated: true
      });

      if (res.success && res.noteId) {
        setActiveNoteId(res.noteId);
        setSaveStatus('saved');
        isDirtyRef.current = false;
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const handleCopyContent = () => {
    if (!editorContent) return;
    navigator.clipboard.writeText(editorContent);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!editorContent) return;
    const blob = new Blob([editorContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(editorTitle || 'nmdcat_note').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateNewBlankNote = () => {
    setActiveNoteId(null);
    setCustomTopic('');
    setEditorTitle('Untitled Study Note');
    setEditorContent('# New Note\n\nWrite your concepts, equations like $E = mc^2$, or click "Generate with AI" above.');
    setEditorTags([customSubject, 'Notes']);
    isDirtyRef.current = false;
    setSaveStatus('saved');
  };

  const handleOpenNoteInEditor = (note: UserNote) => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setCustomSubject(note.subject || 'Biology');
    setCustomChapter(note.chapter || '');
    setCustomTopic(note.topic || note.title);
    setDetailLevel(note.detailLevel || 'STANDARD');
    setNoteType(note.noteType || 'STUDY NOTES');
    setEditorTags(note.tags || []);
    setMainTab('custom_builder');
    isDirtyRef.current = false;
    setSaveStatus('saved');
  };

  const handleDeleteUserNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved note?')) return;
    await deleteUserNote(noteId, userId);
    if (activeNoteId === noteId) {
      handleCreateNewBlankNote();
    }
  };

  // ----------------------------------------------------
  // Syllabus Topics Computed
  // ----------------------------------------------------
  const combinedSyllabusTopics = useMemo(() => {
    type Item = {
      id: string;
      subject: SubjectType;
      chapter: string;
      title: string;
      weightagePercentage: number;
      keyPoints: string[];
      rawNote?: DefinitionItem;
    };

    const fromNotes: Item[] = publishedNotes.map(n => ({
      id: n.id,
      subject: n.subject,
      chapter: n.chapter,
      title: n.title || n.term,
      weightagePercentage: (n as any).weightagePercentage ?? 5,
      keyPoints: n.relatedTerms?.length ? n.relatedTerms : (n.summary ? n.summary.split('. ').filter(Boolean) : []),
      rawNote: n
    }));

    const fromSyllabus: Item[] = PMDC_SYLLABUS_TOPICS.map(t => ({
      id: t.id,
      subject: t.subject,
      chapter: t.unit,
      title: t.topic,
      weightagePercentage: t.weightagePercentage ?? 5,
      keyPoints: t.keyPoints || []
    }));

    const seen = new Set<string>();
    const result: Item[] = [];
    [...fromNotes, ...fromSyllabus].forEach(item => {
      const key = `${item.subject}_${item.title}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    });
    return result;
  }, [publishedNotes]);

  const selectedTopic = useMemo<SyllabusTopic>(() => {
    if (selectedNote) {
      return {
        id: selectedNote.id,
        subject: selectedNote.subject,
        unit: selectedNote.chapter,
        topic: selectedNote.title || selectedNote.term,
        weightagePercentage: (selectedNote as any).weightagePercentage ?? 5,
        status: 'not-started',
        keyPoints: selectedNote.relatedTerms?.length
          ? selectedNote.relatedTerms
          : selectedNote.summary
            ? selectedNote.summary.split('. ').filter(Boolean)
            : []
      } as SyllabusTopic;
    }
    return selectedSyllabusTopic || PMDC_SYLLABUS_TOPICS[0];
  }, [selectedNote, selectedSyllabusTopic]);

  const filteredSyllabusTopics = useMemo(() => {
    return combinedSyllabusTopics.filter((t) => {
      const matchSubj = syllabusSubjectFilter === 'All' || t.subject === syllabusSubjectFilter;
      const matchSearch =
        t.title.toLowerCase().includes(syllabusSearchQuery.toLowerCase()) ||
        t.chapter.toLowerCase().includes(syllabusSearchQuery.toLowerCase());
      return matchSubj && matchSearch;
    });
  }, [combinedSyllabusTopics, syllabusSubjectFilter, syllabusSearchQuery]);

  const handleFetchSyllabusAiNotes = async () => {
    if (notesAction.isLoading) return;

    const topicName = selectedTopic.topic || 'Cell Structure & Function';
    const subject = selectedTopic.subject || 'Biology';
    const unit = selectedTopic.unit || 'Cell Biology';

    try {
      const data = await notesAction.runRequest(
        async (signal) =>
          await aiFetch<{ explanations: Record<string, string> }>('/api/multilevel-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicName,
              subject,
              unit
            })
          }, { signal }),
        {
          pending: `Generating multi-level AI syllabus notes for "${topicName}"...`,
          success: 'Syllabus notes generated successfully.',
          cancelled: 'Generation cancelled.',
          failure: 'Failed to generate syllabus notes.'
        }
      );

      if (data && data.explanations) {
        setAiExplanations(data.explanations);
      }
    } catch (err) {
      if (isAiRequestCancelled(err)) return;
    }
  };

  const handleTransferSyllabusToCustomBuilder = () => {
    const levelKey = explanationLevel;
    const currentExplanation = aiExplanations ? aiExplanations[levelKey] : null;
    const contentToUse = currentExplanation || `# ${selectedTopic.topic}\n\n**Subject:** ${selectedTopic.subject}\n**Unit:** ${selectedTopic.unit}\n\n## Key Concepts\n${selectedTopic.keyPoints?.map(p => `- ${p}`).join('\n') || 'Foundational syllabus note.'}`;

    setCustomTopic(selectedTopic.topic);
    setCustomSubject(selectedTopic.subject);
    setCustomChapter(selectedTopic.unit);
    setEditorTitle(`${selectedTopic.topic} (${levelKey.toUpperCase()})`);
    setEditorContent(contentToUse);
    setEditorTags([selectedTopic.subject, selectedTopic.unit, 'Syllabus']);
    setActiveNoteId(null);
    setMainTab('custom_builder');
    isDirtyRef.current = true;
    setSaveStatus('unsaved');
  };

  // ----------------------------------------------------
  // My Notes Filtered
  // ----------------------------------------------------
  const filteredMyNotes = useMemo(() => {
    return myNotes.filter((n) => {
      const matchesSearch = 
        n.title.toLowerCase().includes(myNotesSearch.toLowerCase()) ||
        n.content.toLowerCase().includes(myNotesSearch.toLowerCase()) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(myNotesSearch.toLowerCase())));
      const matchesSubj = myNotesSubjectFilter === 'All' || n.subject === myNotesSubjectFilter;
      const matchesType = myNotesTypeFilter === 'All' || n.noteType === myNotesTypeFilter;
      return matchesSearch && matchesSubj && matchesType;
    });
  }, [myNotes, myNotesSearch, myNotesSubjectFilter, myNotesTypeFilter]);

  // Word count & math stats
  const noteWordCount = useMemo(() => {
    if (!editorContent) return 0;
    return editorContent.trim().split(/\s+/).filter(Boolean).length;
  }, [editorContent]);

  const mathEquationCount = useMemo(() => {
    if (!editorContent) return 0;
    const inline = (editorContent.match(/\$[^\$\n]+\$/g) || []).length;
    const display = (editorContent.match(/\$\$[\s\S]*?\$\$/g) || []).length;
    return inline + display;
  }, [editorContent]);

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Concept & Notes Studio</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              NMDCAT Custom Notes Builder & Knowledge Library
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl">
              Generate, customize, and master comprehensive study notes for <span className="text-emerald-300 font-semibold">any educational topic</span> with KaTeX mathematical formatting, PMDC exam traps, and automatic cloud synchronization.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl shrink-0">
            <button
              onClick={() => setMainTab('custom_builder')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'custom_builder'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Custom Builder</span>
            </button>
            <button
              onClick={() => setMainTab('syllabus_explorer')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'syllabus_explorer'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Syllabus Explorer</span>
            </button>
            <button
              onClick={() => setMainTab('my_notes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mainTab === 'my_notes'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>My Notes ({myNotes.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global AI Action Status */}
      <AiActionStatus
        state={notesAction.state}
        message={notesAction.message}
        onCancel={notesAction.cancelRequest}
      />

      {/* ========================================================================= */}
      {/* TAB 1: AI CUSTOM NOTES BUILDER                                            */}
      {/* ========================================================================= */}
      {mainTab === 'custom_builder' && (
        <div className="space-y-6">
          {/* Note Configuration & Generator Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  ✨
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Configure AI Note Generation</h2>
                  <p className="text-[11px] text-slate-400">Generate structured notes for ANY topic, question, or comparison.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateNewBlankNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Blank Note</span>
                </button>
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1"
                >
                  {showAdvancedOptions ? 'Hide Advanced Options' : '+ Advanced Customization'}
                </button>
              </div>
            </div>

            {/* Quick Topic Chips */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Popular High-Yield Topics:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CUSTOM_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCustomTopic(item.topic);
                      setCustomSubject(item.subject as SubjectType);
                      setNoteType(item.noteType as NoteType);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-[11px] text-slate-300 transition-colors"
                  >
                    <span className="text-emerald-400 font-medium mr-1">[{item.subject}]</span>
                    {item.topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Core Generation Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              {/* Topic Free-Text Input */}
              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Topic / Concept / Inquiry *</label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g., Explain chromosome structure, Newton's laws, Aldol reaction..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Subject */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Subject</label>
                <select
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value as SubjectType)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                </select>
              </div>

              {/* Note Type */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Note Type</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as NoteType)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="STUDY NOTES">Study Notes (Standard Guide)</option>
                  <option value="REVISION NOTES">Revision Notes (High Density)</option>
                  <option value="CONCEPT EXPLANATION">Concept Explanation (Intuition)</option>
                  <option value="CHEAT SHEET">Cheat Sheet (Formulas & Tables)</option>
                  <option value="HIGH-YIELD NOTES">High-Yield Notes (PMDC Traps)</option>
                  <option value="BEGINNER NOTES">Beginner Notes (Step-by-Step)</option>
                  <option value="COMPARISON">Comparison (Differential Matrix)</option>
                  <option value="FORMULA NOTES">Formula Notes (Derivations & SI)</option>
                  <option value="CUSTOM">Custom Tailored</option>
                </select>
              </div>

              {/* Detail Level */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">Depth Level</label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value as NoteDetailLevel)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="QUICK">Quick (Summary)</option>
                  <option value="STANDARD">Standard (Balanced)</option>
                  <option value="DETAILED">Detailed (Textbook)</option>
                  <option value="VERY DETAILED">Very Detailed (Master)</option>
                </select>
              </div>
            </div>

            {/* Collapsible Advanced Customization */}
            {showAdvancedOptions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Optional Chapter / Textbook Unit</label>
                  <input
                    type="text"
                    value={customChapter}
                    onChange={(e) => setCustomChapter(e.target.value)}
                    placeholder="e.g., Cell Biology, Thermodynamics, Aldehydes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Custom Focus / Specific Instructions</label>
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g., Focus on numerical shortcuts, give 3 mnemonics, highlight PMDC past traps..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Pasted Reference Content / Notes to Synthesize (Optional)</label>
                  <textarea
                    rows={2}
                    value={pastedContent}
                    onChange={(e) => setPastedContent(e.target.value)}
                    placeholder="Paste rough lecture notes, paragraph excerpts, or questions to integrate into the note..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                ⚡ Automatically renders all KaTeX mathematical & chemical formulas ($...$, $$...$$)
              </span>

              <button
                onClick={() => handleGenerateCustomNote()}
                disabled={!customTopic.trim() || notesAction.isLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {notesAction.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Note...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Note with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Live Workspace: Editor + Formatted Math Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {/* Top Editor Toolbar */}
            <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Title input & Autosave Indicator */}
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => {
                    setEditorTitle(e.target.value);
                    isDirtyRef.current = true;
                  }}
                  placeholder="Note Title..."
                  className="bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-emerald-500 px-1 py-0.5 flex-1 max-w-md"
                />

                {/* Save status badge */}
                <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                  {saveStatus === 'saving' && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <span className="text-slate-400 flex items-center gap-1">
                      ● Unsaved edits
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-rose-400 flex items-center gap-1">
                      ⚠ Saved locally
                    </span>
                  )}
                </div>
              </div>

              {/* View mode toggle & Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* View Mode Buttons */}
                <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    onClick={() => setEditorViewMode('edit')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      editorViewMode === 'edit' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Markdown Editor Only"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setEditorViewMode('split')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      editorViewMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Split View (Side by Side)"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split</span>
                  </button>
                  <button
                    onClick={() => setEditorViewMode('preview')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      editorViewMode === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Formatted Math Preview Only"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Manual Save */}
                <button
                  onClick={handleManualSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                  title="Save Note to Cloud & Library"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>

                {/* Copy */}
                <button
                  onClick={handleCopyContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                  title="Copy to Clipboard"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Download */}
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                  title="Download Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Note Stats & Metadata Bar */}
            <div className="bg-slate-950/50 px-5 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-emerald-400" />
                  <span className="font-semibold text-slate-300">{customSubject}</span>
                </span>
                <span>•</span>
                <span>Type: <strong className="text-slate-300">{noteType}</strong></span>
                <span>•</span>
                <span>Words: <strong className="text-slate-300">{noteWordCount}</strong></span>
                {mathEquationCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{mathEquationCount} Math/Chem Formulas Rendered</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {editorTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Workspace Main Body */}
            <div className="min-h-[500px]">
              {editorViewMode === 'split' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                  {/* Left: Markdown Editor */}
                  <div className="p-4 bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Markdown Source</span>
                      <span className="text-[10px] text-slate-500 font-normal">Supports $math$ and $$display$$</span>
                    </div>
                    <textarea
                      value={editorContent}
                      onChange={(e) => {
                        setEditorContent(e.target.value);
                        isDirtyRef.current = true;
                      }}
                      placeholder="Start typing your notes here or generate using the AI builder..."
                      className="w-full h-[600px] bg-transparent text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none scrollbar-thin"
                    />
                  </div>

                  {/* Right: Live Formatted KaTeX Preview */}
                  <div className="p-6 bg-slate-900/40 overflow-y-auto max-h-[640px] scrollbar-thin">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Live KaTeX Math & Clean Markdown Preview</span>
                    </div>
                    {editorContent ? (
                      <FormattedMathContent content={editorContent} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
                        <Sparkles className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
                        <p className="text-xs">No content yet. Click "Generate Note with AI" above or write markdown here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editorViewMode === 'edit' && (
                <div className="p-6 bg-slate-950/60">
                  <textarea
                    value={editorContent}
                    onChange={(e) => {
                      setEditorContent(e.target.value);
                      isDirtyRef.current = true;
                    }}
                    placeholder="Start typing your notes here or generate using the AI builder..."
                    className="w-full h-[600px] bg-transparent text-slate-200 font-mono text-sm leading-relaxed focus:outline-none resize-none scrollbar-thin"
                  />
                </div>
              )}

              {editorViewMode === 'preview' && (
                <div className="p-8 bg-slate-900/60 overflow-y-auto min-h-[500px]">
                  {editorContent ? (
                    <FormattedMathContent content={editorContent} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-center">
                      <Sparkles className="w-10 h-10 mb-2 opacity-40 text-emerald-400" />
                      <p className="text-sm">Empty note preview.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SYLLABUS NOTES EXPLORER                                            */}
      {/* ========================================================================= */}
      {mainTab === 'syllabus_explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Syllabus Topics Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Syllabus Topics</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">{filteredSyllabusTopics.length} available</span>
              </div>

              {/* Search & Subject Filters */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={syllabusSearchQuery}
                  onChange={(e) => setSyllabusSearchQuery(e.target.value)}
                  placeholder="Search topic or unit..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {['All', 'Biology', 'Chemistry', 'Physics', 'English'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSyllabusSubjectFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      syllabusSubjectFilter === s ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Topic List */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredSyllabusTopics.map((item) => {
                  const isSelected = selectedTopic.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.rawNote) {
                          setSelectedNote(item.rawNote);
                        } else {
                          setSelectedNote(null);
                          setSelectedSyllabusTopic(PMDC_SYLLABUS_TOPICS.find(t => t.id === item.id) || PMDC_SYLLABUS_TOPICS[0]);
                        }
                        setAiExplanations(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-500 uppercase">{item.subject}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">PMDC</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{item.chapter}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Syllabus Content Viewer */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-1">
                    <span>{selectedTopic.subject}</span>
                    <span>•</span>
                    <span>{selectedTopic.unit}</span>
                  </div>
                  <h2 className="text-xl font-black text-white">{selectedTopic.topic}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFetchSyllabusAiNotes}
                    disabled={notesAction.isLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    {notesAction.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Generate 5-Level AI Breakdown</span>
                  </button>

                  <button
                    onClick={handleTransferSyllabusToCustomBuilder}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                    title="Open in Custom Note Builder to Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Open in Editor</span>
                  </button>
                </div>
              </div>

              {/* 5-Level Pedagogical Tier Tabs */}
              <div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
                  {[
                    { id: 'basic', label: '1. Foundational', icon: BookOpen },
                    { id: 'intermediate', label: '2. FSc Textbook', icon: Layers },
                    { id: 'advanced', label: '3. Deep Molecular', icon: Zap },
                    { id: 'nmdcatLevel', label: '4. NMDCAT Master', icon: Award },
                    { id: 'medicalLevel', label: '5. MBBS Clinical', icon: Stethoscope },
                  ].map((lvl) => {
                    const Icon = lvl.icon;
                    const isActive = explanationLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        onClick={() => setExplanationLevel(lvl.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{lvl.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanations Display */}
              <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 min-h-[300px]">
                {aiExplanations ? (
                  <div className="space-y-4">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{explanationLevel.toUpperCase()} LEVEL PMDC CONCEPT EXPLANATION</span>
                    </div>
                    <FormattedMathContent content={aiExplanations[explanationLevel] || 'Explanation for this level is being compiled.'} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Standard Syllabus Key Points
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {selectedTopic.keyPoints && selectedTopic.keyPoints.length > 0 ? (
                        selectedTopic.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{point}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-slate-500">No raw textbook summary found. Click "Generate 5-Level AI Breakdown" above to generate full notes.</li>
                      )}
                    </ul>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={handleFetchSyllabusAiNotes}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Unlock 5-Tier AI Explanations & Medical Links →</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MY NOTES LIBRARY                                                   */}
      {/* ========================================================================= */}
      {mainTab === 'my_notes' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Your Saved Study Notes</h2>
                  <p className="text-[11px] text-slate-400">All your custom generated and edited notes synced to your account.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  handleCreateNewBlankNote();
                  setMainTab('custom_builder');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Note</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              {/* Search Bar */}
              <div className="md:col-span-6 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={myNotesSearch}
                  onChange={(e) => setMyNotesSearch(e.target.value)}
                  placeholder="Search saved notes by title, tag, or content..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Subject Filter */}
              <div className="md:col-span-3">
                <select
                  value={myNotesSubjectFilter}
                  onChange={(e) => setMyNotesSubjectFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Subjects</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                </select>
              </div>

              {/* Type Filter */}
              <div className="md:col-span-3">
                <select
                  value={myNotesTypeFilter}
                  onChange={(e) => setMyNotesTypeFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Note Types</option>
                  <option value="STUDY NOTES">Study Notes</option>
                  <option value="REVISION NOTES">Revision Notes</option>
                  <option value="CONCEPT EXPLANATION">Concept Explanation</option>
                  <option value="CHEAT SHEET">Cheat Sheet</option>
                  <option value="HIGH-YIELD NOTES">High-Yield Notes</option>
                  <option value="BEGINNER NOTES">Beginner Notes</option>
                  <option value="COMPARISON">Comparison</option>
                  <option value="FORMULA NOTES">Formula Notes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes Grid */}
          {filteredMyNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleOpenNoteInEditor(note)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-lg hover:shadow-emerald-950/20 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {note.subject}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {note.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {note.content.replace(/[#*`$]/g, '').slice(0, 160)}...
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        {note.noteType || 'NOTE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteUserNote(note.id, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Notes Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {myNotes.length === 0
                    ? 'You have not saved any custom notes yet. Generate your first high-yield note with AI!'
                    : 'No saved notes match your current search and filter criteria.'}
                </p>
              </div>
              <button
                onClick={() => {
                  handleCreateNewBlankNote();
                  setMainTab('custom_builder');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
              >
                + Create Note Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConceptNotesExplorer;
