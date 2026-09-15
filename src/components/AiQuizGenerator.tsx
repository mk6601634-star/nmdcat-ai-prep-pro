import React, { useState } from 'react';
import { SubjectType, MCQQuestion, GenerationMode, CognitiveLevel } from '../types';
import { aiFetch, getAiFriendlyMessage, isAiRequestCancelled } from '../lib/aiRequest';
import { useAiRequestAction } from '../lib/useAiRequestAction';
import { stageAiGeneratedQuestions, approveStagedQuestion, rejectStagedQuestion, subscribeToAiGeneratedQuestions } from '../lib/firestoreService';
import { validateQuestionsBatch } from '../utils/contentValidation';
import { GENERATION_MODE_DESCRIPTIONS, COGNITIVE_LEVEL_DESCRIPTIONS, AI_GENERATION_MIN_QUESTIONS, AI_GENERATION_MAX_QUESTIONS } from '../constants/contentModel';
import {
  Sparkles,
  Zap,
  Settings,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  CheckSquare,
  XSquare,
  Filter,
  FileText,
  BrainCircuit,
  Loader2
} from 'lucide-react';

interface AiQuizGeneratorProps {
  currentUser?: { uid: string; email: string; displayName: string };
}

export const AiQuizGenerator: React.FC<AiQuizGeneratorProps> = ({ currentUser }) => {
  const [subject, setSubject] = useState<SubjectType>('Biology');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [learningObjective, setLearningObjective] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [cognitiveLevel, setCognitiveLevel] = useState<CognitiveLevel>('Application');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('ADVANCED');
  const [quantity, setQuantity] = useState(10);
  const [questionType, setQuestionType] = useState<'Standard' | 'Assertion-Reason' | 'Case-Based'>('Standard');
  const [sourceMaterial, setSourceMaterial] = useState('');

  const [generatedQuestions, setGeneratedQuestions] = useState<MCQQuestion[]>([]);
  const [stagedQuestions, setStagedQuestions] = useState<MCQQuestion[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  const generationAction = useAiRequestAction();

  // Subscribe to AI-generated questions from Firestore
  React.useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToAiGeneratedQuestions((items) => {
      setStagedQuestions(items);
    });
    return unsubscribe;
  }, [currentUser]);

  const handleGenerate = async () => {
    if (!chapter || !topic) {
      alert('Please enter both chapter and topic');
      return;
    }

    if (quantity < AI_GENERATION_MIN_QUESTIONS || quantity > AI_GENERATION_MAX_QUESTIONS) {
      alert(`Quantity must be between ${AI_GENERATION_MIN_QUESTIONS} and ${AI_GENERATION_MAX_QUESTIONS}`);
      return;
    }

    try {
      const data = await generationAction.runRequest(
        async (signal) =>
          await aiFetch<{
            success: boolean;
            questions: MCQQuestion[];
            generationRequestId: string;
            requested: number;
            generated: number;
            metadata: any;
          }>('/api/generate-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject,
              chapter,
              topic,
              learningObjective,
              difficulty,
              cognitiveLevel,
              generationMode,
              quantity,
              questionType,
              sourceMaterial: sourceMaterial || undefined
            })
          }, { signal }),
        {
          pending: 'AI is generating questions...',
          success: 'Questions generated successfully.',
          cancelled: 'Generation cancelled.',
          failure: 'Failed to generate questions. Please try again.'
        }
      );

      if (data.success && data.questions) {
        // Validate against existing staged questions
        const validation = validateQuestionsBatch(data.questions, subject, topic, stagedQuestions);

        setGeneratedQuestions(validation.valid);
        setValidationResults(validation.validationResults);

        // Stage valid questions
        if (validation.valid.length > 0 && currentUser) {
          const result = await stageAiGeneratedQuestions(validation.valid, currentUser.uid);
          if (result.success) {
            alert(`Generated: ${data.generated}, Valid: ${validation.valid.length}, Rejected: ${validation.rejected.length}, Duplicates: ${validation.duplicates.length}`);
          }
        }
      }
    } catch (error) {
      if (isAiRequestCancelled(error)) return;
      alert('AI generation failed. Please check your connection and try again.');
    }
  };

  const handleApprove = async (questionId: string) => {
    if (!currentUser) return;
    const result = await approveStagedQuestion(questionId, currentUser.uid);
    if (result.success) {
      alert('Question approved and published.');
    }
  };

  const handleReject = async (questionId: string) => {
    if (!currentUser) return;
    const reason = prompt('Rejection reason (optional):');
    const result = await rejectStagedQuestion(questionId, currentUser.uid, reason || 'No reason provided');
    if (result.success) {
      alert('Question rejected.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          AI Quiz Generator
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Generate NMDCAT-style questions using AI. Questions enter staging queue for review before publishing.
        </p>
      </div>

      {/* Generation Form */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-400" />
          Generation Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="English">English</option>
              <option value="Logical Reasoning">Logical Reasoning</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Chapter</label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Cell Biology"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Enzyme Kinetics"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Learning Objective (Optional)</label>
            <input
              type="text"
              value={learningObjective}
              onChange={(e) => setLearningObjective(e.target.value)}
              placeholder="e.g. Understand enzyme structure"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Cognitive Level</label>
            <select
              value={cognitiveLevel}
              onChange={(e) => setCognitiveLevel(e.target.value as CognitiveLevel)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              <option value="Recall">Recall</option>
              <option value="Understanding">Understanding</option>
              <option value="Application">Application</option>
              <option value="Analysis">Analysis</option>
              <option value="Evaluation">Evaluation</option>
              <option value="Synthesis">Synthesis</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Generation Mode</label>
            <select
              value={generationMode}
              onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              <option value="SIMPLE">Simple - Recall/Conceptual</option>
              <option value="ADVANCED">Advanced - Application/Reasoning</option>
              <option value="ULTRA_ADVANCED">Ultra Advanced - NMDCAT-style</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">{GENERATION_MODE_DESCRIPTIONS[generationMode]}</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Number of Questions (1-100)</label>
            <input
              type="number"
              min={AI_GENERATION_MIN_QUESTIONS}
              max={AI_GENERATION_MAX_QUESTIONS}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Question Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as 'Standard' | 'Assertion-Reason' | 'Case-Based')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              <option value="Standard">Standard MCQ</option>
              <option value="Assertion-Reason">Assertion-Reason</option>
              <option value="Case-Based">Case-Based</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Source Material (Optional)</label>
          <textarea
            value={sourceMaterial}
            onChange={(e) => setSourceMaterial(e.target.value)}
            placeholder="Paste textbook content, notes, or reference material here..."
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-sm"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={generationAction.isLoading}
          className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generationAction.isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Generate Questions
            </>
          )}
        </button>
      </div>

      {/* Staged Questions Review */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Staged Questions ({stagedQuestions.length})
        </h3>

        {stagedQuestions.length === 0 ? (
          <p className="text-sm text-slate-400">No staged questions. Generate questions to populate this queue.</p>
        ) : (
          <div className="space-y-3">
            {stagedQuestions.slice(0, 10).map((q) => (
              <div key={q.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-indigo-400 font-semibold">{q.subject} • {q.chapter} • {q.topic}</p>
                    <p className="text-sm text-white mt-1">{q.question}</p>
                    <p className="text-xs text-slate-400 mt-2">Correct: {q.options[q.correctIndex]}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(q.id)}
                      className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                      title="Approve & Publish"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(q.id)}
                      className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30"
                      title="Reject"
                    >
                      <XSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span>Difficulty: {q.difficulty}</span>
                  <span>Cognitive: {q.cognitiveLevel}</span>
                  <span>Source: {q.source}</span>
                  {q.generationModel && <span>Model: {q.generationModel}</span>}
                </div>
              </div>
            ))}
            {stagedQuestions.length > 10 && (
              <p className="text-xs text-slate-400 text-center">Showing 10 of {stagedQuestions.length} staged questions</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
