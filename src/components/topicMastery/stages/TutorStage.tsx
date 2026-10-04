import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  Copy, 
  Volume2, 
  VolumeX, 
  Lightbulb, 
  HelpCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Layers, 
  ArrowRight,
  Zap,
  MessageSquare
} from 'lucide-react';
import { AiChatMessage, AiTeachingMode } from '../../../types';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch, getAiFriendlyMessage } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface TutorStageProps {
  context: TopicMasteryContext;
  messages: AiChatMessage[];
  onUpdateMessages: (messages: AiChatMessage[]) => void;
  onAskTutor?: (query: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
  initialPrompt?: string;
}

const QUICK_PROMPTS = [
  { label: 'Explain simply', text: 'Explain this topic in simple, intuitive terms for an NMDCAT student.' },
  { label: 'Give an analogy', text: 'Give me a memorable everyday analogy to understand this concept deeply.' },
  { label: 'Common PMDC Traps', text: 'What are the top 3 high-yield exam traps or tricky questions PMDC asks on this topic?' },
  { label: 'Ask me a question', text: 'Ask me a challenging conceptual NMDCAT-style MCQ on this topic to test my understanding.' },
  { label: 'Key Formulas & Units', text: 'List all important formulas, units, and mathematical relationships for this topic.' },
  { label: 'Compare concepts', text: 'What are the key differences between this concept and related topics students often confuse?' },
  { label: 'Teach from start', text: 'Please teach this entire topic step-by-step from the very beginning.' }
];

export const TutorStage: React.FC<TutorStageProps> = ({
  context,
  messages,
  onUpdateMessages,
  isCompleted,
  onToggleComplete,
  onNavigateStage,
  externalPrompt,
  onClearExternalPrompt,
  initialPrompt
}) => {
  const [teachingMode, setTeachingMode] = useState<AiTeachingMode>('standard');
  const [inputQuery, setInputQuery] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatAction = useAiRequestAction();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialGeneratedRef = useRef(false);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatAction.isLoading]);

  // Speech Synthesis
  const handleSpeech = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const cleanText = text.replace(/\$+/g, '').replace(/[#*`_]/g, '').replace(/<[^>]*>/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [isSpeaking]);

  // Copy message
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Send query function
  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || chatAction.isLoading) return;

    const userMsg: AiChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    const updated = [...messages, userMsg];
    onUpdateMessages(updated);
    if (!queryText) setInputQuery('');

    const contextHeader = `TOPIC MASTERY LESSON: ${context.subjectName.toUpperCase()} > ${context.chapterName} > ${context.topicName}. Session: ${context.sessionId}.`;

    try {
      const data = await chatAction.runRequest(
        async (signal) =>
          await aiFetch<{ text: string; reply?: string; answer?: string }>('/api/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: textToSend,
              subject: context.subjectName,
              mode: teachingMode,
              context: contextHeader,
              messages: updated.map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text,
                sender: m.sender,
                text: m.text
              }))
            })
          }, { signal }),
        {
          pending: 'Tutor is preparing your explanation...',
          success: 'Tutor responded.',
          cancelled: 'Tutor request cancelled.',
          failure: 'Failed to get tutor response.'
        }
      );

      const replyText = (data as any)?.text || (data as any)?.reply || (data as any)?.answer || 'I could not generate an answer. Please try asking again.';

      const aiMsg: AiChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        modeUsed: teachingMode
      };

      onUpdateMessages([...updated, aiMsg]);
    } catch (err) {
      console.warn('[TutorStage error]:', err);
    }
  };

  // Initial introductory lesson if conversation is empty
  useEffect(() => {
    if (messages.length === 0 && !initialGeneratedRef.current) {
      initialGeneratedRef.current = true;
      const initialPrompt = `Hello! Please provide a comprehensive, high-yield introductory overview of "${context.topicName}" (${context.subjectName} - ${context.chapterName}) for my NMDCAT preparation. Focus on core concepts, key mechanisms, and what PMDC examiners expect.`;
      handleSend(initialPrompt);
    }
  }, [context.topicName]);

  // Handle external or initial prompts sent from other stages (e.g. "Ask Tutor about this formula")
  useEffect(() => {
    const prompt = initialPrompt || externalPrompt;
    if (prompt && prompt.trim()) {
      handleSend(prompt.trim());
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [initialPrompt, externalPrompt]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 border border-indigo-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Interactive AI Topic Tutor</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Unlimited Q&A
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Topic: <strong className="text-indigo-300">{context.topicName}</strong> ({context.subjectName})
            </p>
          </div>
        </div>

        {/* Teaching Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Mode:</span>
          {(['standard', 'socratic', 'stepByStep', 'analogy', 'teachUntilUnderstand'] as AiTeachingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTeachingMode(mode)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                teachingMode === mode
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              {mode === 'stepByStep' ? 'Step-by-Step' : mode === 'teachUntilUnderstand' ? 'Mastery' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification Status */}
      <AiActionStatus status={chatAction.status} message={chatAction.message} onCancel={chatAction.cancel} />

      {/* Chat Messages Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 max-h-[550px] overflow-y-auto shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
              msg.sender === 'user' ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-600 text-white'
            }`}>
              {msg.sender === 'user' ? 'You' : <Sparkles className="w-4 h-4" />}
            </div>

            <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
              msg.sender === 'user'
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
                : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-tl-none space-y-2'
            }`}>
              {msg.modeUsed && msg.sender === 'ai' && (
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                    {msg.modeUsed} Mode
                  </span>
                </div>
              )}

              <FormattedMathContent content={msg.text} />

              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-700/40">
                <span>{msg.time}</span>
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopy(msg.text)}
                      className="hover:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={() => handleSpeech(msg.text)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      {isSpeaking ? 'Stop' : 'Speak'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Suggested Follow-Up Prompts for this topic:
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.text)}
              disabled={chatAction.isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs text-slate-300 hover:text-white font-medium transition-all shadow-sm disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Ask Tutor anything about ${context.topicName}...`}
          disabled={chatAction.isLoading}
          className="flex-1 px-4 py-3 bg-slate-900/90 border border-slate-700/90 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || chatAction.isLoading}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask Tutor</span>
        </button>
      </div>

      {/* Stage Completion Footer & Next Stage Action */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={onToggleComplete}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isCompleted ? 'Tutor Stage Completed ✓' : 'Mark Tutor Stage as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('mindmap')}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Mind Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
