import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  GraduationCap,
  Plus,
  Trash2,
  ChevronDown,
  ArrowDown,
  RotateCcw,
  BookOpen,
  Target,
  Layers,
  History,
  AlertCircle
} from 'lucide-react';
import { SubjectType, SavedMistake, SyllabusTopic, ExamAttempt, AiTeachingMode, AiChatMessage, AiConversation, AiMasteryState } from '../types';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { AiActionStatus } from './AiActionStatus';
import { FormattedMathContent } from './FormattedMathContent';
import { 
  saveAiConversation, 
  subscribeToAiConversations, 
  deleteAiConversation 
} from '../lib/firestoreService';
import { auth } from '../lib/firebase';

interface AiTutorProps {
  savedMistakes?: SavedMistake[];
  topics?: SyllabusTopic[];
  examHistory?: ExamAttempt[];
}

const DEFAULT_GREETING = "Hello future doctor! I am your AI NMDCAT Medical Tutor. Ask any question in Biology, Chemistry, Physics, English, or Logical Reasoning. Select your preferred teaching mode (Standard, Socratic, Step-by-Step, Analogy, or Teach Until Mastery) to guide our lesson.";

interface ChatMessageItemProps {
  msg: AiChatMessage;
  onCopy: (text: string) => void;
  onSpeech: (text: string) => void;
  isSpeaking: boolean;
}

const ChatMessageItem = React.memo<ChatMessageItemProps>(({ msg, onCopy, onSpeech, isSpeaking }) => {
  const isUser = msg.sender === 'user';
  return (
    <div className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
        isUser ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-600 text-white'
      }`}>
        {isUser ? 'You' : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg ${
        isUser
          ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none'
          : 'bg-slate-800/95 text-slate-200 border border-slate-700/80 rounded-tl-none space-y-2'
      }`}>
        {/* Mode Badge for AI message */}
        {msg.modeUsed && !isUser && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
              Mode: {msg.modeUsed}
            </span>
          </div>
        )}

        {/* Content with KaTeX Mathematical & Chemical rendering */}
        <FormattedMathContent content={msg.text} />

        {/* Message Footer: Timestamp & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-700/40">
          <span className="shrink-0">{msg.time}</span>
          {!isUser && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onCopy(msg.text)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy response"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => onSpeech(msg.text)}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span>{isSpeaking ? 'Stop' : 'Speak'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const AiTutor: React.FC<AiTutorProps> = ({
  savedMistakes = [],
  topics = [],
  examHistory = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'imageDoubt' | 'mnemonic'>('chat');
  const [subject, setSubject] = useState<SubjectType>('Biology');
  const [teachingMode, setTeachingMode] = useState<AiTeachingMode>('standard');
  const [userInput, setUserInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  
  // Conversations State
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    return `conv_${Date.now()}`;
  });

  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: `msg_init_${Date.now()}`,
      sender: 'ai',
      text: DEFAULT_GREETING,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    }
  ]);

  const [masteryState, setMasteryState] = useState<AiMasteryState>({
    currentStage: 1,
    totalStages: 5,
    masteredConcepts: [],
    weakConcepts: []
  });

  // Scroll State
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Actions
  const chatAction = useAiRequestAction();
  const imageAction = useAiRequestAction();
  const mnemonicAction = useAiRequestAction();

  // Image Doubt State
  const [imageSample, setImageSample] = useState<string>('');
  const [imagePrompt, setImagePrompt] = useState<string>('Explain this reaction mechanism and identify any missing steps');

  // Mnemonic Generator state
  const [mnemonicTopic, setMnemonicTopic] = useState('');
  const [mnemonicResult, setMnemonicResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Current User ID
  const currentUserId = auth.currentUser?.uid || 'anonymous_user';

  // 1. Subscribe to Saved Conversations in Firestore & LocalStorage
  useEffect(() => {
    // Load cached conversations from localStorage first
    try {
      const cached = localStorage.getItem(`nmdcat_conversations_${currentUserId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
        }
      }
    } catch {}

    // Live subscription to Firestore
    if (auth.currentUser?.uid) {
      const unsubscribe = subscribeToAiConversations(auth.currentUser.uid, (items) => {
        if (items && items.length > 0) {
          setConversations(items);
          try {
            localStorage.setItem(`nmdcat_conversations_${auth.currentUser?.uid}`, JSON.stringify(items));
          } catch {}
        }
      });
      return () => unsubscribe();
    }
  }, [currentUserId]);

  // 2. Scroll listener to show/hide "Scroll to Bottom" button
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 80;
    setShowScrollBottom(distanceToBottom > 150);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
      setShowScrollBottom(false);
    }
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, chatAction.isLoading]);

  // 3. Start a New Conversation
  const handleNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    const initialMsg: AiChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'ai',
      text: DEFAULT_GREETING,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };
    setActiveConversationId(newId);
    setMessages([initialMsg]);
    setMasteryState({
      currentStage: 1,
      totalStages: 5,
      masteredConcepts: [],
      weakConcepts: []
    });
    setShowHistoryDrawer(false);
  };

  // Switch Strategy Mode
  const handleModeChange = (newMode: AiTeachingMode) => {
    setTeachingMode(newMode);
    // If there is an active conversation, update its mode in state and local storage
    if (activeConversationId) {
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, mode: newMode } : c));
    }
  };

  // 4. Switch to an Existing Conversation
  const handleSelectConversation = (conv: AiConversation) => {
    setActiveConversationId(conv.id);
    setSubject(conv.subject || 'Biology');
    setTeachingMode(conv.mode || 'standard');
    setMessages(conv.messages || []);
    if (conv.masteryState) {
      setMasteryState(conv.masteryState);
    }
    setShowHistoryDrawer(false);
  };

  // 5. Delete a Conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (auth.currentUser?.uid) {
      await deleteAiConversation(convId);
    }
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversationId === convId) {
      handleNewConversation();
    }
  };

  // 6. Speech Synthesis
  const handleSpeech = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        // Strip markdown and KaTeX tokens for clean speech
        const cleanSpeech = text
          .replace(/\$+/g, '')
          .replace(/[#*`_]/g, '')
          .replace(/<[^>]*>/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [isSpeaking]);

  // 7. Send Chat Message with Full Conversation Context Memory
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || userInput).trim();
    if (!textToSend || chatAction.isLoading) return;

    const userMsg: AiChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!queryText) setUserInput('');

    // Prepare Context Summary
    const contextSummary = `PMDC NMDCAT Syllabus Context. Student Stats: ${topics.filter(t => t.status === 'revised').length}/${topics.length || 1} topics revised; ${savedMistakes.filter(m => !m.isResolved).length} open mistakes in vault; ${examHistory.length} mock tests taken.`;

    try {
      const data = await chatAction.runRequest(
        async (signal) =>
          await aiFetch<{ text: string; answer?: string; modeUsed?: string }>('/api/ai-tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: textToSend,
              subject,
              mode: teachingMode,
              context: contextSummary,
              messages: updatedMessages.map(m => ({
                sender: m.sender,
                text: m.text
              })),
              masteryState
            })
          }, { signal }),
        {
          pending: 'AI Tutor is analyzing your question and context...',
          success: 'AI Tutor response received.',
          cancelled: 'AI Tutor request cancelled.',
          failure: 'AI Tutor failed to respond. Please retry.'
        }
      );

      const aiReplyText = (data as any)?.text || (data as any)?.reply || (data as any)?.answer || 'I could not generate an answer for that query. Please try asking again.';

      const aiMsg: AiChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        modeUsed: teachingMode
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      // Auto-save conversation to Firestore and localStorage
      const conversationTitle = updatedMessages.find(m => m.sender === 'user')?.text.slice(0, 38) + '...' || `${subject} Lesson`;
      const currentConv: AiConversation = {
        id: activeConversationId,
        userId: auth.currentUser?.uid || 'anonymous_user',
        title: conversationTitle,
        subject,
        mode: teachingMode,
        messages: finalMessages,
        masteryState,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage immediately
      try {
        const existing = [...conversations.filter(c => c.id !== activeConversationId), currentConv];
        setConversations(existing);
        localStorage.setItem(`nmdcat_conversations_${currentUserId}`, JSON.stringify(existing));
      } catch {}

      // Save to Firestore
      if (auth.currentUser?.uid) {
        saveAiConversation(auth.currentUser.uid, currentConv);
      }
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      const errorMsg: AiChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'ai',
        text: chatAction.errorMessage || 'AI Tutor could not respond due to a network error. Please click retry below.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Image Doubt Solver Handler
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
          pending: 'Analyzing diagram / handwritten notes...',
          success: 'Image analysis complete.',
          cancelled: 'Image analysis cancelled.',
          failure: 'Image doubt analysis failed. Please retry.'
        }
      );

      const aiMsg: AiChatMessage = {
        id: `msg_img_${Date.now()}`,
        sender: 'ai',
        text: `### Diagram / Notes Solution:\n\n${data.analysis || data.text || 'No analysis returned.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        modeUsed: 'stepByStep'
      };

      setMessages(prev => [...prev, aiMsg]);
      setActiveSubTab('chat');
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      setMessages(prev => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'ai',
          text: imageAction.errorMessage || 'AI image doubt analysis failed.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          error: true
        }
      ]);
    }
  };

  // Mnemonic Generator Handler
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
    }
  };

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Mode Details
  const modeMetadata: Record<AiTeachingMode, { title: string; desc: string; badge: string; color: string }> = {
    standard: {
      title: 'Standard Direct',
      desc: 'Direct, clear academic explanations aligned with PMDC syllabus.',
      badge: 'Academic',
      color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    socratic: {
      title: 'Socratic Discovery',
      desc: 'Guides you with targeted questions to deduce concepts yourself.',
      badge: 'Interactive',
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    stepByStep: {
      title: 'Step-by-Step Logic',
      desc: 'Explicit numbered steps, formula substitutions, and units.',
      badge: 'Derivations',
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    },
    analogy: {
      title: 'Analogy Model',
      desc: 'Relatable real-world analogies with clear biological mappings.',
      badge: 'Intuitive',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    teachUntilUnderstand: {
      title: 'Teach Until Mastery',
      desc: 'Interactive diagnostic questions until mastery criteria are met.',
      badge: 'Mastery Loop',
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-[24px] border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              AI NMDCAT Tutor & Clinical Mentor
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30">
                Active Memory
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              PMDC-aligned multi-mode tutor with pedagogical reasoning and active mastery tracking.
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Interactive Chat</span>
          </button>
          <button
            onClick={() => setActiveSubTab('imageDoubt')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'imageDoubt'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Diagram Solver</span>
          </button>
          <button
            onClick={() => setActiveSubTab('mnemonic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'mnemonic'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Mnemonic Forge</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Interactive Chat with Memory & History */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Conversation History (Desktop + Toggleable Drawer) */}
          <div className={`${showHistoryDrawer ? 'fixed inset-0 z-50 bg-slate-950/80 p-4 flex flex-col justify-end' : 'hidden lg:flex lg:flex-col'} lg:static lg:z-auto bg-slate-900/90 rounded-[24px] border border-slate-800 p-4 space-y-4 shadow-xl h-auto lg:h-[680px]`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Chat History ({conversations.length})</span>
              </div>
              <button
                onClick={handleNewConversation}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-lg flex items-center gap-1 transition-all shadow-md shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-[400px] lg:max-h-none">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No saved conversations yet. Start asking questions!
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden min-w-0">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate text-white">{conv.title || 'Lesson'}</p>
                          <span className="text-[10px] text-slate-500">{conv.subject} • {conv.mode}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-opacity shrink-0 ml-1"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {showHistoryDrawer && (
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="w-full py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold lg:hidden"
              >
                Close History
              </button>
            )}
          </div>

          {/* Main Chat Pane (3 Cols) */}
          <div className="lg:col-span-3 flex h-[680px] flex-col overflow-hidden rounded-[24px] border border-slate-800/80 bg-slate-900/90 shadow-2xl relative">
            
            {/* Top Toolbar: Subject & Teaching Strategy */}
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                {/* Mobile History Toggle & Subject Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full no-scrollbar py-0.5">
                  <button
                    onClick={() => setShowHistoryDrawer(true)}
                    className="lg:hidden px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-sm"
                  >
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chats</span>
                  </button>

                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 hidden sm:inline shrink-0">Subject:</span>
                  {(['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'] as SubjectType[]).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSubject(sub)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 whitespace-nowrap ${
                        subject === sub 
                          ? 'bg-emerald-500 text-slate-950 shadow-sm font-black' 
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNewConversation}
                  className="hidden sm:flex px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg items-center gap-1 border border-slate-700 transition-all shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>New Chat</span>
                </button>
              </div>

              {/* Teaching Strategy Mode Tabs */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 shrink-0">Strategy:</span>
                  {[
                    { id: 'standard', label: 'Standard' },
                    { id: 'socratic', label: 'Socratic' },
                    { id: 'stepByStep', label: 'Step-by-Step' },
                    { id: 'analogy', label: 'Analogy' },
                    { id: 'teachUntilUnderstand', label: 'Teach Until Mastery' }
                  ].map(m => {
                    const isSelected = teachingMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModeChange(m.id as AiTeachingMode)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all border shrink-0 whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-1 ring-indigo-400'
                            : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border hidden md:inline-block shrink-0 whitespace-nowrap ${modeMetadata[teachingMode].color}`}>
                  {modeMetadata[teachingMode].badge}
                </span>
              </div>

              {/* Mode Description Bar */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800/60">
                <span className="truncate mr-2">{modeMetadata[teachingMode].desc}</span>
                {teachingMode === 'teachUntilUnderstand' && (
                  <span className="text-purple-300 font-bold text-[10px] shrink-0">
                    Mastery Stage: {masteryState.currentStage}/{masteryState.totalStages}
                  </span>
                )}
              </div>
            </div>

            {/* Messages Scroll Container */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar"
            >
              {messages.map((msg, idx) => (
                <ChatMessageItem
                  key={msg.id || idx}
                  msg={msg}
                  onCopy={copyToClipboard}
                  onSpeech={handleSpeech}
                  isSpeaking={isSpeaking}
                />
              ))}

              <AiActionStatus
                statusMessage={chatAction.statusMessage}
                errorMessage={chatAction.errorMessage}
                isLoading={chatAction.isLoading}
              />
            </div>

            {/* Floating "Scroll to Bottom" Button */}
            {showScrollBottom && (
              <button
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-20 right-4 sm:right-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3.5 py-1.5 rounded-full shadow-2xl border border-emerald-300 flex items-center gap-1.5 text-xs transition-all z-20 shadow-slate-950/80 hover:scale-105 active:scale-95"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Jump to latest</span>
              </button>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2"
            >
              <label htmlFor="ai-tutor-query" className="sr-only">Ask AI Tutor</label>
              <input
                id="ai-tutor-query"
                type="text"
                aria-label="Ask AI Tutor"
                placeholder={`Ask ${subject} question in ${teachingMode} mode...`}
                value={userInput}
                disabled={chatAction.isLoading}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatAction.isLoading || !userInput.trim()}
                className="shrink-0 px-4 sm:px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-lg active:scale-95 whitespace-nowrap"
              >
                {chatAction.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">{chatAction.isLoading ? 'Answering...' : 'Send'}</span>
              </button>
            </form>
          </div>
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
                <option value="Logical Reasoning">Logical Reasoning (e.g. Syllogism Rules)</option>
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

              <FormattedMathContent content={mnemonicResult} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
