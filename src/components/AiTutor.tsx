import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  BrainCircuit, 
  Lightbulb, 
  Loader2, 
  Dna, 
  FlaskConical, 
  Zap, 
  Languages, 
  Brain,
  MessageSquare,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Image,
  FileQuestion,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { SubjectType, SavedMistake, SyllabusTopic, ExamAttempt } from '../types';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  modeUsed?: string;
}

interface AiTutorProps {
  savedMistakes?: SavedMistake[];
  topics?: SyllabusTopic[];
  examHistory?: ExamAttempt[];
}

export const AiTutor: React.FC<AiTutorProps> = ({
  savedMistakes = [],
  topics = [],
  examHistory = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'imageDoubt' | 'mnemonic'>('chat');
  const [subject, setSubject] = useState<SubjectType>('Biology');
  const [teachingMode, setTeachingMode] = useState<'standard' | 'socratic' | 'stepByStep' | 'analogy' | 'teachUntilUnderstand'>('standard');
  const [userInput, setUserInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatAction = useAiRequestAction();
  const imageAction = useAiRequestAction();
  const mnemonicAction = useAiRequestAction();

  // Messages State
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello future doctor! I am your AI NMDCAT Tutor powered by Gemini 3.6 Flash. Select a teaching mode (Socratic, Step-by-Step, Analogy, or Teach-Until-I-Understand) or ask any question!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Image / Handwritten Doubt State
  const [imageSample, setImageSample] = useState<string>('');
  const [imagePrompt, setImagePrompt] = useState<string>('Explain this reaction mechanism and identify any missing steps');

  // Mnemonic Generator state
  const [mnemonicTopic, setMnemonicTopic] = useState('');
  const [mnemonicResult, setMnemonicResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const quickPrompts = [
    { subject: 'Biology', label: 'Explain Krebs Cycle & ATP yield' },
    { subject: 'Chemistry', label: 'Lucas Test vs Tollen Test mechanism' },
    { subject: 'Physics', label: 'Shortcuts for Projectile Motion formulas' },
    { subject: 'English', label: 'Subject-Verb agreement rules with Neither/Nor' },
    { subject: 'Logical Reasoning', label: 'How to solve Syllogisms accurately' }
  ];

  const handleSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || userInput;
    if (!textToSend.trim() || chatAction.isLoading) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setUserInput('');

    const contextSummary = `Student Database Stats: ${topics.filter(t => t.status === 'revised').length}/${topics.length} topics completed; ${savedMistakes.filter(m => !m.isResolved).length} unresolved mistakes; ${examHistory.length} mock tests taken.`;

    try {
      const data = await chatAction.runRequest(
        async (signal) =>
          await aiFetch<{ text: string }>('/api/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: textToSend,
              subject,
              mode: teachingMode,
              context: contextSummary
            })
          }, { signal }),
        {
          pending: 'AI Tutor is analyzing your question...',
          success: 'AI Tutor response received.',
          cancelled: 'AI Tutor request cancelled.',
          failure: 'AI Tutor failed to answer. Please try again.'
        }
      );

      const aiMsg: Message = {
        sender: 'ai',
        text: data.text || 'I apologize, I could not process that query. Please try asking again!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modeUsed: teachingMode
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: chatAction.errorMessage || 'AI Tutor could not respond.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      if (import.meta.env.DEV) console.error('AI Tutor request failed:', error);
    }
  };

  const handleSolveImageDoubt = async () => {
    if (!imagePrompt.trim() || imageAction.isLoading) return;

    try {
      const data = await imageAction.runRequest(
        async (signal) =>
          await aiFetch<{ text?: string; analysis?: string }>('/api/image-doubt-solver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: imagePrompt,
              subject,
              imageData: imageSample || 'mock_handwritten_notes_data'
            })
          }, { signal }),
        {
          pending: 'Analyzing image and handwritten doubt...',
          success: 'Image doubt analysis complete.',
          cancelled: 'Image doubt analysis cancelled.',
          failure: 'Image doubt analysis failed. Please retry.'
        }
      );

      const aiMsg: Message = {
        sender: 'ai',
        text: `📷 **Image/Handwritten Doubt Solution:**\n\n${data.analysis || data.text || 'No analysis returned.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setActiveSubTab('chat');
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: imageAction.errorMessage || 'AI image doubt analysis failed.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      if (import.meta.env.DEV) console.error('Image doubt request failed:', error);
    }
  };

  const handleGenerateMnemonic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mnemonicTopic.trim() || mnemonicAction.isLoading) return;

    setMnemonicResult(null);

    try {
      const data = await mnemonicAction.runRequest(
        async (signal) =>
          await aiFetch<{ mnemonic: string }>('/api/generate-mnemonic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: mnemonicTopic,
              subject
            })
          }, { signal }),
        {
          pending: 'Generating mnemonic memory trick...',
          success: 'Mnemonic generated successfully.',
          cancelled: 'Mnemonic generation cancelled.',
          failure: 'Mnemonic generation failed. Please retry.'
        }
      );

      setMnemonicResult(data.mnemonic || 'Failed to generate mnemonic.');
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      setMnemonicResult(mnemonicAction.errorMessage || 'AI mnemonic generation failed.');
      if (import.meta.env.DEV) console.error('Mnemonic request failed:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden rounded-[28px] border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 shadow-[0_24px_80px_-32px_rgba(99,102,241,0.35)]">
        <div>
          <div className="mb-2 flex items-center gap-2 text-indigo-300 text-[11px] font-semibold uppercase tracking-[0.25em]">
            <Sparkles className="w-4 h-4" />
            <span>Server-Side Gemini 3.6 Flash Powered</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            AI Multi-Mode Tutor & Image Doubt Solver
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Socratic questioning, step-by-step problem solving, handwritten notes OCR, and spoken voice answers.
          </p>
        </div>

        {/* Sub-tab Toggle */}
        <div className="flex w-full sm:w-auto rounded-2xl border border-slate-700/70 bg-slate-900/80 p-1 shadow-inner">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'chat' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Tutor
          </button>
          <button
            onClick={() => setActiveSubTab('imageDoubt')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'imageDoubt' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Image & Notes Solver
          </button>
          <button
            onClick={() => setActiveSubTab('mnemonic')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'mnemonic' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mnemonics
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Interactive Chat */}
      {activeSubTab === 'chat' && (
        <div className="flex h-[620px] flex-col overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-900/80 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.95)]">
          {/* Controls Bar: Subject & Teaching Mode */}
          <div className="p-3 bg-slate-800/80 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Subject:</span>
              {(['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as SubjectType[]).map(sub => (
                <button
                  key={sub}
                  onClick={() => setSubject(sub)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                    subject === sub ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Teaching Mode Pills */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Mode:</span>
              {[
                { id: 'standard', label: 'Standard' },
                { id: 'socratic', label: 'Socratic' },
                { id: 'stepByStep', label: 'Step-by-Step' },
                { id: 'analogy', label: 'Analogy' },
                { id: 'teachUntilUnderstand', label: 'Teach Until Mastery' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setTeachingMode(m.id as any)}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors whitespace-nowrap ${
                    teachingMode === m.id
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Window */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  msg.sender === 'user' ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-600 text-white'
                }`}>
                  {msg.sender === 'user' ? 'You' : <Sparkles className="w-4 h-4" />}
                </div>

                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none space-y-2'
                }`}>
                  {msg.modeUsed && msg.sender === 'ai' && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase block w-fit mb-1">
                      Mode: {msg.modeUsed}
                    </span>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-800">
                    <span>{msg.time}</span>
                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => handleSpeech(msg.text)}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isSpeaking ? 'Stop Voice' : 'Read Out Loud'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <AiActionStatus
            statusMessage={chatAction.statusMessage}
            errorMessage={chatAction.errorMessage}
            isLoading={chatAction.isLoading}
          />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-slate-800/80 border-t border-slate-800 flex gap-2"
          >
            <label htmlFor="ai-tutor-query" className="sr-only">Ask AI Tutor</label>
          <input
              id="ai-tutor-query"
              type="text"
              aria-label="Ask AI Tutor"
              placeholder={`Ask AI Tutor in ${teachingMode} mode...`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={chatAction.isLoading || !userInput.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {chatAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">{chatAction.isLoading ? 'AI Tutor is answering...' : 'Ask'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Sub-tab 2: Image & Handwritten Notes Doubt Solver */}
      {activeSubTab === 'imageDoubt' && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-3xl mx-auto shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Image className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Image & Handwritten Notes Doubt Solver</h2>
              <p className="text-xs text-slate-400">Upload or select textbook diagrams, handwritten notes, or formula steps for AI vision analysis.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Select Sample Diagram / Handwritten Reaction:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setImageSample('handwritten_chem_rxn')}
                  className={`p-3 rounded-xl border cursor-pointer ${
                    imageSample === 'handwritten_chem_rxn' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <span className="font-bold text-white block">Handwritten Organic Chemistry Mechanism</span>
                  <span className="text-[10px] text-slate-400">Aldol condensation step derivation notes</span>
                </div>
                <div
                  onClick={() => setImageSample('textbook_bio_diagram')}
                  className={`p-3 rounded-xl border cursor-pointer ${
                    imageSample === 'textbook_bio_diagram' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <span className="font-bold text-white block">Textbook Nephron Physiology Diagram</span>
                  <span className="text-[10px] text-slate-400">Glomerular filtration & countercurrent multiplier</span>
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Your Question / Doubt regarding the image:</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleSolveImageDoubt}
              disabled={imageAction.isLoading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {imageAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{imageAction.isLoading ? 'Analyzing Image...' : 'Analyze Image & Solve Doubt'}</span>
            </button>

            <div className="mt-4">
              <AiActionStatus
                statusMessage={imageAction.statusMessage}
                errorMessage={imageAction.errorMessage}
                isLoading={imageAction.isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Mnemonic Generator */}
      {activeSubTab === 'mnemonic' && (
        <div className="bg-slate-900/90 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Lightbulb className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">AI Mnemonic & Memory Trick Generator</h2>
              <p className="text-xs text-slate-400">Generate catchy acronyms and shortcuts for tricky NMDCAT facts</p>
            </div>
          </div>

          <form onSubmit={handleGenerateMnemonic} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Target Subject:</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Biology">Biology (e.g. Essential Amino Acids, Cranial Nerves)</option>
                <option value="Chemistry">Chemistry (e.g. Reactivity Series, Electronegativity)</option>
                <option value="Physics">Physics (e.g. Electromagnetic Spectrum, Lens Rules)</option>
                <option value="English">English (e.g. Preposition rules, Adjective order)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Topic / Concept to Remember:</label>
              <input
                type="text"
                placeholder="e.g. 9 Essential Amino Acids or Electromagnetic Spectrum order..."
                value={mnemonicTopic}
                onChange={(e) => setMnemonicTopic(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={mnemonicAction.isLoading || !mnemonicTopic.trim()}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {mnemonicAction.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Memory Mnemonic...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Mnemonic Trick</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4">
            <AiActionStatus
              statusMessage={mnemonicAction.statusMessage}
              errorMessage={mnemonicAction.errorMessage}
              isLoading={mnemonicAction.isLoading}
            />
          </div>

          {/* Result Card */}
          {mnemonicResult && (
            <div className="bg-slate-800/80 p-5 rounded-2xl border border-indigo-500/30 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Generated Mnemonic Trick:</span>
                </span>
                <button
                  onClick={() => copyToClipboard(mnemonicResult)}
                  className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-700 text-xs flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {mnemonicResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

