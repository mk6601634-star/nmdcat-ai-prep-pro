import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  BookOpen, 
  Sparkles, 
  FileText, 
  Filter, 
  Check, 
  X, 
  ArrowRight, 
  HelpCircle,
  Sliders,
  Database
} from 'lucide-react';
import { MCQQuestion, SubjectType } from '../types';
import { 
  runAutomatedQuestionBankValidation, 
  ValidationReport, 
  ValidationItemResult, 
  applyCorrectionToMcq 
} from '../lib/mcqValidatorScript';
import { isAiRequestCancelled } from '../lib/aiRequest';
import { useCancelableRequest } from '../lib/useCancelableRequest';

interface AutomatedMcqValidatorSuiteProps {
  questionBank: MCQQuestion[];
  onUpdateQuestionBank?: (updatedBank: MCQQuestion[]) => void;
}

export const AutomatedMcqValidatorSuite: React.FC<AutomatedMcqValidatorSuiteProps> = ({
  questionBank,
  onUpdateQuestionBank
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStepMessage, setScanStepMessage] = useState<string>('');
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'FLAGGED' | 'VALID'>('FLAGGED');
  const [appliedFixedIds, setAppliedFixedIds] = useState<Set<string>>(new Set());
  const validationRequest = useCancelableRequest();

  // Filter questions by subject
  const targetQuestions = React.useMemo(() => {
    if (selectedSubjectFilter === 'All') return questionBank;
    return questionBank.filter((q) => q.subject === selectedSubjectFilter);
  }, [questionBank, selectedSubjectFilter]);

  const handleStartAutomatedValidation = async () => {
    if (!targetQuestions || targetQuestions.length === 0) return;

    setIsScanning(true);
    setScanStepMessage('Extracting MCQ statements, options, and explanations...');

    setTimeout(() => {
      setScanStepMessage('Connecting to Gemini Medical Examiner Engine with FSc Textbook Grounding...');
    }, 800);

    setTimeout(() => {
      setScanStepMessage('Cross-referencing against PMDC Curriculum & Board Textbooks (Punjab, Sindh, KPK, Federal)...');
    }, 1800);

    let abortController: AbortController | null = null;
    try {
      abortController = validationRequest.startRequest();
      const resultReport = await runAutomatedQuestionBankValidation(targetQuestions, abortController.signal);
      setReport(resultReport);
      setIsScanning(false);
      setScanStepMessage('');
    } catch (err) {
      if (isAiRequestCancelled(err)) {
        setIsScanning(false);
        setScanStepMessage('');
        return;
      }
      console.error('Validation Scan Error:', err);
      setIsScanning(false);
      setScanStepMessage('');
      alert('Validation scan failed to complete. Please check your network or retry.');
    } finally {
      if (abortController) {
        validationRequest.clearIfCurrent(abortController);
      }
    }
  };


  const handleFixSingleQuestion = (result: ValidationItemResult) => {
    if (!result.suggestedCorrection) return;

    const targetMcq = questionBank.find((q) => q.id === result.questionId);
    if (!targetMcq) return;

    const fixedMcq = applyCorrectionToMcq(targetMcq, result.suggestedCorrection);

    // Update parent bank if available
    if (onUpdateQuestionBank) {
      const updated = questionBank.map((q) => (q.id === targetMcq.id ? fixedMcq : q));
      onUpdateQuestionBank(updated);
    }

    setAppliedFixedIds((prev) => new Set(prev).add(targetMcq.id));
  };

  const handleFixAllFlagged = () => {
    if (!report || !report.results) return;

    const flaggedResults = report.results.filter(
      (r) => r.status !== 'VALID' && r.suggestedCorrection
    );

    if (flaggedResults.length === 0) return;

    let updatedBank = [...questionBank];
    const newlyFixed = new Set(appliedFixedIds);

    flaggedResults.forEach((res) => {
      const target = updatedBank.find((q) => q.id === res.questionId);
      if (target && res.suggestedCorrection) {
        const fixed = applyCorrectionToMcq(target, res.suggestedCorrection);
        updatedBank = updatedBank.map((q) => (q.id === target.id ? fixed : q));
        newlyFixed.add(target.id);
      }
    });

    if (onUpdateQuestionBank) {
      onUpdateQuestionBank(updatedBank);
    }

    setAppliedFixedIds(newlyFixed);
    alert(`Successfully applied corrections to ${flaggedResults.length} flagged questions!`);
  };

  const filteredResults = React.useMemo(() => {
    if (!report || !report.results) return [];
    if (activeFilterTab === 'FLAGGED') {
      return report.results.filter((r) => r.status !== 'VALID');
    }
    if (activeFilterTab === 'VALID') {
      return report.results.filter((r) => r.status === 'VALID');
    }
    return report.results;
  }, [report, activeFilterTab]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>AI Curriculum Audit & Cross-Reference Engine</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Automated Question Bank Validator</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Gemini Grounded
            </span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Cross-references the live MCQ question bank against verified PMDC guidelines and provincial FSc textbook standards (Punjab, Sindh, KPK, Federal) to flag inaccuracies, ambiguous choices, and answer key flaws.
          </p>
        </div>

        {/* Target Scope & Launch Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none border border-slate-700"
            >
              <option value="All">All Subjects ({questionBank.length} MCQs)</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="English">English</option>
              <option value="Logical Reasoning">Logical Reasoning</option>
            </select>
          </div>

          <button
            onClick={handleStartAutomatedValidation}
            disabled={isScanning || targetQuestions.length === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              isScanning
                ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed border border-indigo-700/50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isScanning ? 'Scanning Question Bank...' : `Run Validation Scan (${targetQuestions.length})`}</span>
          </button>
        </div>
      </div>

      {/* Live Scan Loading State */}
      {isScanning && (
        <div className="bg-slate-900/90 border border-indigo-500/30 p-8 rounded-2xl text-center space-y-4 shadow-2xl animate-pulse">
          <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
            <ShieldCheck className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Cross-Referencing MCQs via Gemini Engine</h3>
            <p className="text-xs text-indigo-300 font-mono">{scanStepMessage}</p>
          </div>
          <div className="w-full max-w-md mx-auto bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-400 h-full w-3/4 animate-pulse" />
          </div>
        </div>
      )}

      {/* Validation Report Summary */}
      {report && !isScanning && (
        <div className="space-y-6">
          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Total Audited
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{report.totalAudited}</span>
                <span className="text-xs text-slate-400">MCQs</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Scope: {selectedSubjectFilter}</span>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Verified Accurate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{report.validCount}</span>
                <span className="text-xs text-emerald-500 font-semibold">100% Textbook Sound</span>
              </div>
              <span className="text-[11px] text-emerald-500/80 block">Pass PMDC Standard</span>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Flagged Discrepancies
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400">{report.flaggedCount}</span>
                <span className="text-xs text-rose-400 font-semibold">Need Attention</span>
              </div>
              <span className="text-[11px] text-rose-400/80 block">Key or Phrasing Issues</span>
            </div>

            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Accuracy Index
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-400">{report.accuracyPercentage}%</span>
                <span className="text-xs text-indigo-400 font-semibold">Overall Quality</span>
              </div>
              <span className="text-[11px] text-slate-400 block">Verified by Gemini 3.6</span>
            </div>
          </div>

          {/* Quality Appraisal & Batch Fix Bar */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Gemini Curriculum Appraisal Summary</h4>
                <p className="text-xs text-slate-300 mt-0.5">{report.summaryNotes}</p>
              </div>
            </div>

            {report.flaggedCount > 0 && (
              <button
                onClick={handleFixAllFlagged}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shrink-0"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Batch Fix All {report.flaggedCount} Flagged Questions</span>
              </button>
            )}
          </div>

          {/* Results Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilterTab('FLAGGED')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeFilterTab === 'FLAGGED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Flagged Discrepancies ({report.flaggedCount})</span>
              </button>

              <button
                onClick={() => setActiveFilterTab('VALID')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeFilterTab === 'VALID'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Accurate ({report.validCount})</span>
              </button>

              <button
                onClick={() => setActiveFilterTab('ALL')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  activeFilterTab === 'ALL'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>All Results ({report.totalAudited})</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No items found for this filter tab</h4>
                <p className="text-xs text-slate-400">All questions in this view pass validation standards.</p>
              </div>
            ) : (
              filteredResults.map((result) => {
                const targetMcq = questionBank.find((q) => q.id === result.questionId);
                const isFixed = appliedFixedIds.has(result.questionId);

                return (
                  <div
                    key={result.questionId}
                    className={`p-5 rounded-2xl border transition-all space-y-4 ${
                      result.status === 'VALID'
                        ? 'bg-slate-900/60 border-slate-800'
                        : result.status === 'NEEDS_CORRECTION'
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-amber-950/20 border-amber-500/30'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            result.status === 'VALID'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : result.status === 'NEEDS_CORRECTION'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {result.status === 'VALID'
                            ? 'Verified Accurate'
                            : result.status === 'NEEDS_CORRECTION'
                            ? 'Needs Correction'
                            : 'Ambiguous Options'}
                        </span>

                        <span className="text-xs text-slate-400 font-mono">ID: {result.questionId}</span>
                        {targetMcq && (
                          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                            {targetMcq.subject} • {targetMcq.chapter}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 font-medium">Verified Source:</span>
                        <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                          {result.verifiedSource}
                        </span>
                      </div>
                    </div>

                    {/* Question Content & Analysis */}
                    {targetMcq && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Current Question Text:</span>
                          <p className="text-sm font-semibold text-white leading-relaxed">{targetMcq.question}</p>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {targetMcq.options.map((opt, idx) => {
                            const isCurrentCorrect = idx === targetMcq.correctIndex;
                            const isSuggestedCorrect =
                              result.suggestedCorrection?.correctedIndex === idx;

                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                  isCurrentCorrect && isSuggestedCorrect
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                                    : isCurrentCorrect
                                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-bold'
                                    : isSuggestedCorrect
                                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-black'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-slate-500">[{String.fromCharCode(65 + idx)}]</span>
                                  <span>{opt}</span>
                                </span>

                                <span className="text-[10px] font-bold">
                                  {isCurrentCorrect && !isSuggestedCorrect && (
                                    <span className="text-rose-400">(Live Answer)</span>
                                  )}
                                  {isSuggestedCorrect && (
                                    <span className="text-emerald-400 font-black">(Verified Fix)</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Issues Found & Correction Detail */}
                    {result.status !== 'VALID' && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-rose-400 font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Issue Analysis:</span>
                          </span>
                          <p className="text-slate-300 leading-relaxed">{result.issuesFound}</p>
                        </div>

                        {result.suggestedCorrection && (
                          <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20 space-y-2">
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Gemini Suggested Correction:</span>
                            </span>

                            {result.suggestedCorrection.correctionReason && (
                              <p className="text-emerald-300/90 text-xs italic">
                                "{result.suggestedCorrection.correctionReason}"
                              </p>
                            )}

                            {result.suggestedCorrection.suggestedExplanation && (
                              <div className="text-slate-300 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                                <span className="font-bold text-emerald-400 block mb-0.5">Updated Explanation:</span>
                                <span>{result.suggestedCorrection.suggestedExplanation}</span>
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-end">
                              <button
                                onClick={() => handleFixSingleQuestion(result)}
                                disabled={isFixed}
                                className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                                  isFixed
                                    ? 'bg-slate-800 text-slate-500 cursor-default'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                                }`}
                              >
                                {isFixed ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Correction Applied</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>Apply Correction</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
