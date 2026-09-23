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
  Sparkles
} from 'lucide-react';
import { uploadPastPaperPdf } from '../lib/firebase';
import { auth } from '../lib/firebase';

interface AdminPastPaperUploadModalProps {
  onClose: () => void;
  onSavePaper: (paper: PastPaper) => Promise<{ success: boolean; id?: string; duplicate?: boolean; error?: string }>;
  existingPapers: PastPaper[];
}

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
  const [conductingUniversity, setConductingUniversity] = useState<string>('UHS Lahore / SZABMU / DUHS');
  const [paperVariant, setPaperVariant] = useState<string>('Code A - Official National Paper');
  const [paperDate, setPaperDate] = useState<string>('');
  const [timeAllowedMinutes, setTimeAllowedMinutes] = useState<number>(210);
  const [verificationStatus, setVerificationStatus] = useState<PastPaperVerificationStatus>('VERIFIED_OFFICIAL');

  // Input modes & files
  const [uploadSourceMode, setUploadSourceMode] = useState<'pdf' | 'text' | 'json'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [rawText, setRawText] = useState('');

  // Processing & State
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staging / Extracted Paper
  const [extractedPaper, setExtractedPaper] = useState<PastPaper | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const computeHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);

    if (!paperTitle) {
      const sanitized = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setPaperTitle(sanitized.charAt(0).toUpperCase() + sanitized.slice(1));
    }

    if (file.type.includes('json') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawText((event.target?.result as string) || '');
      };
      reader.readAsText(file);
    }
  };

  const handleExtractAndStage = async () => {
    setErrorMessage(null);
    if (uploadSourceMode === 'pdf' && !selectedFile) {
      setErrorMessage('Please select an authentic PDF file to upload.');
      return;
    }
    if ((uploadSourceMode === 'text' || uploadSourceMode === 'json') && !rawText.trim()) {
      setErrorMessage('Please enter or paste the paper content.');
      return;
    }

    setIsExtracting(true);
    setExtractionProgress('Uploading and extracting questions...');

    try {
      let pdfDownloadUrl: string | undefined = undefined;
      const paperId = `paper_${Date.now()}`;
      const currentUser = auth.currentUser;
      const adminToken = currentUser ? await currentUser.getIdToken() : '';

      // Step 1: Upload PDF to Firebase Storage if PDF provided
      if (uploadSourceMode === 'pdf' && selectedFile) {
        setExtractionProgress('Uploading PDF to Firebase Storage...');
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `past_papers/${examYear}_${paperId}/${cleanName}`;
        try {
          pdfDownloadUrl = await uploadPastPaperPdf(selectedFile, storagePath, {
            examYear,
            examName,
            conductingBody
          });
        } catch (storageErr: any) {
          console.warn('Firebase storage upload failed (will proceed with text extraction):', storageErr);
        }
      }

      // Step 2: Call extraction API
      setExtractionProgress('Extracting and validating questions sequence...');
      let pdfBase64: string | undefined = undefined;

      if (uploadSourceMode === 'pdf' && selectedFile) {
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      const response = await fetch('/api/admin/extract-past-paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {})
        },
        body: JSON.stringify({
          pdfBase64,
          rawText: uploadSourceMode !== 'pdf' ? rawText : '',
          paperTitle: paperTitle || `${examYear} ${examName} Official Paper`,
          examYear,
          conductingBody,
          paperVariant
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Extraction failed with status ${response.status}`);
      }

      const extractResult = await response.json();
      const extractedQuestions: PastPaperQuestion[] = extractResult.questions || [];

      if (extractedQuestions.length === 0) {
        throw new Error('No valid questions could be extracted. Please ensure the document contains numbered questions and options.');
      }

      const questionsWithPaperId = extractedQuestions.map((q, idx) => ({
        ...q,
        pastPaperId: paperId,
        originalQuestionNumber: q.originalQuestionNumber || idx + 1
      }));

      const sourceHash = computeHash(`${paperTitle}_${examYear}_${selectedFile?.name || 'text'}_${questionsWithPaperId.length}`);
      const hasAnswerKey = questionsWithPaperId.some(q => q.hasOfficialAnswer && q.correctAnswer !== null);

      const stagedPaper: PastPaper = {
        id: paperId,
        title: paperTitle.trim() || `${examYear} ${examName} Official Paper`,
        year: examYear,
        examName: examName || 'NMDCAT',
        conductingBody: conductingBody || 'PMDC',
        conductingUniversity: conductingUniversity || undefined,
        paperDate: paperDate || undefined,
        paperVariant: paperVariant || 'Official Paper',
        sourceType: selectedFile ? 'OFFICIAL_PDF' : 'STRUCTURED_JSON',
        sourceFileName: selectedFile?.name || fileName || 'extracted_paper.txt',
        sourceHash,
        pdfUrl: pdfDownloadUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.email || 'admin',
        status: 'published', // default for preview
        questionCount: questionsWithPaperId.length,
        questions: questionsWithPaperId,
        hasAnswerKey,
        extractionStatus: 'READY',
        verificationStatus,
        timeAllowedMinutes: Number(timeAllowedMinutes) || 210
      };

      setExtractedPaper(stagedPaper);
      setIsPreviewMode(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error extracting past paper.');
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
    }
  };

  const handleConfirmAndSave = async (publishDirectly: boolean) => {
    if (!extractedPaper) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const finalStatus = publishDirectly ? 'published' : 'draft';
      const currentUser = auth.currentUser;
      const payload: PastPaper = {
        ...extractedPaper,
        status: finalStatus,
        publishedAt: publishDirectly ? new Date().toISOString() : undefined,
        publishedBy: publishDirectly ? (currentUser?.email || 'admin') : undefined
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-8 space-y-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isPreviewMode ? 'Review & Publish Past Paper' : 'Upload Authentic Past Paper (Admin)'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  Global CMS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isPreviewMode 
                  ? 'Verify extracted questions and answer keys before publishing globally to all students.' 
                  : 'Upload an authentic PDF to Firebase Storage and extract structured question bank.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD & METADATA FORM */}
        {!isPreviewMode && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Title *</label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="e.g. 2024 PMDC Official National NMDCAT"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Exam Year *</label>
                <input
                  type="text"
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Exam Name</label>
                <select
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
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
                  placeholder="e.g. PMDC / Provincial Health Dept"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Conducting University</label>
                <input
                  type="text"
                  value={conductingUniversity}
                  onChange={(e) => setConductingUniversity(e.target.value)}
                  placeholder="e.g. UHS Lahore / DUHS Karachi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Variant / Code</label>
                <input
                  type="text"
                  value={paperVariant}
                  onChange={(e) => setPaperVariant(e.target.value)}
                  placeholder="e.g. Code A / Morning Shift"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Time Allowed (Minutes)</label>
                <input
                  type="number"
                  value={timeAllowedMinutes}
                  onChange={(e) => setTimeAllowedMinutes(Number(e.target.value))}
                  placeholder="210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Date (Optional)</label>
                <input
                  type="date"
                  value={paperDate}
                  onChange={(e) => setPaperDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Source Selection Mode */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Paper Source Document
                </label>
                <div className="flex items-center gap-1.5">
                  {(['pdf', 'text', 'json'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setUploadSourceMode(mode)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        uploadSourceMode === mode
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {mode === 'pdf' ? 'Official PDF' : mode === 'text' ? 'Structured Text' : 'JSON Bank'}
                    </button>
                  ))}
                </div>
              </div>

              {uploadSourceMode === 'pdf' && (
                <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center bg-slate-950/60 cursor-pointer relative transition-all">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">
                    {fileName ? `Selected: ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)` : 'Drop authentic PDF or click to select'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Will be uploaded to Firebase Storage and parsed by the extraction engine.
                  </p>
                </div>
              )}

              {(uploadSourceMode === 'text' || uploadSourceMode === 'json') && (
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    uploadSourceMode === 'json'
                      ? '[\n  {\n    "question": "Which organelle synthesizes ATP?",\n    "options": ["Mitochondria", "Ribosome", "Nucleus", "Lysosome"],\n    "correctAnswer": "A",\n    "subject": "Biology"\n  }\n]'
                      : '1. What is the unit of electric field intensity?\nA) N/C\nB) J/C\nC) V.m\nD) N.m\nAnswer: A\n\n2. Which enzyme hydrolyzes peptide bonds?\nA) Lipase\nB) Protease\nC) Amylase\nD) Ligase\nAnswer: B'
                  }
                  rows={8}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-emerald-500 outline-none"
                />
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExtractAndStage}
                disabled={isExtracting || (!selectedFile && !rawText.trim())}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{extractionProgress || 'Extracting...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract & Preview Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & PUBLISH */}
        {isPreviewMode && extractedPaper && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {/* Metadata Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Extracted Questions</span>
                <span className="text-xl font-black text-emerald-400">{extractedPaper.questionCount} MCQs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Exam & Year</span>
                <span className="text-sm font-bold text-white">{extractedPaper.examName} {extractedPaper.year}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Official Answer Key</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${extractedPaper.hasAnswerKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {extractedPaper.hasAnswerKey ? 'Detected in Document' : 'Pending / Not in Source'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">PDF Storage URL</span>
                <span className="text-xs font-bold text-cyan-300 truncate block mt-1">
                  {extractedPaper.pdfUrl ? 'Firebase Storage Stored' : 'Text Source'}
                </span>
              </div>
            </div>

            {/* Questions Inspection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Extracted Question Sequence (Original Number Order)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Showing 1 to {Math.min(extractedPaper.questions.length, 100)} of {extractedPaper.questionCount}
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {extractedPaper.questions.map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">
                        Q{q.originalQuestionNumber || idx + 1}. [{q.subject || 'General'}]
                      </span>
                      {q.hasOfficialAnswer && q.correctAnswer !== null ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
                          Official Key: Option {String.fromCharCode(65 + q.correctAnswer)}
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
                  </div>
                ))}
              </div>
            </div>

            {/* Publishing Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                &larr; Back to Edit
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleConfirmAndSave(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmAndSave(true)}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing Globally...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Publish to All Students</span>
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
