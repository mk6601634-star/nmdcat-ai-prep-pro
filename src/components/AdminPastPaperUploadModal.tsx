import React, { useState } from 'react';
import { 
  PastPaper, 
  PastPaperQuestion, 
  PastPaperVerificationStatus, 
  SubjectType 
} from '../types';
import { 
  UploadCloud, 
  FileText, 
  AlertTriangle, 
  X, 
  Loader2, 
  CheckCircle2,
  FileCheck,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Eye,
  FileCode,
  Clock,
  Sparkles,
  Download,
  Check,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { auth } from '../lib/firebase';

interface AdminPastPaperUploadModalProps {
  onClose: () => void;
  onSavePaper: (paper: PastPaper) => Promise<{ success: boolean; id?: string; duplicate?: boolean; error?: string }>;
  existingPapers: PastPaper[];
}

const SAMPLE_2024_NMDCAT_JSON = {
  title: "2024 PMDC Official National NMDCAT",
  year: "2024",
  examName: "NMDCAT",
  conductingBody: "PMDC",
  conductingUniversity: "SZABMU Islamabad / UHS Lahore / DUHS Karachi",
  paperVariant: "Code A - National Paper",
  timeAllowedMinutes: 210,
  verificationStatus: "VERIFIED_OFFICIAL",
  questions: [
    {
      originalQuestionNumber: 1,
      subject: "Biology",
      chapter: "Cell Structure and Function",
      questionText: "Which cellular organelle is primarily responsible for ATP synthesis via oxidative phosphorylation in eukaryotic cells?",
      options: [
        "Mitochondria",
        "Ribosomes",
        "Rough Endoplasmic Reticulum",
        "Golgi Apparatus"
      ],
      correctAnswer: 0,
      explanation: "Mitochondria contain the electron transport chain and ATP synthase on their inner mitochondrial membrane (cristae), making them the primary site of oxidative ATP synthesis.",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 2,
      subject: "Biology",
      chapter: "Biological Molecules",
      questionText: "Which type of chemical bond links adjacent amino acid monomers in a polypeptide primary structure?",
      options: [
        "Phosphodiester bond",
        "Peptide (Amide) bond",
        "Glycosidic linkage",
        "Ester bond"
      ],
      correctAnswer: 1,
      explanation: "Peptide bonds are covalent amide linkages formed through dehydration synthesis between the carboxyl group of one amino acid and the amino group of another.",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 3,
      subject: "Chemistry",
      chapter: "Fundamental Concepts & Stoichiometry",
      questionText: "What is the volume occupied by 2.0 moles of an ideal gas at standard temperature and pressure (STP)?",
      options: [
        "11.2 dm³",
        "22.4 dm³",
        "44.8 dm³",
        "89.6 dm³"
      ],
      correctAnswer: 2,
      explanation: "At STP (0°C, 1 atm), one mole of any ideal gas occupies 22.4 dm³. Therefore, 2.0 moles occupy 2 * 22.4 = 44.8 dm³.",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 4,
      subject: "Chemistry",
      chapter: "Chemical Bonding",
      questionText: "Which molecular geometry and bond angle is characteristic of methane (CH₄) based on VSEPR theory?",
      options: [
        "Trigonal planar (120°)",
        "Tetrahedral (109.5°)",
        "Linear (180°)",
        "Trigonal pyramidal (107°)"
      ],
      correctAnswer: 1,
      explanation: "Methane possesses sp³ hybridization with four equivalent bonding pairs and zero lone pairs, giving a regular tetrahedral geometry with 109.5° bond angles.",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 5,
      subject: "Physics",
      chapter: "Force and Motion",
      questionText: "If the net external force acting on a moving object is zero, what is the motion state of the object according to Newton's First Law?",
      options: [
        "It must immediately come to rest",
        "It moves with constant velocity along a straight line",
        "It accelerates uniformly",
        "It moves along a parabolic trajectory"
      ],
      correctAnswer: 1,
      explanation: "In the absence of a net unbalanced external force, an object maintains its state of rest or uniform motion in a straight line (inertia).",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 6,
      subject: "Physics",
      chapter: "Work, Energy and Power",
      questionText: "How does the kinetic energy of a body change if its linear momentum is doubled while its mass remains constant?",
      options: [
        "Doubles (2x)",
        "Remains unchanged (1x)",
        "Increases fourfold (4x)",
        "Halves (0.5x)"
      ],
      correctAnswer: 2,
      explanation: "Kinetic energy is related to momentum by KE = p² / (2m). If momentum p is doubled, KE becomes (2p)²/(2m) = 4 * (p²/(2m)) = 4 times the original value.",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 7,
      subject: "English",
      chapter: "Subject-Verb Agreement",
      questionText: "Choose the grammatically correct sentence:",
      options: [
        "Neither the doctor nor the nurses was available during the emergency.",
        "Neither the doctor nor the nurses were available during the emergency.",
        "Neither the doctor or the nurses were available during the emergency.",
        "Neither the doctor nor the nurses is available during the emergency."
      ],
      correctAnswer: 1,
      explanation: "With 'neither...nor', the verb agrees with the closer subject. 'Nurses' is plural, so the plural verb 'were' is correct.",
      hasOfficialAnswer: true
    },
    {
      originalQuestionNumber: 8,
      subject: "Logical Reasoning",
      chapter: "Critical Reasoning & Syllogisms",
      questionText: "Statement 1: All enzymes are proteins.\nStatement 2: All proteins are composed of amino acids.\nConclusion: All enzymes are composed of amino acids.",
      options: [
        "The conclusion is logically valid and follows from the premises.",
        "The conclusion is invalid because not all biocatalysts are proteins.",
        "The premises are contradictory.",
        "Insufficient information to determine validity."
      ],
      correctAnswer: 0,
      explanation: "By categorical syllogism (Barbara / universal transitive relation): If A ⊂ B and B ⊂ C, then A ⊂ C. The conclusion is strictly valid.",
      hasOfficialAnswer: true
    }
  ]
};

export const AdminPastPaperUploadModal: React.FC<AdminPastPaperUploadModalProps> = ({
  onClose,
  onSavePaper,
  existingPapers
}) => {
  // Metadata fields
  const [paperTitle, setPaperTitle] = useState('');
  const [examYear, setExamYear] = useState<string>('2024');
  const [examName, setExamName] = useState<string>('NMDCAT');
  const [conductingBody, setConductingBody] = useState<string>('PMDC');
  const [conductingUniversity, setConductingUniversity] = useState<string>('SZABMU / UHS / DUHS');
  const [paperVariant, setPaperVariant] = useState<string>('Code A - Official National Paper');
  const [paperDate, setPaperDate] = useState<string>('');
  const [timeAllowedMinutes, setTimeAllowedMinutes] = useState<number>(210);
  const [verificationStatus, setVerificationStatus] = useState<PastPaperVerificationStatus>('VERIFIED_OFFICIAL');

  // Input modes & JSON content
  const [inputTab, setInputTab] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [rawJsonText, setRawJsonText] = useState('');

  // Processing & State
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Staging / Extracted Paper
  const [stagedPaper, setStagedPaper] = useState<PastPaper | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuestionTerm, setSearchQuestionTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');

  const computeHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  };

  const handleDownloadTemplate = () => {
    const templateData = {
      title: "2024 PMDC Official National NMDCAT (Sample)",
      year: "2024",
      examName: "NMDCAT",
      conductingBody: "PMDC",
      conductingUniversity: "UHS Lahore / SZABMU Islamabad",
      paperVariant: "Code A",
      timeAllowedMinutes: 210,
      verificationStatus: "VERIFIED_OFFICIAL",
      questions: [
        {
          originalQuestionNumber: 1,
          subject: "Biology",
          chapter: "Cell Biology",
          questionText: "Sample question statement goes here?",
          options: [
            "Option A text",
            "Option B text",
            "Option C text",
            "Option D text"
          ],
          correctAnswer: 0,
          explanation: "Explanation justifying why Option A is correct.",
          hasOfficialAnswer: true
        }
      ]
    };

    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nmdcat_past_paper_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadSamplePaper = () => {
    setPaperTitle(SAMPLE_2024_NMDCAT_JSON.title);
    setExamYear(SAMPLE_2024_NMDCAT_JSON.year);
    setExamName(SAMPLE_2024_NMDCAT_JSON.examName);
    setConductingBody(SAMPLE_2024_NMDCAT_JSON.conductingBody);
    setConductingUniversity(SAMPLE_2024_NMDCAT_JSON.conductingUniversity);
    setPaperVariant(SAMPLE_2024_NMDCAT_JSON.paperVariant);
    setTimeAllowedMinutes(SAMPLE_2024_NMDCAT_JSON.timeAllowedMinutes);
    setRawJsonText(JSON.stringify(SAMPLE_2024_NMDCAT_JSON, null, 2));
    setInputTab('text');
    setSuccessMessage('Loaded 2024 National NMDCAT sample paper. Click "Validate & Review Questions" to inspect.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && !file.type.includes('json') && !file.name.endsWith('.txt')) {
      setErrorMessage('Please select a valid .json file.');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setRawJsonText(content);
      
      try {
        const parsed = JSON.parse(content);
        if (parsed.title) setPaperTitle(parsed.title);
        if (parsed.year) setExamYear(String(parsed.year));
        if (parsed.examName) setExamName(parsed.examName);
        if (parsed.conductingBody) setConductingBody(parsed.conductingBody);
        if (parsed.conductingUniversity) setConductingUniversity(parsed.conductingUniversity);
        if (parsed.paperVariant) setPaperVariant(parsed.paperVariant);
        if (parsed.timeAllowedMinutes) setTimeAllowedMinutes(Number(parsed.timeAllowedMinutes));
      } catch {
        // Raw array or needs validation later
      }
    };
    reader.readAsText(file);
  };

  const normalizeSubject = (sub?: string): SubjectType => {
    if (!sub) return 'Biology';
    const s = sub.trim().toLowerCase();
    if (s.includes('bio')) return 'Biology';
    if (s.includes('chem')) return 'Chemistry';
    if (s.includes('phy')) return 'Physics';
    if (s.includes('eng')) return 'English';
    if (s.includes('logic') || s.includes('reason')) return 'Logical Reasoning';
    return 'Biology';
  };

  const normalizeCorrectAnswer = (val: any, options: string[]): number | null => {
    if (typeof val === 'number' && val >= 0 && val < options.length) {
      return val;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const upper = trimmed.toUpperCase();
      if (upper === 'A' || upper === 'OPTION A') return 0;
      if (upper === 'B' || upper === 'OPTION B') return 1;
      if (upper === 'C' || upper === 'OPTION C') return 2;
      if (upper === 'D' || upper === 'OPTION D') return 3;
      
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 0 && num < options.length) return num;
      if (!isNaN(num) && num >= 1 && num <= options.length) return num - 1; // 1-indexed

      // Match exact text in options
      const idx = options.findIndex(o => o.trim().toLowerCase() === trimmed.toLowerCase());
      if (idx >= 0) return idx;
    }
    return null;
  };

  const handleValidateAndStage = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const textToParse = rawJsonText.trim();
    if (!textToParse) {
      setErrorMessage('Please select a JSON file or paste JSON content.');
      return;
    }

    setIsValidating(true);

    try {
      let parsedData: any;
      try {
        parsedData = JSON.parse(textToParse);
      } catch (jsonErr: any) {
        throw new Error(`JSON syntax error: ${jsonErr.message}. Please verify quotes and commas.`);
      }

      let rawQuestions: any[] = [];
      let embeddedTitle = paperTitle;
      let embeddedYear = examYear;
      let embeddedExam = examName;
      let embeddedBody = conductingBody;
      let embeddedUniv = conductingUniversity;
      let embeddedVariant = paperVariant;
      let embeddedMinutes = timeAllowedMinutes;

      if (Array.isArray(parsedData)) {
        rawQuestions = parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        if (Array.isArray(parsedData.questions)) {
          rawQuestions = parsedData.questions;
        } else if (Array.isArray(parsedData.mcqs)) {
          rawQuestions = parsedData.mcqs;
        } else if (Array.isArray(parsedData.items)) {
          rawQuestions = parsedData.items;
        } else {
          throw new Error('The JSON object must contain an array under the "questions" or "mcqs" key.');
        }

        if (parsedData.title) embeddedTitle = parsedData.title;
        if (parsedData.year) embeddedYear = String(parsedData.year);
        if (parsedData.examName) embeddedExam = parsedData.examName;
        if (parsedData.conductingBody) embeddedBody = parsedData.conductingBody;
        if (parsedData.conductingUniversity) embeddedUniv = parsedData.conductingUniversity;
        if (parsedData.paperVariant) embeddedVariant = parsedData.paperVariant;
        if (parsedData.timeAllowedMinutes) embeddedMinutes = Number(parsedData.timeAllowedMinutes);
      } else {
        throw new Error('Invalid JSON format. Expected an array of questions or an object with metadata and a "questions" array.');
      }

      if (rawQuestions.length === 0) {
        throw new Error('No questions found in the JSON file.');
      }

      const paperId = `paper_${embeddedYear}_${Date.now()}`;
      const validatedQuestions: PastPaperQuestion[] = [];

      for (let i = 0; i < rawQuestions.length; i++) {
        const item = rawQuestions[i];
        const qNum = item.originalQuestionNumber || item.questionNumber || item.number || i + 1;
        const qText = item.questionText || item.question || item.statement || item.text || '';

        if (!qText.trim()) {
          throw new Error(`Question #${i + 1} is missing question text/statement.`);
        }

        let rawOptions = item.options || item.choices || item.answers;
        let optionsList: string[] = [];

        if (Array.isArray(rawOptions)) {
          optionsList = rawOptions.map((o: any) => String(o || '').trim()).filter(Boolean);
        } else if (rawOptions && typeof rawOptions === 'object') {
          optionsList = ['A', 'B', 'C', 'D'].map(k => String(rawOptions[k] || rawOptions[k.toLowerCase()] || '').trim()).filter(Boolean);
        }

        if (optionsList.length < 2) {
          throw new Error(`Question #${qNum} ("${qText.substring(0, 30)}...") has less than 2 options.`);
        }

        const rawAns = item.correctAnswer ?? item.correct_answer ?? item.answer ?? item.correctOptionIndex ?? item.key;
        const correctIndex = normalizeCorrectAnswer(rawAns, optionsList);

        const subject = normalizeSubject(item.subject || item.subjectType || item.category);

        const question: PastPaperQuestion = {
          id: item.id || `q_${paperId}_${i + 1}`,
          pastPaperId: paperId,
          originalQuestionNumber: qNum,
          subject,
          chapter: item.chapter || item.topic || 'General',
          questionText: qText.trim(),
          options: optionsList,
          correctAnswer: correctIndex,
          explanation: item.explanation || item.solution || item.reason || '',
          hasOfficialAnswer: correctIndex !== null,
          difficulty: item.difficulty || 'Medium'
        };

        validatedQuestions.push(question);
      }

      const effectiveTitle = embeddedTitle.trim() || `${embeddedYear} ${embeddedExam} Official Past Paper`;
      const sourceHash = computeHash(`${effectiveTitle}_${embeddedYear}_${validatedQuestions.length}`);
      const hasAnswerKey = validatedQuestions.some(q => q.hasOfficialAnswer && q.correctAnswer !== null);
      const currentUser = auth.currentUser;

      const paper: PastPaper = {
        id: paperId,
        title: effectiveTitle,
        year: embeddedYear,
        examName: embeddedExam || 'NMDCAT',
        conductingBody: embeddedBody || 'PMDC',
        conductingUniversity: embeddedUniv || '',
        paperDate: paperDate || '',
        paperVariant: embeddedVariant || 'Official Paper',
        sourceType: 'STRUCTURED_JSON',
        sourceFileName: selectedFile?.name || fileName || 'past_paper.json',
        sourceHash,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.email || 'admin',
        status: 'published',
        questionCount: validatedQuestions.length,
        questions: validatedQuestions,
        hasAnswerKey,
        extractionStatus: 'READY',
        verificationStatus,
        timeAllowedMinutes: Number(embeddedMinutes) || 210
      };

      setPaperTitle(effectiveTitle);
      setExamYear(embeddedYear);
      setExamName(embeddedExam);
      setConductingBody(embeddedBody);
      setConductingUniversity(embeddedUniv || '');
      setPaperVariant(embeddedVariant);
      setTimeAllowedMinutes(embeddedMinutes);
      setStagedPaper(paper);
      setIsPreviewMode(true);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Validation failed. Please check the JSON format.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmAndSave = async (publishDirectly: boolean) => {
    if (!stagedPaper) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const finalStatus = publishDirectly ? 'published' : 'draft';
      const currentUser = auth.currentUser;
      const now = new Date().toISOString();
      const payload: PastPaper = {
        ...stagedPaper,
        title: paperTitle.trim() || stagedPaper.title,
        year: examYear || stagedPaper.year,
        examName: examName || stagedPaper.examName,
        conductingBody: conductingBody || stagedPaper.conductingBody,
        conductingUniversity: conductingUniversity || stagedPaper.conductingUniversity || '',
        paperDate: paperDate || stagedPaper.paperDate || '',
        paperVariant: paperVariant || stagedPaper.paperVariant,
        timeAllowedMinutes: Number(timeAllowedMinutes) || stagedPaper.timeAllowedMinutes,
        verificationStatus,
        status: finalStatus,
        publishedAt: publishDirectly ? now : '',
        publishedBy: publishDirectly ? (currentUser?.email || 'admin') : ''
      };

      const res = await onSavePaper(payload);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save paper to database.');
        return;
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving paper to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Subject breakdown for review screen
  const subjectBreakdown = stagedPaper ? stagedPaper.questions.reduce((acc, q) => {
    const s = q.subject || 'Other';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  // Filtered questions in preview inspector
  const filteredQuestions = stagedPaper ? stagedPaper.questions.filter(q => {
    const matchesSubject = filterSubject === 'ALL' || q.subject === filterSubject;
    const matchesSearch = !searchQuestionTerm || 
      q.questionText.toLowerCase().includes(searchQuestionTerm.toLowerCase()) ||
      q.options.some(o => o.toLowerCase().includes(searchQuestionTerm.toLowerCase())) ||
      String(q.originalQuestionNumber).includes(searchQuestionTerm);
    return matchesSubject && matchesSearch;
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 space-y-5 text-slate-100 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isPreviewMode ? 'Review & Publish Past Paper' : 'Upload Structured Past Paper (JSON)'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  Global CMS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isPreviewMode 
                  ? 'Verify question integrity, subjects, and answer keys before publishing globally.' 
                  : 'Import official past papers instantly with structured JSON format and 1-click global publish.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* STEP 1: JSON UPLOAD & METADATA CONFIGURATION */}
        {!isPreviewMode && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Quick Actions / Templates */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Quick Tools:</span>
                <button
                  type="button"
                  onClick={handleLoadSamplePaper}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load 2024 Sample Paper</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON Template</span>
              </button>
            </div>

            {/* Input Mode Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  JSON Source Mode
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInputTab('file')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      inputTab === 'file'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Upload .json File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      inputTab === 'text'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Paste JSON Text
                  </button>
                </div>
              </div>

              {inputTab === 'file' && (
                <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center bg-slate-950/60 cursor-pointer relative transition-all">
                  <input
                    type="file"
                    accept=".json,.txt,application/json"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2.5 border border-emerald-500/20">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-white">
                    {fileName ? `Selected: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)` : 'Drop .json past paper file here or click to browse'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Instant JSON parsing without external dependencies. Standard PMDC/NUMS structure supported.
                  </p>
                </div>
              )}

              {inputTab === 'text' && (
                <div className="space-y-1.5">
                  <textarea
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                    placeholder='[\n  {\n    "question": "Which organelle synthesizes ATP?",\n    "options": ["Mitochondria", "Ribosome", "Nucleus", "Lysosome"],\n    "correctAnswer": 0,\n    "subject": "Biology",\n    "explanation": "Mitochondria carry out oxidative phosphorylation."\n  }\n]'
                    rows={7}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-emerald-500 outline-none"
                  />
                  <span className="text-[11px] text-slate-500 block">
                    Tip: Accepts both a raw JSON array of questions, or a full paper object with title, year, and questions array.
                  </span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Paper Metadata & Settings
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Title *</label>
                  <input
                    type="text"
                    value={paperTitle}
                    onChange={(e) => setPaperTitle(e.target.value)}
                    placeholder="e.g. 2024 PMDC Official National NMDCAT"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Exam Year *</label>
                  <input
                    type="text"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Exam Name</label>
                  <select
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  >
                    <option value="NMDCAT">NMDCAT (National)</option>
                    <option value="MDCAT">MDCAT (Provincial)</option>
                    <option value="NUMS">NUMS Medical</option>
                    <option value="UHS">UHS Lahore</option>
                    <option value="DUHS">DUHS Sindh</option>
                    <option value="SZABMU">SZABMU Islamabad</option>
                    <option value="KMU">KMU KPK</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Conducting Authority</label>
                  <input
                    type="text"
                    value={conductingBody}
                    onChange={(e) => setConductingBody(e.target.value)}
                    placeholder="e.g. PMDC"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Conducting University</label>
                  <input
                    type="text"
                    value={conductingUniversity}
                    onChange={(e) => setConductingUniversity(e.target.value)}
                    placeholder="e.g. UHS Lahore / SZABMU"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Variant / Code</label>
                  <input
                    type="text"
                    value={paperVariant}
                    onChange={(e) => setPaperVariant(e.target.value)}
                    placeholder="e.g. Code A / Morning Shift"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Time Allowed (Minutes)</label>
                  <input
                    type="number"
                    value={timeAllowedMinutes}
                    onChange={(e) => setTimeAllowedMinutes(Number(e.target.value))}
                    placeholder="210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Verification Status</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => setVerificationStatus(e.target.value as PastPaperVerificationStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                  >
                    <option value="VERIFIED_OFFICIAL">Verified Official National Paper</option>
                    <option value="COMMUNITY_RECONSTRUCTED">Community Reconstructed</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleValidateAndStage}
                disabled={isValidating || (!selectedFile && !rawJsonText.trim())}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating JSON...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Validate & Review Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW, INSPECTION & GLOBAL PUBLISH */}
        {isPreviewMode && stagedPaper && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Metadata Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Questions</span>
                <span className="text-xl font-black text-emerald-400">{stagedPaper.questionCount} MCQs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Exam & Year</span>
                <span className="text-sm font-bold text-white">{stagedPaper.examName} {stagedPaper.year}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Official Answer Key</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${stagedPaper.hasAnswerKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {stagedPaper.hasAnswerKey ? '100% Verified' : 'Pending in Source'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Source Type</span>
                <span className="text-xs font-bold text-cyan-300 truncate block mt-1">
                  Structured JSON Bank
                </span>
              </div>
            </div>

            {/* Subject Distribution Badges */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject Distribution</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(subjectBreakdown).map(([subject, count]) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setFilterSubject(filterSubject === subject ? 'ALL' : subject)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      filterSubject === subject
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{subject}:</span>
                    <strong className="text-white">{count}</strong>
                  </button>
                ))}
                {filterSubject !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setFilterSubject('ALL')}
                    className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Show All
                  </button>
                )}
              </div>
            </div>

            {/* Questions Inspection List */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question Bank Inspection ({filteredQuestions.length} of {stagedPaper.questionCount})
                </h3>
                <input
                  type="text"
                  value={searchQuestionTerm}
                  onChange={(e) => setSearchQuestionTerm(e.target.value)}
                  placeholder="Filter questions..."
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none w-48 font-normal"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {filteredQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">
                        Q{q.originalQuestionNumber || idx + 1}. [{q.subject || 'General'}]
                      </span>
                      {q.hasOfficialAnswer && q.correctAnswer !== null ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
                          Answer: Option {String.fromCharCode(65 + q.correctAnswer)} ({q.options[q.correctAnswer] || ''})
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold">
                          Key: Not specified
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200">{q.questionText}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-400 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`p-1.5 rounded-lg border truncate ${q.correctAnswer === oIdx ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold' : 'bg-slate-900/60 border-slate-800'}`}>
                          <strong className="text-slate-500 mr-1">{String.fromCharCode(65 + oIdx)}.</strong>
                          {opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <strong className="text-slate-500">Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Publishing Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                &larr; Back to JSON Edit
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleConfirmAndSave(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmAndSave(true)}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Globally...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Publish Paper (Live for All Students)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPastPaperUploadModal;

