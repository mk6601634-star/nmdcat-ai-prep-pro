import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  Clock, 
  Database, 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  ShieldCheck, 
  GitBranch, 
  Layers, 
  FileCheck, 
  Sparkles, 
  Download, 
  Search, 
  UserCheck, 
  HardDrive,
  Eye,
  AlertCircle
} from 'lucide-react';

export const ContentPipelineAndOfflineHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'offline' | 'arch_sync'>('pipeline');

  // Content Pipeline State
  const [pdfCategory, setPdfCategory] = useState<string>('Textbook');
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);

  // Verification Workflow Queue State
  const [verificationQueue, setVerificationQueue] = useState([
    {
      id: 'vq1',
      title: 'Extract: Bioenergetics Light Reaction MCQ Batch',
      source: 'Punjab Textbook Biology Ch 11 (Page 214)',
      version: 'v2.1',
      status: 'Pending Verification',
      extractedFacts: ['Photophosphorylation takes place in Thylakoid Membrane', 'PS II absorbs 680 nm wavelength']
    },
    {
      id: 'vq2',
      title: 'Extract: Organic Chemistry Nomenclature Rules',
      source: 'KPK Chemistry Vol 2 (Page 89)',
      version: 'v1.0',
      status: 'Verified',
      extractedFacts: ['IUPAC priority rule: Carboxylic Acid > Aldehyde > Ketone > Alcohol']
    }
  ]);

  // Offline Mode State
  const [isOfflineModeEnabled, setIsOfflineModeEnabled] = useState<boolean>(true);
  const [downloadProgress, setDownloadProgress] = useState<number>(100);
  const [isDownloadingPackage, setIsDownloadingPackage] = useState<boolean>(false);

  // Cloud Sync State
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSimulatePdfUpload = () => {
    setIsProcessingPdf(true);
    setTimeout(() => {
      setIsProcessingPdf(false);
      setPdfUploaded(true);
    }, 1200);
  };

  const handleDownloadFinalWeekPackage = () => {
    setIsDownloadingPackage(true);
    setDownloadProgress(0);
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloadingPackage(false);
          alert('Offline Final Week Revision Package (1,200 High-Yield MCQs + Formula Sheets) downloaded locally!');
          return 100;
        }
        return prev + 25;
      });
    }, 300);
  };

  const handleManualCloudSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncedTime(new Date().toLocaleTimeString());
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold mb-1">
            <GitBranch className="w-4 h-4" />
            <span>Content Pipeline & Offline Storage Infrastructure</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Educational Pipeline & Offline Final Week Ecosystem
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Import PDFs, process OCR diagrams, execute human expert verification workflows, and access full offline question banks without internet.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'pipeline' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PDF Import Pipeline
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'offline' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Offline Final Week Mode
          </button>
          <button
            onClick={() => setActiveTab('arch_sync')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'arch_sync' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cloud Sync & Security
          </button>
        </div>
      </div>

      {/* TAB 1: PDF Import Wizard & Human Verification Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PDF Upload & Extraction Wizard */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-teal-400" />
                <span>PDF Import Wizard & OCR Processing</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically classify uploaded textbooks, scanned notes, or past papers with concept extraction.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Document Classification Category</label>
                <select
                  value={pdfCategory}
                  onChange={(e) => setPdfCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Textbook">Textbook Chapter Scan</option>
                  <option value="Past Paper">PMDC Past Paper Document</option>
                  <option value="Handwritten Notes">Handwritten Class Notes</option>
                  <option value="Formula Sheet">Physics / Chemistry Formula Sheet</option>
                </select>
              </div>

              <div
                onClick={handleSimulatePdfUpload}
                className="p-8 border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-2xl text-center cursor-pointer transition-all bg-slate-950/60"
              >
                <FileText className="w-8 h-8 text-teal-400 mx-auto mb-2 animate-bounce" />
                <span className="text-xs font-bold text-slate-200 block">Click to upload document PDF or scanned book page</span>
                <span className="text-[10px] text-slate-500">Auto-detects chapters, tables, formulas, and diagrams</span>
              </div>

              {isProcessingPdf && (
                <div className="text-center py-2 text-xs text-teal-400 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Content Pipeline extracting definitions, formulas, and generating structured concept maps...</span>
                </div>
              )}

              {pdfUploaded && !isProcessingPdf && (
                <div className="p-4 bg-slate-950 rounded-xl border border-teal-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>Extraction Complete!</span>
                    </span>
                    <span className="text-[10px] bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded font-mono">
                      Source Tracked
                    </span>
                  </div>
                  <p className="text-slate-200">
                    Extracted 18 High-Yield Definitions, 6 Physics Formulas, and 12 MCQs from {pdfCategory} PDF.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Human Verification & Source Tracking Workflow */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Human Verification & Version Control Queue</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Expert reviewer approval workflow ensuring 100% scientific accuracy before publishing.
              </p>
            </div>

            <div className="space-y-3">
              {verificationQueue.map((item) => (
                <div key={item.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Source: {item.source}</span>
                    <span>&bull;</span>
                    <span>Version: {item.version}</span>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg text-slate-300 text-[11px] space-y-1">
                    <span className="font-semibold text-slate-400 block">Extracted Knowledge Tokens:</span>
                    {item.extractedFacts.map((fact, idx) => (
                      <p key={idx}>&bull; {fact}</p>
                    ))}
                  </div>

                  {item.status === 'Pending Verification' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setVerificationQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'Verified' } : q));
                        }}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px]"
                      >
                        Approve & Publish to Master Bank
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Offline Final Week Mode */}
      {activeTab === 'offline' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-emerald-400" />
                <span>Offline Final Week Revision Package</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download the complete local database package for internet-free revision in exam centers or during travel.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Local Cache Active:</span>
              <button
                onClick={() => setIsOfflineModeEnabled(!isOfflineModeEnabled)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  isOfflineModeEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isOfflineModeEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 text-[10px] block">Offline MCQs</span>
                <span className="text-lg font-bold text-white">2,500 Questions</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 text-[10px] block">Offline Notes</span>
                <span className="text-lg font-bold text-white">48 Chapters</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-slate-400 text-[10px] block">Formula Sheets</span>
                <span className="text-lg font-bold text-white">100% Offline</span>
              </div>
            </div>

            <button
              onClick={handleDownloadFinalWeekPackage}
              disabled={isDownloadingPackage}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingPackage ? `Downloading Package (${downloadProgress}%)...` : 'Download Offline Emergency Package'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Cloud Sync & System Architecture */}
      {activeTab === 'arch_sync' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400" />
                <span>Cloud Synchronization & Multi-Device State</span>
              </h3>
              <p className="text-xs text-slate-400">
                Seamless real-time synchronization between Web, Mobile, and Tablet devices with automatic backup.
              </p>
            </div>

            <button
              onClick={handleManualCloudSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Cloud...' : 'Sync Cloud Data Now'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">Cloud Backup Status</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>Backed Up</span>
              </span>
              <span className="text-[10px] text-slate-500 block">Last Synced: {lastSyncedTime}</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">Active Device Session</span>
              <span className="text-sm font-bold text-white">AI Studio Container Session</span>
              <span className="text-[10px] text-teal-400 font-semibold block">Cross-Device Continuity On</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 block">Security & Role Auth</span>
              <span className="text-sm font-bold text-indigo-300">Student Account (Full Access)</span>
              <span className="text-[10px] text-slate-500 block">Role-based Access Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
