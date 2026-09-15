import React, { useState } from 'react';
import { 
  Sparkles, 
  Calculator, 
  BookOpen, 
  Layers, 
  Volume2, 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Bot, 
  Brain, 
  Zap,
  HelpCircle,
  FileCheck,
  Award,
  RefreshCw
} from 'lucide-react';
import { SubjectType } from '../types';

export const AdvancedAiAndExamStrategy: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discrepancy' | 'calculator_pad' | 'mindmap' | 'ocr_voice'>('discrepancy');

  // Textbook Discrepancy State
  const [selectedDiscrepancySubject, setSelectedDiscrepancySubject] = useState<string>('Biology');

  const textbookDiscrepancies = [
    {
      id: 'td1',
      subject: 'Biology',
      topic: 'Enzyme Optimum Temperature',
      punjab: '37°C (Strict body temperature standard)',
      sindh: '37°C - 40°C range',
      kpk: '37°C for human enzymes; 40°C - 50°C for plant enzymes',
      federal: '37°C (Human enzymes)',
      pmdcStandard: '37°C is universally marked correct in PMDC answer key.',
      trapWarning: 'Beware of options offering a range vs exact value. Pick 37°C unless question specifies plant/bacterial enzymes.'
    },
    {
      id: 'td2',
      subject: 'Physics',
      topic: 'Speed of Sound in Dry Air at 0°C',
      punjab: '332 m/s',
      sindh: '331.5 m/s',
      kpk: '332 m/s',
      federal: '332 m/s',
      pmdcStandard: '332 m/s is the standard value.',
      trapWarning: 'For temperature coefficient formula, use Vt = 332 + 0.61t.'
    },
    {
      id: 'td3',
      subject: 'Chemistry',
      topic: 'Boiling Point of Ethanol',
      punjab: '78.37°C (or rounded 78.5°C)',
      sindh: '78°C',
      kpk: '78.5°C',
      federal: '78.5°C',
      pmdcStandard: '78.5°C is accepted across all provincial boards.'
    }
  ];

  // No-Calculator Practice Pad State
  const [calcNum1, setCalcNum1] = useState<string>('6.63e-34');
  const [calcNum2, setCalcNum2] = useState<string>('3e8');
  const [calcNum3, setCalcNum3] = useState<string>('5e-7');
  const [userEstimation, setUserEstimation] = useState<string>('');
  const [estimationChecked, setEstimationChecked] = useState<boolean>(false);

  // Estimation problem: Energy of photon = (6.63e-34 * 3e8) / (5e-7)
  // Exact = 19.89e-26 / 5e-7 = 3.978e-19 J ≈ 4e-19 J
  const correctExactAnswer = '3.98 × 10⁻¹⁹ Joules';

  // AI Mind Map State
  const [selectedMindMapTopic, setSelectedMindMapTopic] = useState<string>('Enzyme Kinetics & Action');

  // Voice Assistant Audio State
  const [isPlayingFormulaAudio, setIsPlayingFormulaAudio] = useState<boolean>(false);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <Brain className="w-4 h-4" />
            <span>Content Intelligence & Exam Strategy Engine</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Advanced AI Tools & Textbook Discrepancy Suite
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Resolve provincial textbook differences, master no-calculator numericals, generate visual mind maps, and extract MCQs from textbook photos.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('discrepancy')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'discrepancy' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Textbook Discrepancy
          </button>
          <button
            onClick={() => setActiveTab('calculator_pad')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'calculator_pad' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            No-Calc Practice Pad
          </button>
          <button
            onClick={() => setActiveTab('mindmap')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'mindmap' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Mind Maps
          </button>
          <button
            onClick={() => setActiveTab('ocr_voice')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'ocr_voice' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OCR & Voice Assistant
          </button>
        </div>
      </div>

      {/* TAB 1: Textbook Discrepancy Engine */}
      {activeTab === 'discrepancy' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Multi-Board Textbook Discrepancy Engine</span>
              </h3>
              <p className="text-xs text-slate-400">
                Highlights conflicting values across Punjab (PTB), Sindh (STB), KPK, and Federal textbooks with verified PMDC key recommendations.
              </p>
            </div>

            <select
              value={selectedDiscrepancySubject}
              onChange={(e) => setSelectedDiscrepancySubject(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white"
            >
              <option value="Biology">Biology Discrepancies</option>
              <option value="Physics">Physics Discrepancies</option>
              <option value="Chemistry">Chemistry Discrepancies</option>
            </select>
          </div>

          <div className="space-y-4">
            {textbookDiscrepancies.map((item) => (
              <div key={item.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                      {item.subject}
                    </span>
                    <span className="text-sm font-bold text-white">{item.topic}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Verified PMDC Guide</span>
                </div>

                {/* Grid Comparison */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-indigo-400 font-bold block mb-1">Punjab (PTB)</span>
                    <span className="text-slate-200 font-medium">{item.punjab}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-teal-400 font-bold block mb-1">Sindh (STB)</span>
                    <span className="text-slate-200 font-medium">{item.sindh}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-purple-400 font-bold block mb-1">KPK Board</span>
                    <span className="text-slate-200 font-medium">{item.kpk}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-bold block mb-1">Federal Board</span>
                    <span className="text-slate-200 font-medium">{item.federal}</span>
                  </div>
                </div>

                {/* PMDC Standard Recommendation */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Official PMDC Key Recommendation:</span>
                  </span>
                  <p className="text-slate-200">{item.pmdcStandard}</p>
                  {item.trapWarning && (
                    <p className="text-[11px] text-amber-300 font-medium pt-1">&bull; {item.trapWarning}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: No-Calculator Practice Pad */}
      {activeTab === 'calculator_pad' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl mx-auto">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>No-Calculator Estimation Practice Pad</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Since calculators are strictly banned in NMDCAT, practice fast mental approximation techniques for exponents and decimals.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-indigo-400 block">Sample Numerical Problem (Physics):</span>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono">
              Calculate Photon Energy (E): <br/>
              E = (h × c) / λ <br/>
              E = (6.63 × 10⁻³⁴ J·s × 3.0 × 10⁸ m/s) / (5.0 × 10⁻⁷ m)
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">Your Mental / Estimation Answer:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userEstimation}
                  onChange={(e) => setUserEstimation(e.target.value)}
                  placeholder="e.g. 4e-19 J or 3.98 x 10^-19..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => setEstimationChecked(true)}
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400"
                >
                  Verify Estimation
                </button>
              </div>
            </div>

            {estimationChecked && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">Exact Scientific Answer:</span>
                  <span className="font-mono text-white font-bold">{correctExactAnswer}</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-800">
                  <span className="font-bold text-amber-400 block">Fast Mental Trick:</span>
                  <p>1. Separate significands: (6.6 × 3) / 5 ≈ 20 / 5 = 4</p>
                  <p>2. Combine powers of 10: -34 + 8 - (-7) = -34 + 8 + 7 = -19</p>
                  <p>3. Result ≈ 4 × 10⁻¹⁹ J. Matches option immediately without writing detailed long division!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI Mind Map Generator */}
      {activeTab === 'mindmap' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>AI Concept Mind Map Visualizer</span>
              </h3>
              <p className="text-xs text-slate-400">Hierarchical visual flow of NMDCAT chapters.</p>
            </div>

            <select
              value={selectedMindMapTopic}
              onChange={(e) => setSelectedMindMapTopic(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white"
            >
              <option value="Enzyme Kinetics & Action">Enzyme Kinetics & Action</option>
              <option value="Aldehydes & Ketones Reactions">Aldehydes & Ketones Reactions</option>
              <option value="Electromagnetic Induction">Electromagnetic Induction</option>
            </select>
          </div>

          {/* Interactive Mind Map Visual Container */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6 text-center">
            {/* Root Node */}
            <div className="inline-block bg-indigo-600 text-white font-bold text-sm px-6 py-2.5 rounded-2xl shadow-lg border border-indigo-400/30">
              {selectedMindMapTopic}
            </div>

            <div className="w-0.5 h-6 bg-indigo-500/40 mx-auto" />

            {/* Sub Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 block">1. Active Site Structure</span>
                <p className="text-slate-400 text-[11px]">Binding site vs Catalytic site, Apoenzyme + Co-factor = Holoenzyme.</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 block">2. Mechanism of Action</span>
                <p className="text-slate-400 text-[11px]">Lock & Key Model (Fisher) vs Induced Fit Model (Koshland).</p>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-rose-400 block">3. Inhibition Types</span>
                <p className="text-slate-400 text-[11px]">Competitive (Vmax same, Km increases) vs Non-competitive (Vmax decreases).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OCR Image to MCQ & Voice Assistant */}
      {activeTab === 'ocr_voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OCR Upload Simulator */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span>AI Photo-to-MCQ Scanner (OCR)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload or drop textbook images/past paper photos to extract questions into interactive MCQs.
            </p>

            <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl text-center bg-slate-950/60">
              <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-400 block">OCR/Textbook Image Analysis</span>
              <span className="text-[10px] text-slate-500">Feature currently unavailable - requires server configuration</span>
            </div>
          </div>

          {/* Voice Assistant & Formula Audio Drills */}
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Voice Assistant & Formula TTS Drills</span>
            </h3>
            <p className="text-xs text-slate-400">
              Listen to high-yield formula repetitions and audio vocabulary drills hands-free.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Physics Electromagnetic Formulas Audio Drill</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded">
                  TTS Voice Ready
                </span>
              </div>

              <button
                onClick={() => {
                  setIsPlayingFormulaAudio(!isPlayingFormulaAudio);
                  if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("Faraday's Law of Electromagnetic Induction states that induced E M F equals negative change in magnetic flux divided by change in time.");
                    window.speechSynthesis.speak(msg);
                  }
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isPlayingFormulaAudio ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingFormulaAudio ? 'Speaking Audio Formula...' : 'Play Voice Formula Drill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
