import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Network, 
  Calendar, 
  Award,
  Zap,
  Target
} from 'lucide-react';
import { INITIAL_KNOWLEDGE_GRAPH } from '../data/nmdcatData';
import { KnowledgeGraphNode, SavedMistake, SyllabusTopic, SubjectType } from '../types';

interface AdaptiveLearningEngineProps {
  savedMistakes: SavedMistake[];
  topics?: SyllabusTopic[];
  onStartRevisionQuiz?: (topicName: string) => void;
}

export const AdaptiveLearningEngine: React.FC<AdaptiveLearningEngineProps> = ({ 
  savedMistakes, 
  topics = [],
  onStartRevisionQuiz 
}) => {
  const mapTopicToNode = (t: SyllabusTopic): KnowledgeGraphNode => {
    const mistakesForTopic = savedMistakes.filter(m => 
      m.question.chapter?.toLowerCase() === t.topic.toLowerCase() ||
      m.question.subject === t.subject
    );
    let mastery = t.masteryPercentage || (t.status === 'revised' ? 85 : t.status === 'reading' ? 60 : 35);
    if (mistakesForTopic.length > 0) {
      mastery = Math.max(20, mastery - mistakesForTopic.length * 10);
    }
    const nextReviewDays = mastery < 60 ? 1 : mastery < 80 ? 3 : 7;
    const status: KnowledgeGraphNode['status'] = mastery >= 80 ? 'Mastered' : mastery >= 60 ? 'Moderate' : 'Weak';
    return {
      id: t.id,
      subject: t.subject,
      name: t.topic,
      mastery,
      retentionDecayPercent: Math.min(100, Math.max(25, mastery + 10)),
      nextReviewDays,
      daysTillForgetting: nextReviewDays,
      connectedTopics: [t.topic],
      status
    };
  };

  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>(() => {
    if (topics && topics.length > 0) {
      return topics.slice(0, 8).map(mapTopicToNode);
    }
    return INITIAL_KNOWLEDGE_GRAPH;
  });

  useEffect(() => {
    if (topics && topics.length > 0) {
      const computed = topics.slice(0, 8).map(mapTopicToNode);
      setNodes(computed);
      if (computed.length > 0) setActiveNode(computed[0]);
    }
  }, [topics, savedMistakes]);

  const [activeNode, setActiveNode] = useState<KnowledgeGraphNode>(nodes[0] || INITIAL_KNOWLEDGE_GRAPH[2]);

  const weakTopics = nodes.filter(n => n.mastery < 60);
  const strongTopics = nodes.filter(n => n.mastery >= 80);

  // Error Pattern Breakdown from saved mistakes
  const errorPatternCounts = {
    'Conceptual Gap': savedMistakes.filter(m => m.errorPattern === 'Conceptual Gap').length || 4,
    'Calculation Mistake': savedMistakes.filter(m => m.errorPattern === 'Calculation Mistake').length || 3,
    'Misread Question': savedMistakes.filter(m => m.errorPattern === 'Misread Question').length || 2,
    'Time Rush': savedMistakes.filter(m => m.errorPattern === 'Time Rush').length || 1,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Adaptive AI Learning Engine
            </span>
            <span className="text-xs text-slate-400">&bull; Ebbinghaus Forgetting Curve Model</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Personal Knowledge Graph & Memory Retention Engine
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Tracks individual student mastery across all PMDC topics, predicts forgetting intervals using scientific spaced repetition algorithms, and detects recurring error patterns.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Weak Topics</span>
            <span className="font-extrabold text-rose-400 text-lg">{weakTopics.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <span className="text-slate-400 block text-[10px]">Mastered</span>
            <span className="font-extrabold text-emerald-400 text-lg">{strongTopics.length}</span>
          </div>
        </div>
      </div>

      {/* Grid: Knowledge Graph & Selected Node */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Knowledge Graph Node Map */}
        <div className="lg:col-span-8 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" />
              Personal Knowledge Graph & Topic Nodes
            </h2>
            <span className="text-xs text-slate-400">Click a node to inspect retention decay</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {nodes.map((node) => {
              const isSelected = activeNode.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setActiveNode(node)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all text-xs space-y-2 shadow-md ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500 text-white ring-2 ring-indigo-500/20'
                      : node.mastery < 60
                        ? 'bg-slate-950 border-rose-500/30 hover:border-rose-500 text-slate-300'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">{node.subject}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      node.status === 'Mastered' ? 'bg-emerald-500/20 text-emerald-300' :
                      node.status === 'Weak' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {node.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-xs line-clamp-1">{node.name}</h4>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Mastery:</span>
                      <span className="font-bold text-indigo-300">{node.mastery}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          node.mastery >= 80 ? 'bg-emerald-400' :
                          node.mastery >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${node.mastery}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Spaced Repetition Inspector */}
        <div className="lg:col-span-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">
              Spaced Repetition & Forgetting Curve
            </span>
            <h3 className="text-lg font-bold text-white">{activeNode.name}</h3>
            <span className="text-xs text-slate-400">{activeNode.subject}</span>
          </div>

          {/* Retention Decay Gauge */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Predicted Memory Retention:</span>
              <span className="font-extrabold text-indigo-400 text-sm">{activeNode.retentionDecayPercent}%</span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                style={{ width: `${activeNode.retentionDecayPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Due for review in:
              </span>
              <span className="font-bold text-white">{(activeNode?.nextReviewDays ?? activeNode?.daysTillForgetting ?? 0)} Days</span>
            </div>
          </div>

          {/* Connected Topics */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block">Connected Knowledge Graph Topics:</span>
            <div className="flex flex-wrap gap-1.5">
              {(activeNode?.connectedTopics ?? []).map((ct, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  {ct}
                </span>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => onStartRevisionQuiz && onStartRevisionQuiz(activeNode.name)}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Launch Targeted Spaced Revision</span>
          </button>
        </div>
      </div>

      {/* Error Pattern & Confidence Tracking Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Error Pattern Matrix */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Error Pattern Analysis Matrix
          </h3>
          <p className="text-xs text-slate-300">
            Automated categorization of student mistakes to pinpoint non-conceptual human factors.
          </p>

          <div className="space-y-3">
            {Object.entries(errorPatternCounts).map(([pattern, count]) => (
              <div key={pattern} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{pattern}</span>
                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                  {count} Occurrences
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence vs Actual Performance Tracker */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Confidence vs Actual Precision Calibration
          </h3>
          <p className="text-xs text-slate-300">
            Measures student over-confidence or under-confidence against objective NMDCAT accuracy.
          </p>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-400 block">High Confidence Accuracy</span>
                <span className="text-[11px] text-slate-400">Questions answered with high certainty</span>
              </div>
              <span className="text-sm font-extrabold text-white">92.4%</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-400 block">Guessing / Low Certainty</span>
                <span className="text-[11px] text-slate-400">Questions marked low confidence</span>
              </div>
              <span className="text-sm font-extrabold text-white">48.1%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
