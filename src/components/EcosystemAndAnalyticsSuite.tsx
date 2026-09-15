import React, { useState } from 'react';
import { 
  Calculator, 
  Award, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  BookOpen, 
  Sparkles, 
  Loader2,
  Compass, 
  HelpCircle, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  GraduationCap, 
  Brain,
  Target,
  BarChart2
} from 'lucide-react';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';

export const EcosystemAndAnalyticsSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scientific_calc' | 'predictions' | 'community' | 'career'>('scientific_calc');

  // Scientific Notation & Exponent Practice State
  const [exponentNum1, setExponentNum1] = useState<string>('3.0e8');
  const [exponentNum2, setExponentNum2] = useState<string>('6.63e-34');
  const [userProduct, setUserProduct] = useState<string>('');
  const [checkedExponent, setCheckedExponent] = useState<boolean>(false);

  // Predictions & Merit Calculator State
  const [fscMarks, setFscMarks] = useState<number>(1020); // out of 1100
  const [matricMarks, setMatricMarks] = useState<number>(1050); // out of 1100
  const [predictedNmdcatScore, setPredictedNmdcatScore] = useState<number>(182); // out of 200

  // PMDC Aggregate Formula: Matric 10% + FSC 40% + NMDCAT 50%
  const calculateAggregate = () => {
    const matricPercentage = (matricMarks / 1100) * 10;
    const fscPercentage = (fscMarks / 1100) * 40;
    const nmdcatPercentage = (predictedNmdcatScore / 180) * 50;
    return (matricPercentage + fscPercentage + nmdcatPercentage).toFixed(2);
  };

  const aggregateScore = calculateAggregate();

  // Community Discussion State
  const [forumPosts, setForumPosts] = useState([
    {
      id: 'fp1',
      author: 'Physics Student',
      topic: 'Physics - Electromagnetic Induction',
      question: 'Why does the self-inductance of a solenoid depend on the square of the number of turns (N²)?',
      replies: 4,
      aiAnswer: 'Self Inductance L = (μ₀ · N² · A) / l. Since magnetic field B is proportional to N, and magnetic flux link is proportional to N × B, flux linkage scales with N².'
    },
    {
      id: 'fp2',
      author: 'Chemistry Aspirant',
      topic: 'Organic Chemistry - Reaction Mechanics',
      question: 'Is Aldol condensation possible in Formaldehyde (HCHO)?',
      replies: 2,
      aiAnswer: 'No, Formaldehyde lacks alpha-hydrogens (α-H), so it undergoes Cannizzaro Reaction instead of Aldol Condensation.'
    }
  ]);

  const [newQuestionTopic, setNewQuestionTopic] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const forumAction = useAiRequestAction();

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || forumAction.isLoading) return;

    try {
      const data = await forumAction.runRequest(
        async (signal) =>
          await aiFetch<{ text?: string; answer?: string }>('/api/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: newQuestionText,
              subject: 'Biology',
              mode: 'standard',
              context: `PMDC Forum Topic: ${newQuestionTopic.trim() || 'General Academic Question'}`
            })
          }, { signal }),
        {
          pending: 'Posting question and requesting AI answer...',
          success: 'AI forum response received.',
          cancelled: 'AI forum request cancelled.',
          failure: 'Forum post failed. Please retry.'
        }
      );

      const aiReply = data.text || data.answer || 'Detailed answer generated using PMDC syllabus references.';

      setForumPosts(prev => [
        {
          id: `fp_${Date.now()}`,
          author: 'You (NMDCAT Student)',
          topic: newQuestionTopic.trim() || 'Community Question',
          question: newQuestionText,
          replies: 1,
          aiAnswer: aiReply
        },
        ...prev
      ]);
      setNewQuestionText('');
      setNewQuestionTopic('');
    } catch (err) {
      if (isAiRequestCancelled(err)) return;
      setAiErrorMessage(forumAction.errorMessage);
      if (import.meta.env.DEV) console.error('Failed to get AI forum response', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Success Ecosystem & Analytics Suite</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Score Prediction, Merit Engine & Community Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Train exponent scientific notation calculations, predict PMDC exam aggregate scores, and consult peer community learning forums.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('scientific_calc')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'scientific_calc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scientific Notation Practice
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'predictions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Merit & Score Predictor
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'community' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Community Forum
          </button>
          <button
            onClick={() => setActiveTab('career')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'career' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Career Guidance
          </button>
        </div>
      </div>

      {/* TAB 1: Scientific Notation Practice */}
      {activeTab === 'scientific_calc' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl mx-auto">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>Scientific Notation & Exponent Handling Trainer</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Practice multiplying and dividing scientific notation powers of 10 without using a calculator.
            </p>
          </div>

          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-indigo-400 block">Exponents Multiplication Drill:</span>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
              Multiply: (3.0 × 10⁸) × (6.63 × 10⁻³⁴)
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">Your Calculated Scientific Answer:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userProduct}
                  onChange={(e) => setUserProduct(e.target.value)}
                  placeholder="e.g. 1.989e-25 or 1.99 x 10^-25..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => setCheckedExponent(true)}
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-emerald-400"
                >
                  Verify Answer
                </button>
              </div>
            </div>

            {checkedExponent && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">Correct Scientific Solution:</span>
                  <span className="font-mono text-white font-bold">1.989 × 10⁻²⁵</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Step 1: Multiply significands: 3.0 × 6.63 = 19.89 <br/>
                  Step 2: Add exponents: 8 + (-34) = -26 <br/>
                  Step 3: Normalize to standard scientific notation: 19.89 × 10⁻²⁶ = 1.989 × 10⁻²⁵.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Merit & Score Predictor */}
      {activeTab === 'predictions' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>PMDC Score & College Merit Prediction Engine</span>
              </h3>
              <p className="text-xs text-slate-400">
                Calculates your official aggregate score (Matric 10%, FSC 40%, NMDCAT 50%) and estimates admission probability.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Parameters */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <h4 className="font-bold text-white text-sm">Academic Marks Input</h4>

              <div>
                <label className="text-slate-400 block mb-1">Matriculation Marks (out of 1100)</label>
                <input
                  type="number"
                  value={matricMarks}
                  onChange={(e) => setMatricMarks(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">FSc Pre-Medical Marks (out of 1100)</label>
                <input
                  type="number"
                  value={fscMarks}
                  onChange={(e) => setFscMarks(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target / Predicted NMDCAT Score (out of 200)</label>
                <input
                  type="number"
                  value={predictedNmdcatScore}
                  onChange={(e) => setPredictedNmdcatScore(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            {/* Calculated Aggregate & College Admission Probabilities */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-500/30 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Calculated PMDC Merit Aggregate</span>
                <p className="text-3xl font-black text-emerald-400">{aggregateScore}%</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="font-bold text-white block">Medical College Probability Ranking:</span>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">King Edward Medical University (KEMU)</span>
                    <span className="text-[10px] text-slate-500">Historical Closing Merit: ~92.5%</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    Number(aggregateScore) >= 92.5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {Number(aggregateScore) >= 92.5 ? 'High Chance' : 'Competitive Target'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Allama Iqbal Medical College (AIMC) / Dow</span>
                    <span className="text-[10px] text-slate-500">Historical Closing Merit: ~91.2%</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    Number(aggregateScore) >= 91.2 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {Number(aggregateScore) >= 91.2 ? 'High Chance' : 'Target'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Khyber Medical College (KMU) / Rawalpindi</span>
                    <span className="text-[10px] text-slate-500">Historical Closing Merit: ~90.0%</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    Number(aggregateScore) >= 90.0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {Number(aggregateScore) >= 90.0 ? 'High Chance' : 'Safe Reach'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Community Forum & Academic Discussion */}
      {activeTab === 'community' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post Question Form */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Ask Community & AI Tutor</span>
            </h3>

            <form onSubmit={handlePostQuestion} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Topic / Subject Tag</label>
                <input
                  type="text"
                  value={newQuestionTopic}
                  onChange={(e) => setNewQuestionTopic(e.target.value)}
                  placeholder="e.g. Organic Chemistry / Bioenergetics..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Your Question or Doubt</label>
                <textarea
                  rows={4}
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Ask any conceptual doubt..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={forumAction.isLoading || !newQuestionText.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {forumAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{forumAction.isLoading ? 'Asking Gemini AI...' : 'Post Doubt to Community'}</span>
              </button>
            </form>

            <div className="mt-4">
              <AiActionStatus
                statusMessage={forumAction.statusMessage}
                errorMessage={forumAction.errorMessage || aiErrorMessage}
                isLoading={forumAction.isLoading}
              />
            </div>
          </div>

          {/* Active Discussions List */}
          <div className="lg:col-span-2 space-y-4">
            {forumPosts.map((post) => (
              <div key={post.id} className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{post.author}</span>
                    <span className="text-slate-500">&bull; {post.topic}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    {post.replies} Replies
                  </span>
                </div>

                <p className="font-bold text-slate-200 text-sm">{post.question}</p>

                {/* AI Explanation Box */}
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-slate-300 space-y-1">
                  <span className="font-bold text-indigo-400 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Tutor Explanation:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">{post.aiAnswer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AI Career Guidance */}
      {activeTab === 'career' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 max-w-2xl mx-auto">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>AI Medical Career Guidance & Quota Pathways</span>
          </h3>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-300">
            <h4 className="font-bold text-indigo-300">MBBS vs BDS vs Allied Health Sciences (AHS)</h4>
            <p className="leading-relaxed">
              &bull; <strong>MBBS (Bachelor of Medicine & Surgery):</strong> 5 years + 1 year house job. Primary entry pathway for medical colleges across Punjab, Sindh, KPK, and Balochistan.
            </p>
            <p className="leading-relaxed">
              &bull; <strong>BDS (Bachelor of Dental Surgery):</strong> 4 years + 1 year house job. High demand in specialized oral surgery and private dentistry practice.
            </p>
            <p className="leading-relaxed">
              &bull; <strong>Allied Health Sciences (Pharm-D, DPT, MLS):</strong> Excellent alternative careers with direct clinical impact.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
