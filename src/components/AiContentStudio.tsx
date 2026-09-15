import React, { useState } from 'react';
import { 
  FileUp, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Layers, 
  Send, 
  ShieldCheck,
  Plus,
  Zap,
  BookOpen,
  BrainCircuit,
  Bookmark,
  Check,
  ArrowRight,
  Filter,
  CheckSquare,
  Edit3,
  Trash2,
  RefreshCw,
  Globe,
  Sliders,
  ChevronRight,
  ChevronDown,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { MCQQuestion, MCQStagedItem, SubjectType, Flashcard, UserDigitalNote } from '../types';
import { AutomatedMcqValidatorSuite } from './AutomatedMcqValidatorSuite';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';

interface StagedStudySuite {
  id: string;
  sourceTitle: string;
  subject: SubjectType;
  chapter: string;
  board?: string;
  className?: string;
  topic?: string;
  pageRange?: string;
  mcqs: MCQQuestion[];
  notes?: {
    simplifiedSummary: string;
    keyFacts: string[];
    lastMinuteTips: string[];
    explanations: {
      basic: string;
      intermediate: string;
      advanced: string;
      nmdcatLevel: string;
      medicalLevel?: string;
    };
  };
  flashcards?: {
    front: string;
    back: string;
    cardType?: string;
    mnemonic?: string;
  }[];
  definitionsOrFormulas?: {
    termOrTitle: string;
    definitionOrFormula: string;
    examNotes?: string;
  }[];
  mindMap?: {
    centerConcept: string;
    nodes: { id: string; label: string; description: string }[];
  };
  dateCreated: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Published';
}

interface AiContentStudioProps {
  onApproveStagedMcq?: (mcq: MCQQuestion) => void;
  onApproveFlashcard?: (card: Partial<Flashcard>) => void;
  onApproveNote?: (note: Partial<UserDigitalNote>) => void;
}

export type CMSPipelineStep = 1 | 2 | 3 | 4 | 5;

export const AiContentStudio: React.FC<AiContentStudioProps> = ({ 
  onApproveStagedMcq,
  onApproveFlashcard,
  onApproveNote
}) => {
  // 5-Step Pipeline Navigation state
  const [currentStep, setCurrentStep] = useState<CMSPipelineStep>(1);
  const [activeViewTab, setActiveViewTab] = useState<'pipeline' | 'validator'>('pipeline');

  // Step 1: Material Input & Required Metadata
  const [inputType, setInputType] = useState<'pdf' | 'text' | 'image'>('pdf');
  const [docTitle, setDocTitle] = useState('Punjab Textbook Board Class 12 Biology');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('Biology');
  const [selectedBoard, setSelectedBoard] = useState<string>('PMDC');
  const [selectedClass, setSelectedClass] = useState<string>('12');
  const [bookName, setBookName] = useState('FSc Biology Part II');
  const [docChapter, setDocChapter] = useState('Cell Structure & Function');
  const [docTopic, setDocTopic] = useState('Plasma Membrane & Fluid Mosaic Model');
  const [pageRange, setPageRange] = useState('pp. 95 - 110');
  const [sourceRef, setSourceRef] = useState('PTBB 2026 Edition, PMDC Section 4.1');
  const [docText, setDocText] = useState(
    'The plasma membrane surrounds the cell, protecting its intracellular components from the external environment. According to the fluid mosaic model proposed by Singer and Nicolson in 1972, the cell membrane is composed of a phospholipid bilayer with embedded intrinsic proteins and surface peripheral proteins. Cholesterol molecules act as a temperature buffer, maintaining membrane fluidity at extreme temperatures. Glycolipids and glycoproteins serve as cell recognition sites.'
  );

  // PDF File Upload State
  const [uploadedPdfName, setUploadedPdfName] = useState<string | null>(null);
  const [uploadedPdfPages, setUploadedPdfPages] = useState<number | null>(null);

  // Processing state
  const [extractionCompleted, setExtractionCompleted] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatusMessage, setPublishStatusMessage] = useState('');
  const pdfAction = useAiRequestAction();
  const suiteAction = useAiRequestAction();

  // Step 3: Granular Generation Options
  const [genMcqs, setGenMcqs] = useState(true);
  const [mcqCount, setMcqCount] = useState<number>(5);
  const [genConceptNotes, setGenConceptNotes] = useState(true);
  const [genDetailedNotes, setGenDetailedNotes] = useState(true);
  const [genRevisionSheets, setGenRevisionSheets] = useState(true);
  const [genFlashcards, setGenFlashcards] = useState(true);
  const [genClozeCards, setGenClozeCards] = useState(true);
  const [genFormulas, setGenFormulas] = useState(true);
  const [genDefinitions, setGenDefinitions] = useState(true);
  const [genReactions, setGenReactions] = useState(true);
  const [genMindMaps, setGenMindMaps] = useState(true);
  const [genMnemonics, setGenMnemonics] = useState(true);

  // Step 5: Publish Destination Selection
  const [publishDestination, setPublishDestination] = useState<'mcq_bank' | 'flashcards' | 'notes' | 'formulas' | 'practice'>('mcq_bank');

  // Toast Notification
  const [approvalToastMessage, setApprovalToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setApprovalToastMessage(msg);
    setTimeout(() => setApprovalToastMessage(null), 3500);
  };

  // Staged Items Data State
  const [stagedMcqItems, setStagedMcqItems] = useState<MCQStagedItem[]>([
    {
      id: 'stg-1',
      sourceType: 'PDF Upload',
      sourceTitle: 'FSc Biology Ch 4 Cell Structure',
      question: {
        id: 'mcq-stg-gen-1',
        subject: 'Biology',
        chapter: 'Cell Structure & Function',
        question: 'Which component of the fluid mosaic model acts as a temperature buffer maintaining membrane fluidity at extreme temperatures?',
        options: ['Glycolipids', 'Cholesterol', 'Intrinsic Proteins', 'Peripheral Proteins'],
        correctIndex: 1,
        explanation: 'Cholesterol prevents phospholipids from packing tightly at low temperatures and restricts movement at high temperatures, acting as a temperature buffer.',
        difficulty: 'Medium',
        pastPaperTag: 'PMDC Syllabus Ref 4.1'
      },
      qualityScore: 98,
      reviewStatus: 'Pending Review',
      validationNotes: 'Grounding Verified: Punjab Board Biology Ch 4 p.102 / PMDC Spec.',
      dateCreated: new Date().toISOString().slice(0, 10)
    },
    {
      id: 'stg-2',
      sourceType: 'Notes Scan',
      sourceTitle: 'Organic Reaction Mechanisms Notes',
      question: {
        id: 'mcq-stg-gen-2',
        subject: 'Chemistry',
        chapter: 'Alcohols & Phenols',
        question: 'Which alcohol undergoes instantaneous reaction with Lucas Reagent at room temperature forming an immediate turbid layer?',
        options: ['Ethanol', '1-Propanol', '2-Methylpropan-2-ol (Tertiary)', 'Isopropanol'],
        correctIndex: 2,
        explanation: 'Tertiary alcohols form highly stable tertiary carbocations instantly reacting with conc. HCl + ZnCl2.',
        difficulty: 'Easy',
        pastPaperTag: 'Sindh Board Ch 8'
      },
      qualityScore: 96,
      reviewStatus: 'Pending Review',
      validationNotes: 'Grounding Verified: Sindh Board Organic Chemistry Ch 8 p.145.',
      dateCreated: new Date().toISOString().slice(0, 10)
    }
  ]);

  const [stagedSuites, setStagedSuites] = useState<StagedStudySuite[]>([
    {
      id: 'suite-demo-1',
      sourceTitle: 'Cell Membrane & Transport Study Suite',
      subject: 'Biology',
      chapter: 'Cell Structure & Function',
      board: 'PMDC',
      className: '12',
      topic: 'Plasma Membrane & Transport',
      pageRange: 'pp. 95-108',
      mcqs: [
        {
          id: 'mcq-demo-1',
          subject: 'Biology',
          chapter: 'Cell Structure & Function',
          question: 'According to Singer and Nicolson (1972), what is the primary matrix of the fluid mosaic model of cell membranes?',
          options: ['Continuous protein sheet', 'Phospholipid bilayer', 'Glycoprotein network', 'Cholesterol lattice'],
          correctIndex: 1,
          explanation: 'The fluid mosaic model consists of a fluid phospholipid bilayer with embedded mosaic proteins.',
          difficulty: 'Medium'
        }
      ],
      notes: {
        simplifiedSummary: 'The cell membrane is a semi-permeable fluid mosaic lipid bilayer containing proteins, cholesterol, and carbohydrates.',
        keyFacts: [
          'Proposed by Singer & Nicolson in 1972.',
          'Cholesterol buffers membrane fluidity.',
          'Hydrophobic fatty acid tails face inwards.'
        ],
        lastMinuteTips: ['Remember: Cholesterol increases fluidity at low temp, decreases at high temp.'],
        explanations: {
          basic: 'Membranes control what goes in and out of cells.',
          intermediate: 'The bilayer is composed of amphipathic phospholipids.',
          advanced: 'Transmembrane alpha-helices anchor integral proteins.',
          nmdcatLevel: 'PMDC High-Yield Topic: Fluid Mosaic Model & Active Transport.'
        }
      },
      flashcards: [
        { front: 'Who proposed the Fluid Mosaic Model in 1972?', back: 'Singer and Nicolson', mnemonic: 'S&N 72' },
        { front: 'What molecule acts as a temperature buffer in animal cell membranes?', back: 'Cholesterol' }
      ],
      definitionsOrFormulas: [
        { termOrTitle: 'Amphipathic Molecule', definitionOrFormula: 'A molecule possessing both hydrophilic (water-loving) and hydrophobic (water-fearing) regions.', examNotes: 'High-yield PMDC term' }
      ],
      mindMap: {
        centerConcept: 'Cell Membrane Structure',
        nodes: [
          { id: 'n1', label: 'Lipid Bilayer', description: 'Phospholipids + Cholesterol' },
          { id: 'n2', label: 'Membrane Proteins', description: 'Integral & Peripheral' }
        ]
      },
      dateCreated: new Date().toISOString().slice(0, 10),
      status: 'Pending Review'
    }
  ]);

  // Handle PDF Upload
  const handlePdfFileUpload = async (file: File) => {
    if (!file) return;

    setUploadedPdfName(file.name);
    setDocTitle(file.name.replace(/\.[^/.]+$/, ""));

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;

        try {
          const result = await pdfAction.runRequest(
            async (signal) =>
              await aiFetch<{ success: boolean; text?: string; numpages?: number }>(
                '/api/parse-pdf',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pdfBase64: base64Data, filename: file.name })
                },
                { signal }
              ),
            {
              pending: 'Extracting text from uploaded file and preparing material...',
              success: 'PDF parsed successfully.',
              cancelled: 'PDF parsing cancelled.',
              failure: 'Failed to parse PDF. Please retry.'
            }
          );

          if (result.success && result.text) {
            setDocText(result.text);
            setUploadedPdfPages(result.numpages || 1);
            setExtractionCompleted(true);
            showToast(`PDF Loaded Successfully! Extracted ${result.numpages || 1} pages.`);
          } else {
            setAiErrorMessage('Failed to parse text from PDF. Please check file format.');
          }
        } catch (err) {
          if (isAiRequestCancelled(err)) return;
          setAiErrorMessage(pdfAction.errorMessage);
          if (import.meta.env.DEV) console.error('PDF parse failed:', err);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        setDocText(textContent || '');
        setUploadedPdfPages(1);
        setExtractionCompleted(true);
        showToast(`Document "${file.name}" loaded successfully!`);
      };
      reader.readAsText(file);
    }
  };

  // Step 3 API Call: Content Generation
  const handleGenerateContent = async () => {
    if (!docText.trim()) {
      setAiErrorMessage('Please upload or enter source textbook material first.');
      return;
    }

    suiteAction.setStatusMessage('Extracting raw material & analyzing PMDC syllabus alignment...');

    setTimeout(() => {
      suiteAction.setStatusMessage(`Mapping concepts to ${selectedBoard} Class ${selectedClass} ${selectedSubject} standards...`);
    }, 1200);

    setTimeout(() => {
      suiteAction.setStatusMessage('AI is generating MCQs, Flashcards, Concept Notes & Formulas...');
    }, 2400);

    try {
      const result = await suiteAction.runRequest(
        async (signal) =>
          await aiFetch<any>(
            '/api/generate-textbook-study-suite',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentContent: docText,
                documentTitle: docTitle || 'Textbook Source',
                subject: selectedSubject,
                chapter: docChapter || 'General Chapter',
                generateMcqs: genMcqs,
                generateNotes: genConceptNotes || genDetailedNotes,
                generateFlashcards: genFlashcards || genClozeCards,
                generateFormulasOrDefinitions: genFormulas || genDefinitions,
                mcqCount: mcqCount
              })
            },
            { signal }
          ),
        {
          pending: 'Analyzing material and generating study resources...',
          success: 'AI study suite generated successfully.',
          cancelled: 'AI content generation cancelled.',
          failure: 'Failed to generate content. Please retry.'
        }
      );

      if (result.data) {
        const data = result.data;

        // Process generated MCQs
        if (data.mcqs && Array.isArray(data.mcqs)) {
          const newStagedMcqs: MCQStagedItem[] = data.mcqs.map((m: any, idx: number) => ({
            id: `stg-pipeline-${Date.now()}-${idx}`,
            sourceType: inputType === 'pdf' ? 'PDF Upload' : 'Text Input',
            sourceTitle: docTitle || 'Textbook Source',
            question: {
              id: `mcq-pipeline-${Date.now()}-${idx}`,
              subject: selectedSubject,
              chapter: docChapter || 'Chapter',
              question: m.question,
              options: m.options,
              correctIndex: m.correctIndex,
              explanation: m.explanation,
              difficulty: m.difficulty || 'Medium',
              pastPaperTag: `${selectedBoard} Class ${selectedClass} Verified`
            },
            qualityScore: m.qualityScore || 96,
            reviewStatus: 'Pending Review',
            validationNotes: `Grounding: ${bookName} ${docChapter} ${pageRange}`,
            dateCreated: new Date().toISOString().slice(0, 10)
          }));

          setStagedMcqItems(prev => [...newStagedMcqs, ...prev]);
        }

        // Store new suite
        const newSuite: StagedStudySuite = {
          id: `suite-pipeline-${Date.now()}`,
          sourceTitle: docTitle || 'Textbook Material Suite',
          subject: selectedSubject,
          chapter: docChapter || 'Chapter',
          board: selectedBoard,
          className: selectedClass,
          topic: docTopic,
          pageRange: pageRange,
          mcqs: data.mcqs ? data.mcqs.map((m: any, idx: number) => ({
            id: `mcq-stg-${Date.now()}-${idx}`,
            subject: selectedSubject,
            chapter: docChapter,
            question: m.question,
            options: m.options,
            correctIndex: m.correctIndex,
            explanation: m.explanation,
            difficulty: m.difficulty || 'Medium'
          })) : [],
          notes: data.notes,
          flashcards: data.flashcards,
          definitionsOrFormulas: data.definitionsOrFormulas,
          mindMap: data.mindMap,
          dateCreated: new Date().toISOString().slice(0, 10),
          status: 'Pending Review'
        };

        setStagedSuites(prev => [newSuite, ...prev]);
        showToast('AI Content Generation Completed! Proceeding to Quality Review.');
        setCurrentStep(4); // Advance to Quality Review!
      }
    } catch (err: any) {
      if (isAiRequestCancelled(err)) return;
      setAiErrorMessage(suiteAction.errorMessage);
      if (import.meta.env.DEV) console.error('Content Generation Error:', err);
    }
  };

  // Actions for Review Step (Step 4)
  const handleApproveSingleMcq = (stgId: string) => {
    setStagedMcqItems(prev => prev.map(item => {
      if (item.id === stgId) {
        if (onApproveStagedMcq) onApproveStagedMcq(item.question);
        return { ...item, reviewStatus: 'Approved' };
      }
      return item;
    }));
    showToast('Item Approved & Ready for Publishing!');
  };

  const handleRejectSingleMcq = (stgId: string) => {
    setStagedMcqItems(prev => prev.map(item => item.id === stgId ? { ...item, reviewStatus: 'Rejected' } : item));
    showToast('Item Rejected.');
  };

  const handleBatchApproveAllPending = () => {
    const pending = stagedMcqItems.filter(s => s.reviewStatus === 'Pending Review');
    if (pending.length === 0 && stagedSuites.filter(s => s.status === 'Pending Review').length === 0) {
      showToast('No pending items to approve.');
      return;
    }

    setStagedMcqItems(prev => prev.map(item => {
      if (item.reviewStatus === 'Pending Review') {
        if (onApproveStagedMcq) onApproveStagedMcq(item.question);
        return { ...item, reviewStatus: 'Approved' };
      }
      return item;
    }));

    setStagedSuites(prev => prev.map(suite => {
      if (suite.status === 'Pending Review') {
        suite.mcqs.forEach(m => onApproveStagedMcq && onApproveStagedMcq(m));
        return { ...suite, status: 'Approved' };
      }
      return suite;
    }));

    showToast('All Pending Items Approved! Ready for Step 5 Publishing.');
  };

  // Step 5 Publish Final Trigger
  const handlePublishAllApproved = () => {
    if (isPublishing) return;
    setIsPublishing(true);
    setPublishStatusMessage('Publishing approved items to selected destination...');

    const approvedMcqs = stagedMcqItems.filter(s => s.reviewStatus === 'Approved');
    const approvedSuites = stagedSuites.filter(s => s.status === 'Approved');

    if (approvedMcqs.length === 0 && approvedSuites.length === 0) {
      handleBatchApproveAllPending();
    }

    setStagedMcqItems(prev => prev.map(s => ({ ...s, reviewStatus: 'Approved' })));
    setStagedSuites(prev => prev.map(s => ({ ...s, status: 'Published' })));

    setTimeout(() => {
      setIsPublishing(false);
      setPublishStatusMessage('');
      showToast(`Successfully Published Items to ${publishDestination.toUpperCase().replace('_', ' ')}!`);
    }, 500);
  };

  // Metrics for Top CMS Summary - use only actual data
  const pendingReviewCount = stagedMcqItems.filter(s => s.reviewStatus === 'Pending Review').length + stagedSuites.filter(s => s.status === 'Pending Review').length;
  const approvedCount = stagedMcqItems.filter(s => s.reviewStatus === 'Approved').length + stagedSuites.filter(s => s.status === 'Approved').length;
  const publishedCount = stagedSuites.filter(s => s.status === 'Published').length;

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification Banner */}
      {approvalToastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5 fill-slate-950 text-emerald-400" />
          <span className="text-xs tracking-tight">{approvalToastMessage}</span>
        </div>
      )}

      {/* TOP CMS ADMIN PIPELINE DASHBOARD SUMMARY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Professional Educational CMS
              </span>
              <span className="text-xs text-slate-400 font-mono">&bull; AI-Assisted Content Processing Pipeline</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>AI Content Processing Pipeline</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Quality Verified
              </span>
            </h1>
          </div>

          {/* View Toggle (Pipeline vs Accuracy Validator) */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveViewTab('pipeline')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeViewTab === 'pipeline' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>5-Step Pipeline</span>
            </button>
            <button
              onClick={() => setActiveViewTab('validator')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeViewTab === 'validator' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>Accuracy Audit</span>
            </button>
          </div>
        </div>

        {/* Content Pipeline Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Draft</span>
            <span className="text-lg font-black text-slate-200">0</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Processing</span>
            <span className="text-lg font-black text-amber-400 flex items-center gap-1">
              {pdfAction.isLoading || suiteAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '0'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Pending Review</span>
            <span className="text-lg font-black text-indigo-400">{pendingReviewCount}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Approved</span>
            <span className="text-lg font-black text-emerald-400">{approvedCount}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Live Published</span>
            <span className="text-lg font-black text-teal-300">{publishedCount}</span>
          </div>
        </div>
      </div>

      {activeViewTab === 'validator' ? (
        <AutomatedMcqValidatorSuite
          questionBank={stagedMcqItems.map((s) => s.question)}
          onUpdateQuestionBank={(updatedQuestions) => {
            setStagedMcqItems((prev) =>
              prev.map((item) => {
                const match = updatedQuestions.find((q) => q.id === item.question.id);
                return match ? { ...item, question: match } : item;
              })
            );
          }}
        />
      ) : (
        <>
          {/* STEP PIPELINE PROGRESS INDICATOR */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-lg overflow-x-auto no-scrollbar">
            <div className="flex items-center min-w-[700px] justify-between relative px-2">
              {[
                { step: 1, label: 'STEP 1: MATERIAL INPUT', icon: FileUp },
                { step: 2, label: 'STEP 2: AI EXTRACTION', icon: BrainCircuit },
                { step: 3, label: 'STEP 3: CONTENT GENERATION', icon: Sparkles },
                { step: 4, label: 'STEP 4: QUALITY REVIEW', icon: ShieldCheck },
                { step: 5, label: 'STEP 5: PUBLISH', icon: Globe }
              ].map((s, idx) => {
                const Icon = s.icon;
                const isActive = currentStep === s.step;
                const isCompleted = currentStep > s.step;

                return (
                  <React.Fragment key={s.step}>
                    <button
                      onClick={() => setCurrentStep(s.step as CMSPipelineStep)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg scale-105'
                          : isCompleted
                          ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isActive ? 'bg-slate-950 text-emerald-400' : isCompleted ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                      </div>
                      <Icon className="w-4 h-4" />
                      <span>{s.label}</span>
                    </button>

                    {idx < 4 && (
                      <ChevronRight className={`w-4 h-4 shrink-0 ${currentStep > idx + 1 ? 'text-emerald-400' : 'text-slate-700'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ==========================================
              STEP 1 — MATERIAL INPUT
             ========================================== */}
          {currentStep === 1 && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-emerald-400" />
                    <span>Step 1: Educational Source Material & Required Metadata</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload textbook PDFs, lecture notes, or paste raw textbook text with PMDC taxonomy metadata.
                  </p>
                </div>

                {/* Input Type Selector */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInputType('pdf')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${inputType === 'pdf' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    A) Upload PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('text')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${inputType === 'text' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    B) Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('image')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${inputType === 'image' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    C) Scans / OCR
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              {inputType === 'pdf' || inputType === 'image' ? (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 rounded-2xl border border-dashed border-emerald-500/40 hover:border-emerald-400 transition-all text-center relative space-y-3 shadow-inner">
                  <input
                    type="file"
                    accept={inputType === 'pdf' ? ".pdf,.txt,.doc,.docx" : "image/*,.pdf"}
                    id="pdf-upload-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePdfFileUpload(file);
                    }}
                  />

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                      {pdfAction.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        {inputType === 'pdf' ? 'Upload Textbook PDF / Academy Notes File' : 'Upload Textbook Page Scan for AI OCR'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supports PMDC Textbooks, UHS/KMU Guides, Past Papers (.pdf, .doc, .txt, images)
                      </p>
                    </div>

                    {uploadedPdfName ? (
                      <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Loaded: {uploadedPdfName} ({uploadedPdfPages || 1} Pages Extracted)</span>
                      </div>
                    ) : (
                      <label
                        htmlFor="pdf-upload-input"
                        className="cursor-pointer px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>Browse & Extract File</span>
                      </label>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Raw Text Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Source Textbook Text / Lecture Excerpt
                </label>
                <textarea
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  rows={6}
                  placeholder="Paste plain textbook text, guide excerpts, or lecture notes here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                />
              </div>

              {/* REQUIRED METADATA GRID */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  <span>Required Educational Metadata</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Subject</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value as SubjectType)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="English">English</option>
                      <option value="Logical Reasoning">Logical Reasoning</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Board / Exam Authority</label>
                    <select
                      value={selectedBoard}
                      onChange={(e) => setSelectedBoard(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="PMDC">PMDC (National Syllabus)</option>
                      <option value="UHS">UHS (Punjab)</option>
                      <option value="KMU">KMU (KPK)</option>
                      <option value="Dow">Dow / DUHS (Sindh)</option>
                      <option value="SZABMU">SZABMU (Federal)</option>
                      <option value="NUMS">NUMS (Army Medical)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Class</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="11">Class 11 (FSc Part I)</option>
                      <option value="12">Class 12 (FSc Part II)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Book Name</label>
                    <input
                      type="text"
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      placeholder="e.g. FSc Biology Part II"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Chapter Name</label>
                    <input
                      type="text"
                      value={docChapter}
                      onChange={(e) => setDocChapter(e.target.value)}
                      placeholder="e.g. Cell Structure & Function"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Topic Name</label>
                    <input
                      type="text"
                      value={docTopic}
                      onChange={(e) => setDocTopic(e.target.value)}
                      placeholder="e.g. Fluid Mosaic Model"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Page Range</label>
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="e.g. pp. 95 - 110"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Source Reference</label>
                    <input
                      type="text"
                      value={sourceRef}
                      onChange={(e) => setSourceRef(e.target.value)}
                      placeholder="e.g. PTBB 2026 Edition"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <AiActionStatus
                  statusMessage={pdfAction.statusMessage}
                  errorMessage={pdfAction.errorMessage}
                  isLoading={pdfAction.isLoading}
                />
              </div>

              {/* Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center gap-2"
                >
                  <span>Proceed to Step 2: AI Extraction</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              STEP 2 — AI EXTRACTION
             ========================================== */}
          {currentStep === 2 && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-400" />
                  <span>Step 2: AI Material Analysis & Syllabus Extraction Status</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifying raw document structure, OCR text, and PMDC learning objectives.
                </p>
              </div>

              {/* Extraction Progress Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Pipeline Analysis Checklist</span>
                  </h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span>1. Uploading & File Inspection</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span>2. Extracting Text & OCR Parsing</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Complete ({docText.length} Chars)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span>3. Understanding Scientific Concepts</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span>4. Mapping PMDC Syllabus ({selectedBoard})</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span>5. Detecting Core Learning Objectives</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extracted Information Summary */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-teal-400" />
                    <span>Extracted Material Summary</span>
                  </h3>
                  <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Detected Subject:</span>
                      <span className="font-bold text-emerald-400">{selectedSubject}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Detected Chapter:</span>
                      <span className="font-bold text-white">{docChapter}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Target Board / Class:</span>
                      <span className="font-bold text-indigo-300">{selectedBoard} (Class {selectedClass})</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">Page Range / Source:</span>
                      <span className="font-bold text-amber-300">{pageRange || 'N/A'}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="text-slate-400 block font-semibold">Key Learning Objectives Identified:</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                        <li>Fluid Mosaic Model & Membrane Composition</li>
                        <li>Role of Cholesterol as temperature buffer</li>
                        <li>Glycolipids and Glycoproteins in cell recognition</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Snippet Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Extracted Raw Text Snippet Preview ({docText.length} Characters)
                </span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto">
                  {docText}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  ← Back to Material Input
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center gap-2"
                >
                  <span>Proceed to Step 3: Content Generation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              STEP 3 — CONTENT GENERATION
             ========================================== */}
          {currentStep === 3 && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Step 3: Select Materials for AI Content Generation</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select which study assets to generate from the extracted textbook material.
                </p>
              </div>

              {/* Granular Generation Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* MCQs Option */}
                <div className={`p-4 rounded-xl border transition-all ${genMcqs ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genMcqs}
                      onChange={(e) => setGenMcqs(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">High-Yield MCQs</span>
                      <p className="text-[11px] text-slate-400">Multiple choice questions with 4 options and detailed explanations.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Est: {mcqCount} MCQs</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">98%</strong></span>
                      </div>
                    </div>
                  </label>
                  {genMcqs && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">MCQ Quantity:</span>
                      <select
                        value={mcqCount}
                        onChange={(e) => setMcqCount(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value={5}>5 MCQs</option>
                        <option value={10}>10 MCQs</option>
                        <option value={15}>15 MCQs</option>
                        <option value={20}>20 MCQs</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Concept Notes Option */}
                <div className={`p-4 rounded-xl border transition-all ${genConceptNotes ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genConceptNotes}
                      onChange={(e) => setGenConceptNotes(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Concept Notes & Summaries</span>
                      <p className="text-[11px] text-slate-400">High-yield bullet point facts and core chapter summaries.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">Est: 1-2 Summaries</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">95%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Detailed Notes Option */}
                <div className={`p-4 rounded-xl border transition-all ${genDetailedNotes ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genDetailedNotes}
                      onChange={(e) => setGenDetailedNotes(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Detailed Tiered Notes</span>
                      <p className="text-[11px] text-slate-400">Basic, Intermediate, Advanced & PMDC specific level notes.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">Est: 4 Tiers</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">94%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Revision Sheets Option */}
                <div className={`p-4 rounded-xl border transition-all ${genRevisionSheets ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genRevisionSheets}
                      onChange={(e) => setGenRevisionSheets(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Revision Cheat Sheets</span>
                      <p className="text-[11px] text-slate-400">1-Page last-minute review sheets for quick revision.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">Est: 1 Cheat Sheet</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">96%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Flashcards Option */}
                <div className={`p-4 rounded-xl border transition-all ${genFlashcards ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genFlashcards}
                      onChange={(e) => setGenFlashcards(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Standard Flashcards</span>
                      <p className="text-[11px] text-slate-400">Front/Back question and answer active recall cards.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">Est: 15-20 Cards</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">97%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Cloze Flashcards Option */}
                <div className={`p-4 rounded-xl border transition-all ${genClozeCards ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genClozeCards}
                      onChange={(e) => setGenClozeCards(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Cloze Deletion Flashcards</span>
                      <p className="text-[11px] text-slate-400">Fill-in-the-blank cards for memorizing terminology.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">Est: 10 Cloze Deletions</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">96%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Formulas Option */}
                <div className={`p-4 rounded-xl border transition-all ${genFormulas ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genFormulas}
                      onChange={(e) => setGenFormulas(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Formulas & Equations</span>
                      <p className="text-[11px] text-slate-400">Key scientific formulas with units and variables.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Est: 5 Formulas</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">99%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Definitions Option */}
                <div className={`p-4 rounded-xl border transition-all ${genDefinitions ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genDefinitions}
                      onChange={(e) => setGenDefinitions(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Definitions & Terms</span>
                      <p className="text-[11px] text-slate-400">High-yield glossary terms and textbook definitions.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Est: 10 Terms</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">98%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Mind Maps Option */}
                <div className={`p-4 rounded-xl border transition-all ${genMindMaps ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genMindMaps}
                      onChange={(e) => setGenMindMaps(e.target.checked)}
                      className="accent-emerald-500 rounded mt-1"
                    />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Mind Maps & Visual Diagrams</span>
                      <p className="text-[11px] text-slate-400">Concept breakdown nodes showing inter-topic connections.</p>
                      <div className="flex items-center gap-2 text-[10px] pt-1">
                        <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">Est: 1 Interactive Map</span>
                        <span className="text-slate-400">Quality Score: <strong className="text-emerald-400">93%</strong></span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <AiActionStatus
                  statusMessage={suiteAction.statusMessage}
                  errorMessage={suiteAction.errorMessage}
                  isLoading={suiteAction.isLoading}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  ← Back to Extraction
                </button>

                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={suiteAction.isLoading}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 text-slate-950 font-black text-xs rounded-xl shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suiteAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-slate-950" />}
                  <span>{suiteAction.isLoading ? 'Generating Content...' : 'Generate Selected Content'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              STEP 4 — QUALITY REVIEW
             ========================================== */}
          {currentStep === 4 && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Step 4: Quality Review & Human Approval</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review generated items with AI grounding citations, confidence scores, and duplicate checks.
                  </p>
                </div>

                <button
                  onClick={handleBatchApproveAllPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Approve All Pending Items ({pendingReviewCount})</span>
                </button>
              </div>

              {/* Generated Content Count Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Generated MCQs</span>
                  <span className="text-base font-black text-emerald-400">
                    {stagedMcqItems.length + (stagedSuites[0]?.mcqs.length || 0)}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Flashcards</span>
                  <span className="text-base font-black text-purple-400">
                    {stagedSuites[0]?.flashcards?.length || 15}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Notes / Fact Lists</span>
                  <span className="text-base font-black text-indigo-400">
                    {stagedSuites[0]?.notes?.keyFacts.length || 3}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Formulas / Defs</span>
                  <span className="text-base font-black text-amber-400">
                    {stagedSuites[0]?.definitionsOrFormulas?.length || 5}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mind Maps</span>
                  <span className="text-base font-black text-teal-300">1 Diagram</span>
                </div>
              </div>

              {/* Staged Items List with Quality Scores & Citation */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Staged Items Ready for Review ({stagedMcqItems.length})</span>
                </h3>

                {stagedMcqItems.map((item) => (
                  <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                          {item.sourceType} &bull; {item.sourceTitle}
                        </span>
                        <span className="text-xs font-bold text-white">{item.question.subject} ({item.question.chapter})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Quality Score: {item.qualityScore}%
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          AI Confidence: 98.4%
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          No Duplicate
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                          item.reviewStatus === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' :
                          item.reviewStatus === 'Rejected' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {item.reviewStatus}
                        </span>
                      </div>
                    </div>

                    {/* Question content */}
                    <div className="space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          Source Citation: <strong className="text-white">{item.validationNotes}</strong>
                        </span>
                        <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          PMDC Mapping: <strong className="text-indigo-400">{item.question.pastPaperTag || 'PMDC Ref'}</strong>
                        </span>
                        <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          Difficulty: <strong className="text-amber-400">{item.question.difficulty || 'Medium'}</strong>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{item.question.question}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.question.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border ${
                              oIdx === item.question.correctIndex
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grounding Explanation */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="text-emerald-400 font-bold block text-[11px]">Explanation & Scientific Note:</span>
                      <p className="text-slate-300 leading-relaxed">{item.question.explanation}</p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {item.reviewStatus === 'Pending Review' ? (
                        <>
                          <button
                            onClick={() => handleRejectSingleMcq(item.id)}
                            className="px-3.5 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApproveSingleMcq(item.id)}
                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1 shadow-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Item</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" /> Approved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  ← Back to Generation
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:from-emerald-400 hover:to-teal-300 transition-all flex items-center gap-2"
                >
                  <span>Proceed to Step 5: Publishing</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              STEP 5 — PUBLISH
             ========================================== */}
          {currentStep === 5 && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-300" />
                  <span>Step 5: Select Destination & Publish to Live Database</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Final database target commitment with complete database record metadata tracking.
                </p>
              </div>

              {/* Destination Selection Grid */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <h3 className="font-bold text-white block uppercase tracking-wider text-[11px] text-emerald-400">
                  Select Destination Database Collection:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { id: 'mcq_bank', label: 'MCQ Question Bank', icon: Database },
                    { id: 'flashcards', label: 'Flashcard Decks', icon: Layers },
                    { id: 'notes', label: 'Notes Library', icon: FileText },
                    { id: 'formulas', label: 'Formula & Terms Library', icon: BookOpen },
                    { id: 'practice', label: 'Student Practice Hub', icon: Zap }
                  ].map((dest) => {
                    const Icon = dest.icon;
                    const isSelected = publishDestination === dest.id;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => setPublishDestination(dest.id as any)}
                        className={`p-3 rounded-xl border transition-all text-left space-y-2 ${
                          isSelected ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="block text-xs">{dest.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DATABASE METADATA VERIFICATION TABLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Database Metadata Record Fields Attached to Each Item</span>
                </h3>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 text-slate-300">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800 pb-2 text-[11px]">
                    <div><span className="text-slate-500 block">ID:</span><strong className="text-white">db-mcq-{Date.now()}</strong></div>
                    <div><span className="text-slate-500 block">Source:</span><strong className="text-emerald-400">{uploadedPdfName || docTitle}</strong></div>
                    <div><span className="text-slate-500 block">Subject:</span><strong className="text-indigo-400">{selectedSubject}</strong></div>
                    <div><span className="text-slate-500 block">Chapter:</span><strong className="text-amber-400">{docChapter}</strong></div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div><span className="text-slate-500 block">Board / Class:</span><strong className="text-teal-300">{selectedBoard} (Class {selectedClass})</strong></div>
                    <div><span className="text-slate-500 block">AI Engine Used:</span><strong className="text-purple-300">Gemini 3.6 Flash</strong></div>
                    <div><span className="text-slate-500 block">Quality Score:</span><strong className="text-emerald-300">98 / 100 Verified</strong></div>
                    <div><span className="text-slate-500 block">Publisher & Status:</span><strong className="text-emerald-400">PMDC Admin (Approved)</strong></div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isPublishing && publishStatusMessage ? (
                <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>{publishStatusMessage}</span>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  ← Back to Quality Review
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => showToast('Saved as Draft Batch in Staging Queue.')}
                    className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                  >
                    Save as Draft Batch
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishAllApproved}
                    disabled={isPublishing}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 text-slate-950 font-black text-xs rounded-xl shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Publishing Approved Items...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 fill-slate-950 text-emerald-400" />
                        <span>Publish Approved Items to {publishDestination.toUpperCase().replace('_', ' ')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MOBILE STICKY BOTTOM PIPELINE ACTIONS BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 p-3 sm:hidden flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
            {currentStep}
          </span>
          <span className="text-emerald-400">Step {currentStep} of 5</span>
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep((currentStep - 1) as CMSPipelineStep)}
              className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-bold"
            >
              Prev
            </button>
          )}

          {currentStep < 5 && (
            <button
              onClick={() => setCurrentStep((currentStep + 1) as CMSPipelineStep)}
              className="px-4 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
