import React, { useState } from 'react';
import { 
  PastPaper, 
  PastPaperQuestion, 
  PastPaperSourceType, 
  PastPaperVerificationStatus, 
  SubjectType 
} from '../types';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  Eye, 
  Info,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import UiCard from './UiCard';

interface PastPaperImporterModalProps {
  onClose: () => void;
  onSavePaper: (paper: PastPaper) => Promise<{ success: boolean; duplicate?: boolean; error?: string }>;
  existingPapers: PastPaper[];
}

export const PastPaperImporterModal: React.FC<PastPaperImporterModalProps> = ({
  onClose,
  onSavePaper,
  existingPapers
}) => {
  const [paperTitle, setPaperTitle] = useState('');
  const [examYear, setExamYear] = useState<string>('2024');
  const [conductingBody, setConductingBody] = useState<string>('PMDC / Provincial MDCAT');
  const [paperVariant, setPaperVariant] = useState<string>('Official National Paper');
  const [verificationStatus, setVerificationStatus] = useState<PastPaperVerificationStatus>('USER_IMPORTED');
  
  const [importMode, setImportMode] = useState<'file' | 'json' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Staging / Preview state
  const [extractedPaper, setExtractedPaper] = useState<PastPaper | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Simple string hash function for client-side duplicate detection
  const computeSimpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    if (!paperTitle) {
      // Auto populate title from filename
      setPaperTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content || '');
    };
    reader.readAsText(file);
  };

  const parseJsonPaper = (content: string): PastPaperQuestion[] => {
    const parsed = JSON.parse(content);
    const rawList = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.mcqs || parsed.items || []);
    if (!Array.isArray(rawList)) throw new Error('Invalid JSON format: array of questions expected.');

    return rawList.map((q: any, idx: number) => {
      let options: [string, string, string, string] = ['A', 'B', 'C', 'D'];
      if (Array.isArray(q.options) && q.options.length >= 2) {
        options = [
          String(q.options[0] || 'Option A'),
          String(q.options[1] || 'Option B'),
          String(q.options[2] || 'Option C'),
          String(q.options[3] || 'Option D')
        ];
      }

      let correctAnswer: number | null = null;
      let hasOfficialAnswer = false;

      if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3) {
        correctAnswer = q.correctIndex;
        hasOfficialAnswer = true;
      } else if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim()) {
        const ca = q.correctAnswer.trim().toUpperCase();
        if (ca === 'A' || ca === '0') { correctAnswer = 0; hasOfficialAnswer = true; }
        else if (ca === 'B' || ca === '1') { correctAnswer = 1; hasOfficialAnswer = true; }
        else if (ca === 'C' || ca === '2') { correctAnswer = 2; hasOfficialAnswer = true; }
        else if (ca === 'D' || ca === '3') { correctAnswer = 3; hasOfficialAnswer = true; }
      }

      return {
        id: q.id || `q_${idx + 1}`,
        pastPaperId: '',
        originalQuestionNumber: q.originalQuestionNumber || idx + 1,
        questionText: q.question || q.questionText || `Question ${idx + 1}`,
        options,
        correctAnswer,
        hasOfficialAnswer,
        subject: (q.subject as SubjectType) || 'Unknown',
        topic: q.topic || '',
        explanation: q.explanation || '',
        extractionConfidence: 100
      };
    });
  };

  const parseStructuredTextPaper = (content: string): PastPaperQuestion[] => {
    // Parser for structured past-paper text:
    // Q1. Question text...
    // A) ...
    // B) ...
    // C) ...
    // D) ...
    // Answer: B (optional)
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const questions: PastPaperQuestion[] = [];
    let currentQ: Partial<PastPaperQuestion> | null = null;
    let currentOptions: string[] = [];
    let qNumberCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const qMatch = line.match(/^(?:Q(?:uestion)?\s*(\d+)[\.:\)]?|\b(\d+)[\.:\)])\s*(.+)/i);

      if (qMatch) {
        if (currentQ && currentQ.questionText && currentOptions.length >= 2) {
          while (currentOptions.length < 4) currentOptions.push(`Option ${String.fromCharCode(65 + currentOptions.length)}`);
          questions.push({
            id: `q_${currentQ.originalQuestionNumber || questions.length + 1}`,
            pastPaperId: '',
            originalQuestionNumber: currentQ.originalQuestionNumber || questions.length + 1,
            questionText: currentQ.questionText,
            options: [currentOptions[0], currentOptions[1], currentOptions[2], currentOptions[3]],
            correctAnswer: currentQ.correctAnswer ?? null,
            hasOfficialAnswer: currentQ.hasOfficialAnswer ?? false,
            subject: currentQ.subject || 'Unknown',
            topic: currentQ.topic || '',
            explanation: currentQ.explanation || '',
            extractionConfidence: 95
          });
        }

        const num = parseInt(qMatch[1] || qMatch[2], 10) || qNumberCounter++;
        currentQ = {
          originalQuestionNumber: num,
          questionText: qMatch[3].trim(),
          correctAnswer: null,
          hasOfficialAnswer: false,
          subject: 'Unknown'
        };
        currentOptions = [];
        continue;
      }

      // Check option line: A) or A. or (A)
      const optMatch = line.match(/^[\(\[]?([A-Da-d])[\)\]\.\:]\s*(.+)/);
      if (optMatch && currentQ) {
        currentOptions.push(optMatch[2].trim());
        continue;
      }

      // Check answer line: Answer: A or Ans: B
      const ansMatch = line.match(/^(?:Answer|Ans|Key)\s*[\:\=]\s*([A-Da-d])/i);
      if (ansMatch && currentQ) {
        const letter = ansMatch[1].toUpperCase();
        currentQ.correctAnswer = letter.charCodeAt(0) - 65;
        currentQ.hasOfficialAnswer = true;
        continue;
      }

      // Check explanation line
      const expMatch = line.match(/^(?:Explanation|Reason)\s*[\:\=]\s*(.+)/i);
      if (expMatch && currentQ) {
        currentQ.explanation = expMatch[1].trim();
        continue;
      }

      // Multi-line question continuation
      if (currentQ && currentOptions.length === 0) {
        currentQ.questionText += ' ' + line;
      }
    }

    if (currentQ && currentQ.questionText && currentOptions.length >= 2) {
      while (currentOptions.length < 4) currentOptions.push(`Option ${String.fromCharCode(65 + currentOptions.length)}`);
      questions.push({
        id: `q_${currentQ.originalQuestionNumber || questions.length + 1}`,
        pastPaperId: '',
        originalQuestionNumber: currentQ.originalQuestionNumber || questions.length + 1,
        questionText: currentQ.questionText,
        options: [currentOptions[0], currentOptions[1], currentOptions[2], currentOptions[3]],
        correctAnswer: currentQ.correctAnswer ?? null,
        hasOfficialAnswer: currentQ.hasOfficialAnswer ?? false,
        subject: currentQ.subject || 'Unknown',
        topic: currentQ.topic || '',
        explanation: currentQ.explanation || '',
        extractionConfidence: 95
      });
    }

    return questions;
  };

  const handleProcessImport = () => {
    setExtractionError(null);
    if (!rawText.trim()) {
      setExtractionError('Please upload a file or paste structured past-paper text.');
      return;
    }

    setIsProcessing(true);
    try {
      let questions: PastPaperQuestion[] = [];
      const trimmed = rawText.trim();

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        questions = parseJsonPaper(trimmed);
      } else {
        questions = parseStructuredTextPaper(trimmed);
      }

      if (questions.length === 0) {
        throw new Error('No questions could be extracted from the source content. Ensure questions are numbered (e.g., 1., 2.) with options (A, B, C, D).');
      }

      const sourceHash = computeSimpleHash(`${paperTitle}_${examYear}_${rawText.slice(0, 500)}_${questions.length}`);
      
      // Check duplicate
      const duplicate = existingPapers.find(p => p.sourceHash === sourceHash);
      if (duplicate) {
        throw new Error(`Duplicate paper detected! This exact paper has already been imported as "${duplicate.title}".`);
      }

      const paperId = `paper_${Date.now()}`;
      const questionsWithPaperId = questions.map(q => ({
        ...q,
        pastPaperId: paperId
      }));

      const hasAnswerKey = questions.some(q => q.hasOfficialAnswer && q.correctAnswer !== null);

      const paper: PastPaper = {
        id: paperId,
        title: paperTitle.trim() || `${examYear} MDCAT Past Paper`,
        year: examYear,
        examName: 'MDCAT',
        conductingBody,
        paperVariant,
        sourceType: fileName.endsWith('.json') ? 'STRUCTURED_JSON' : (fileName.endsWith('.pdf') ? 'OFFICIAL_PDF' : 'USER_IMPORT'),
        sourceFileName: fileName || 'manual_text_entry.txt',
        sourceHash,
        uploadedAt: new Date().toISOString(),
        questionCount: questionsWithPaperId.length,
        questions: questionsWithPaperId,
        hasAnswerKey,
        extractionStatus: 'READY',
        verificationStatus
      };

      setExtractedPaper(paper);
      setIsPreviewMode(true);
    } catch (err: any) {
      setExtractionError(err.message || 'Failed to extract past paper questions.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!extractedPaper) return;
    setIsSaving(true);
    try {
      const res = await onSavePaper(extractedPaper);
      if (!res.success) {
        setExtractionError(res.error || 'Failed to save paper.');
        return;
      }
      onClose();
    } catch (err: any) {
      setExtractionError(err.message || 'Error saving past paper.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                {isPreviewMode ? 'Review Extracted Past Paper' : 'Import Authentic Past Paper'}
              </h2>
              <p className="text-xs text-slate-400">
                {isPreviewMode 
                  ? 'Verify extracted questions and source metadata before publishing to your library.' 
                  : 'Upload an authentic PDF, JSON, or structured text source document.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {extractionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{extractionError}</span>
          </div>
        )}

        {/* Form Mode */}
        {!isPreviewMode && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Title</label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="e.g. 2024 MDCAT Official National Paper"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Exam Year</label>
                <input
                  type="text"
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Conducting Authority</label>
                <input
                  type="text"
                  value={conductingBody}
                  onChange={(e) => setConductingBody(e.target.value)}
                  placeholder="e.g. PMDC, UHS, SZABMU, DUHS, KMU"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Paper Variant / Code</label>
                <input
                  type="text"
                  value={paperVariant}
                  onChange={(e) => setPaperVariant(e.target.value)}
                  placeholder="e.g. Code A, Morning Session"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Import Mode Switcher */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {(['file', 'text', 'json'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setImportMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                      importMode === mode
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {mode === 'file' ? 'Upload Document (.json, .txt)' : mode === 'text' ? 'Paste Text' : 'Paste JSON'}
                  </button>
                ))}
              </div>

              {importMode === 'file' && (
                <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center bg-slate-950/50 cursor-pointer relative">
                  <input
                    type="file"
                    accept=".json,.txt,.csv,.doc,.docx,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">
                    {fileName ? `Selected: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)` : 'Click to select or drop past-paper source file'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Supports structured JSON, text extracts, and official transcripts</p>
                </div>
              )}

              {(importMode === 'text' || importMode === 'json') && (
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    importMode === 'json'
                      ? '[\n  {\n    "question": "Which enzyme converts Pyruvate to Acetyl-CoA?",\n    "options": ["Pyruvate dehydrogenase", "Hexokinase", "Phosphofructokinase", "Enolase"],\n    "correctAnswer": "A",\n    "subject": "Biology"\n  }\n]'
                      : '1. What is the standard enthalpy of formation of an element in its standard state?\nA) Zero\nB) Positive\nC) Negative\nD) Variable\nAnswer: A\n\n2. Which component regulates membrane fluidity at cold temperatures?\nA) Phospholipids\nB) Cholesterol\nC) Glycoproteins\nD) Integral proteins\nAnswer: B'
                  }
                  rows={8}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:border-emerald-500 outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={isProcessing || !rawText.trim()}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Source Questions...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Preview Paper</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview / Verification Mode */}
        {isPreviewMode && extractedPaper && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Metadata Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Extracted Questions</span>
                <span className="text-lg font-bold text-emerald-400">{extractedPaper.questionCount} MCQs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Exam Year</span>
                <span className="text-lg font-bold text-slate-200">{extractedPaper.year}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Answer Key</span>
                <span className={`text-xs font-bold px-2 py-1 rounded inline-block mt-1 ${extractedPaper.hasAnswerKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {extractedPaper.hasAnswerKey ? 'Available in Source' : 'Unavailable in Source'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Provenance</span>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-950/50 px-2 py-1 rounded border border-cyan-500/20 inline-block mt-1">
                  {extractedPaper.verificationStatus}
                </span>
              </div>
            </div>

            {/* Questions List Preview */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Question Sequence (Preserved Original Order)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {extractedPaper.questions.slice(0, 10).map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">
                        Q{q.originalQuestionNumber} ({q.subject})
                      </span>
                      {q.hasOfficialAnswer && q.correctAnswer !== null ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                          Official Key: Option {String.fromCharCode(65 + q.correctAnswer)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-semibold">
                          Key: Unavailable
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200">{q.questionText}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="truncate">
                          <strong className="text-slate-500 mr-1">{String.fromCharCode(65 + oIdx)}.</strong>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {extractedPaper.questionCount > 10 && (
                  <p className="text-center text-[11px] text-slate-500 italic py-1">
                    ... and {extractedPaper.questionCount - 10} more questions in exact source order.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Past Papers Vault...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Publish to Library</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
