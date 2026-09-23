import React, { useState, useEffect } from 'react';
import { 
  PastPaper, 
  PastPaperQuestion, 
  SubjectType 
} from '../types';
import { 
  FileCheck, 
  UploadCloud, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Archive, 
  Trash2, 
  Eye, 
  Edit3, 
  Globe, 
  ExternalLink, 
  Layers, 
  FileText, 
  Building, 
  Calendar, 
  Check, 
  X, 
  Loader2, 
  ShieldCheck, 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import UiCard from './UiCard';
import AdminPastPaperUploadModal from './AdminPastPaperUploadModal';
import { 
  subscribeToAllPastPapersForAdmin, 
  saveGlobalPastPaper, 
  publishPastPaper, 
  unpublishPastPaper, 
  archivePastPaper, 
  updatePastPaperMetadata, 
  deletePastPaper 
} from '../lib/firestoreService';

interface AdminPastPaperManagerProps {
  currentUser?: any;
}

export const AdminPastPaperManager: React.FC<AdminPastPaperManagerProps> = ({ currentUser }) => {
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [inspectingPaper, setInspectingPaper] = useState<PastPaper | null>(null);
  const [editingMetadataPaper, setEditingMetadataPaper] = useState<PastPaper | null>(null);

  // Question editing within inspector
  const [editingQuestion, setEditingQuestion] = useState<{ paperId: string; question: PastPaperQuestion } | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToAllPastPapersForAdmin((data) => {
      setPapers(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtered Papers
  const filteredPapers = papers.filter((paper) => {
    const matchesSearch = 
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (paper.conductingBody || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (paper.conductingUniversity || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(paper.year).includes(searchQuery);

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'published' ? (paper.status === 'published' || (paper.status as any) === 'PUBLISHED') :
      statusFilter === 'draft' ? (paper.status === 'draft' || !paper.status) :
      paper.status === 'archived';

    const matchesYear = yearFilter === 'all' ? true : String(paper.year) === yearFilter;

    return matchesSearch && matchesStatus && matchesYear;
  });

  // Unique Years for Filter
  const availableYears = Array.from(new Set(papers.map(p => String(p.year)).filter(Boolean))).sort().reverse();

  // Metrics
  const totalPapers = papers.length;
  const publishedCount = papers.filter(p => p.status === 'published' || (p.status as any) === 'PUBLISHED').length;
  const draftCount = papers.filter(p => p.status === 'draft' || !p.status).length;
  const totalQuestionsInVault = papers.reduce((sum, p) => sum + (p.questionCount || p.questions?.length || 0), 0);

  // Action Handlers
  const handlePublishToggle = async (paper: PastPaper) => {
    setActionInProgressId(paper.id);
    try {
      if (paper.status === 'published' || (paper.status as any) === 'PUBLISHED') {
        await unpublishPastPaper(paper.id);
      } else {
        await publishPastPaper(paper.id, currentUser?.uid || currentUser?.email || 'admin');
      }
    } catch (err) {
      console.error('Error toggling publish state:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleArchive = async (paperId: string) => {
    if (!window.confirm('Are you sure you want to archive this past paper? It will be removed from student practice until restored.')) return;
    setActionInProgressId(paperId);
    try {
      await archivePastPaper(paperId);
    } catch (err) {
      console.error('Error archiving paper:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDelete = async (paperId: string, title: string) => {
    if (!window.confirm(`PERMANENT DELETE: Are you sure you want to permanently delete "${title}" and all its extracted questions? This action cannot be undone.`)) return;
    setActionInProgressId(paperId);
    try {
      await deletePastPaper(paperId);
    } catch (err) {
      console.error('Error deleting paper:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleSaveUploadedPaper = async (paper: PastPaper) => {
    return saveGlobalPastPaper(paper, currentUser?.uid || currentUser?.email || 'admin');
  };

  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetadataPaper) return;
    setActionInProgressId(editingMetadataPaper.id);
    try {
      await updatePastPaperMetadata(editingMetadataPaper.id, {
        title: editingMetadataPaper.title,
        year: editingMetadataPaper.year,
        examName: editingMetadataPaper.examName,
        conductingBody: editingMetadataPaper.conductingBody,
        conductingUniversity: editingMetadataPaper.conductingUniversity,
        paperVariant: editingMetadataPaper.paperVariant,
        timeAllowedMinutes: Number(editingMetadataPaper.timeAllowedMinutes) || 210
      });
      setEditingMetadataPaper(null);
    } catch (err) {
      console.error('Error updating metadata:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleSaveEditedQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !inspectingPaper) return;
    setActionInProgressId(editingQuestion.question.id);

    try {
      const updatedQuestions = inspectingPaper.questions.map(q => 
        q.id === editingQuestion.question.id ? editingQuestion.question : q
      );
      await updatePastPaperMetadata(inspectingPaper.id, {
        questions: updatedQuestions,
        questionCount: updatedQuestions.length
      });
      setInspectingPaper(prev => prev ? { ...prev, questions: updatedQuestions } : null);
      setEditingQuestion(null);
    } catch (err) {
      console.error('Error updating question:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <UiCard className="p-4 sm:p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>PMDC Official Past Papers Vault & CMS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
            <span>Authentic Past Papers Management</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
              Global Cloud Vault
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload genuine past papers once via PDF or structured source, store files in Firebase Storage, inspect extracted questions, and publish globally to all students.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Upload Official Past Paper</span>
        </button>
      </UiCard>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Past Papers</span>
          <span className="text-2xl font-black text-white">{totalPapers}</span>
          <span className="text-[10px] text-slate-500 block font-semibold">In Global Repository</span>
        </div>

        <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-500/30 space-y-1">
          <span className="text-emerald-400 text-[10px] uppercase font-bold block">Published Globally</span>
          <span className="text-2xl font-black text-emerald-300">{publishedCount}</span>
          <span className="text-[10px] text-emerald-400/80 block font-semibold">Active in Student App</span>
        </div>

        <div className="p-4 bg-amber-950/20 rounded-2xl border border-amber-500/30 space-y-1">
          <span className="text-amber-400 text-[10px] uppercase font-bold block">Drafts / Staging</span>
          <span className="text-2xl font-black text-amber-300">{draftCount}</span>
          <span className="text-[10px] text-amber-400/80 block font-semibold">Awaiting Verification</span>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase font-bold block">Total MCQs in Vault</span>
          <span className="text-2xl font-black text-cyan-300">{totalQuestionsInVault}</span>
          <span className="text-[10px] text-cyan-400/80 block font-semibold">Exact Source Questions</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers by title, university, conducting body, or year..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['all', 'published', 'draft', 'archived'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === status
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Year Dropdown */}
          {availableYears.length > 0 && (
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-emerald-500 outline-none font-medium"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Papers Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
            <p className="text-xs">Synchronizing Global Past Papers from Cloud Vault...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Past Papers Found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery || statusFilter !== 'all' || yearFilter !== 'all'
                ? 'No past papers match your current search and filter criteria.'
                : 'No authentic past papers have been uploaded yet. Click "+ Upload Official Past Paper" to add your first real paper.'}
            </p>
            {papers.length === 0 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Paper</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Paper Details</th>
                  <th className="py-3.5 px-4">Exam & Year</th>
                  <th className="py-3.5 px-4">Authority / University</th>
                  <th className="py-3.5 px-4 text-center">Questions</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Published / Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPapers.map((paper) => {
                  const isPublished = paper.status === 'published' || (paper.status as any) === 'PUBLISHED';
                  const isArchived = paper.status === 'archived';

                  return (
                    <tr key={paper.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* Paper Details */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{paper.title}</span>
                            {paper.pdfUrl && (
                              <a
                                href={paper.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] inline-flex items-center gap-1 font-mono"
                                title="Open Stored PDF from Firebase Storage"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>PDF</span>
                              </a>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span className="font-mono text-emerald-400/80">{paper.paperVariant || 'National Paper'}</span>
                            <span>&bull;</span>
                            <span>{paper.timeAllowedMinutes || 210} Mins</span>
                          </div>
                        </div>
                      </td>

                      {/* Exam & Year */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-black text-white text-sm">{paper.year}</span>
                          <span className="text-[10px] text-cyan-300 block font-bold">{paper.examName || 'NMDCAT'}</span>
                        </div>
                      </td>

                      {/* Authority */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-200 block truncate max-w-[180px]">
                            {paper.conductingBody || 'PMDC'}
                          </span>
                          {paper.conductingUniversity && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                              {paper.conductingUniversity}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Question Count */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="inline-block space-y-0.5">
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {paper.questionCount || paper.questions?.length || 0} MCQs
                          </span>
                          <span className="block text-[9px] text-slate-500">
                            {paper.hasAnswerKey ? 'Official Key Included' : 'No Official Key'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Globe className="w-3 h-3" />
                            <span>Published</span>
                          </span>
                        ) : isArchived ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Archive className="w-3 h-3" />
                            <span>Archived</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      {/* Published / Uploaded Metadata */}
                      <td className="py-4 px-4 whitespace-nowrap text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-slate-300 block font-mono">
                            {paper.publishedAt 
                              ? new Date(paper.publishedAt).toLocaleDateString() 
                              : (paper.uploadedAt ? new Date(paper.uploadedAt).toLocaleDateString() : '—')}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                            By {paper.uploadedBy || 'admin'}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Review Questions */}
                          <button
                            onClick={() => setInspectingPaper(paper)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Inspect & Review Questions"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Metadata */}
                          <button
                            onClick={() => setEditingMetadataPaper(paper)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Edit Paper Metadata"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Publish / Unpublish Toggle */}
                          <button
                            onClick={() => handlePublishToggle(paper)}
                            disabled={actionInProgressId === paper.id}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                              isPublished
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                            title={isPublished ? 'Unpublish Paper (Revert to Draft)' : 'Publish Globally to Students'}
                          >
                            {actionInProgressId === paper.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isPublished ? (
                              <span>Unpublish</span>
                            ) : (
                              <span>Publish</span>
                            )}
                          </button>

                          {/* Archive */}
                          {!isArchived && (
                            <button
                              onClick={() => handleArchive(paper.id)}
                              disabled={actionInProgressId === paper.id}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400"
                              title="Archive Paper"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(paper.id, paper.title)}
                            disabled={actionInProgressId === paper.id}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="Delete Paper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <AdminPastPaperUploadModal
          onClose={() => setShowUploadModal(false)}
          onSavePaper={handleSaveUploadedPaper}
          existingPapers={papers}
        />
      )}

      {/* QUESTIONS INSPECTION MODAL */}
      {inspectingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-8 space-y-6 text-slate-100 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>{inspectingPaper.title}</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono">
                      {inspectingPaper.questionCount || inspectingPaper.questions?.length} MCQs
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Exact question sequence from official source. All questions are graded with the verified answer key.
                  </p>
                </div>
              </div>
              <button onClick={() => setInspectingPaper(null)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {inspectingPaper.questions && inspectingPaper.questions.length > 0 ? (
                inspectingPaper.questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          Q{q.originalQuestionNumber || idx + 1}.
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {q.subject || 'General'}
                        </span>
                        {q.topic && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                            {q.topic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {q.hasOfficialAnswer && q.correctAnswer !== null ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            Key: Option {String.fromCharCode(65 + q.correctAnswer)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            Key: Missing
                          </span>
                        )}
                        <button
                          onClick={() => setEditingQuestion({ paperId: inspectingPaper.id, question: { ...q } })}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-100 font-medium leading-relaxed">{q.questionText}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 ${
                            q.correctAnswer === oIdx
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            q.correctAnswer === oIdx ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No questions currently stored in this document.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setInspectingPaper(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUESTION MODAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleSaveEditedQuestion} className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">
                Edit Question {editingQuestion.question.originalQuestionNumber}
              </h3>
              <button type="button" onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-400 block mb-1">Question Text</label>
                <textarea
                  value={editingQuestion.question.questionText}
                  onChange={(e) => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, questionText: e.target.value }
                  })}
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Subject</label>
                  <select
                    value={editingQuestion.question.subject || 'Biology'}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, subject: e.target.value as SubjectType }
                    })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="Biology">Biology</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Physics">Physics</option>
                    <option value="English">English</option>
                    <option value="Logical Reasoning">Logical Reasoning</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Correct Answer</label>
                  <select
                    value={editingQuestion.question.correctAnswer !== null ? String(editingQuestion.question.correctAnswer) : ''}
                    onChange={(e) => setEditingQuestion({
                      ...editingQuestion,
                      question: {
                        ...editingQuestion.question,
                        correctAnswer: e.target.value === '' ? null : Number(e.target.value),
                        hasOfficialAnswer: e.target.value !== ''
                      }
                    })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="">No Answer Key</option>
                    <option value="0">Option A</option>
                    <option value="1">Option B</option>
                    <option value="2">Option C</option>
                    <option value="3">Option D</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-400 block">Options A, B, C, D</label>
                {editingQuestion.question.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-slate-500">{String.fromCharCode(65 + oIdx)}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editingQuestion.question.options];
                        newOpts[oIdx] = e.target.value;
                        setEditingQuestion({
                          ...editingQuestion,
                          question: { ...editingQuestion.question, options: newOpts }
                        });
                      }}
                      className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionInProgressId === editingQuestion.question.id}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                {actionInProgressId === editingQuestion.question.id && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Save Question</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {editingMetadataPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <form onSubmit={handleUpdateMetadata} className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Edit Past Paper Metadata</h3>
              <button type="button" onClick={() => setEditingMetadataPaper(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-400 block mb-1">Paper Title</label>
                <input
                  type="text"
                  value={editingMetadataPaper.title}
                  onChange={(e) => setEditingMetadataPaper({ ...editingMetadataPaper, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Exam Year</label>
                  <input
                    type="text"
                    value={editingMetadataPaper.year}
                    onChange={(e) => setEditingMetadataPaper({ ...editingMetadataPaper, year: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Exam Name</label>
                  <input
                    type="text"
                    value={editingMetadataPaper.examName}
                    onChange={(e) => setEditingMetadataPaper({ ...editingMetadataPaper, examName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Conducting Authority</label>
                  <input
                    type="text"
                    value={editingMetadataPaper.conductingBody || ''}
                    onChange={(e) => setEditingMetadataPaper({ ...editingMetadataPaper, conductingBody: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Conducting University</label>
                  <input
                    type="text"
                    value={editingMetadataPaper.conductingUniversity || ''}
                    onChange={(e) => setEditingMetadataPaper({ ...editingMetadataPaper, conductingUniversity: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-400 block mb-1">Time Allowed (Minutes)</label>
                <input
                  type="number"
                  value={editingMetadataPaper.timeAllowedMinutes || 210}
                  onChange={(e) => setEditingMetadataPaper({ ...editingMetadataPaper, timeAllowedMinutes: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMetadataPaper(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionInProgressId === editingMetadataPaper.id}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                {actionInProgressId === editingMetadataPaper.id && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Update Metadata</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default AdminPastPaperManager;
