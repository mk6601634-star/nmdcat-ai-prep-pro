import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Plus, 
  RotateCw,
  Loader2,
  BookOpen
} from 'lucide-react';
import { TopicMasteryContext } from '../../../types/topicMastery';
import { ConceptMindMap, MindMapNode } from '../../../types';
import { CONCEPT_MINDMAPS } from '../../../data/nmdcatData';
import { FormattedMathContent } from '../../FormattedMathContent';
import { aiFetch } from '../../../lib/aiRequest';
import { useAiRequestAction } from '../../../lib/useAiRequestAction';
import { AiActionStatus } from '../../AiActionStatus';

interface MindMapStageProps {
  context: TopicMasteryContext;
  onAskTutor: (prompt: string) => void;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onNavigateStage?: (stageId: any) => void;
}

export const MindMapStage: React.FC<MindMapStageProps> = ({
  context,
  onAskTutor,
  isCompleted,
  onToggleComplete,
  onNavigateStage
}) => {
  const [mindMap, setMindMap] = useState<ConceptMindMap | null>(null);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const mapAction = useAiRequestAction();

  // Find local database match or generate AI mindmap
  useEffect(() => {
    // 1. Check local static database
    const localMatch = CONCEPT_MINDMAPS.find(m => 
      m.subject === context.subjectName && 
      (m.topic.toLowerCase().includes(context.topicName.toLowerCase()) || context.topicName.toLowerCase().includes(m.topic.toLowerCase()))
    );

    if (localMatch) {
      setMindMap(localMatch);
      setSelectedNode(localMatch.nodes[0] || null);
    } else {
      // 2. Fetch or Generate
      loadOrGenerateMindMap();
    }
  }, [context.topicName, context.subjectName]);

  const loadOrGenerateMindMap = async () => {
    try {
      const data = await mapAction.runRequest(
        async (signal) =>
          await aiFetch<{ mindmap?: ConceptMindMap; map?: ConceptMindMap; title?: string; nodes?: MindMapNode[] }>('/api/generate-mindmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: context.subjectName,
              topic: context.topicName,
              chapter: context.chapterName
            })
          }, { signal }),
        {
          pending: `Generating Concept Mind Map for ${context.topicName}...`,
          success: 'Concept Mind Map ready.',
          cancelled: 'Mind map request cancelled.',
          failure: 'Failed to generate mind map. Click Retry.'
        }
      );

      const generatedMap: ConceptMindMap = {
        id: `map_${Date.now()}`,
        subject: context.subjectId,
        topic: context.topicName,
        title: data.title || `${context.topicName} Concept Map`,
        centerConcept: context.topicName,
        nodes: data.nodes || (data.mindmap as any)?.nodes || [
          { id: 'n1', label: 'Core Mechanism', description: 'The fundamental biological/physical mechanism governing this topic.' },
          { id: 'n2', label: 'Key Components', description: 'Major structural units, variables, and interacting factors.' },
          { id: 'n3', label: 'PMDC High-Yield Traps', description: 'Subtle exceptions, distractors, and calculation trapdoors.' },
          { id: 'n4', label: 'Clinical / Real Applications', description: 'Practical diagnostic relevance and medical entrance exam context.' }
        ]
      };

      setMindMap(generatedMap);
      setSelectedNode(generatedMap.nodes[0] || null);
    } catch (err) {
      console.warn('Fallback generating default structured mindmap:', err);
      // Construct robust default nodes
      const fallbackMap: ConceptMindMap = {
        id: `fallback_${Date.now()}`,
        subject: context.subjectId,
        topic: context.topicName,
        title: `${context.topicName} Hierarchy`,
        centerConcept: context.topicName,
        nodes: [
          { id: 'f1', label: 'Definition & Core Principle', description: `Fundamental textbook definition of ${context.topicName} adhering to PMDC syllabus.` },
          { id: 'f2', label: 'Pathway / Mechanism', description: 'Step-by-step reaction or physical process with key intermediates.' },
          { id: 'f3', label: 'Important Classifications', description: 'Different types, functional groups, or structural categories.' },
          { id: 'f4', label: 'High-Yield Exam Focus', description: 'Direct question triggers and past paper favorites.' }
        ]
      };
      setMindMap(fallbackMap);
      setSelectedNode(fallbackMap.nodes[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/70 via-slate-900/90 to-cyan-950/70 border border-teal-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Concept Mind Map</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Visual Concept Hierarchy for <strong className="text-teal-300">{context.topicName}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadOrGenerateMindMap}
          disabled={mapAction.isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <RotateCw className={`w-3.5 h-3.5 ${mapAction.isLoading ? 'animate-spin' : ''}`} />
          <span>Regenerate Map</span>
        </button>
      </div>

      <AiActionStatus status={mapAction.status} message={mapAction.message} onCancel={mapAction.cancel} />

      {mindMap && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Central Concept & Nodes Tree */}
          <div className="lg:col-span-2 space-y-4">
            {/* Center Anchor Hub */}
            <div className="p-5 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 text-center shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 px-2 py-0.5 rounded bg-teal-500/20">
                Core Topic Anchor
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">{mindMap.centerConcept || context.topicName}</h3>
              <p className="text-xs text-slate-400 mt-1">{context.subjectName} • {context.chapterName}</p>
            </div>

            {/* Concept Nodes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {mindMap.nodes.map((node, idx) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id || idx}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-800 border-teal-500 ring-2 ring-teal-500/30 shadow-xl'
                        : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-400">Node {idx + 1}</span>
                      <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isSelected ? 'rotate-90 text-teal-400' : ''}`} />
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">{node.label}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>

                    {node.subNodes && node.subNodes.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {node.subNodes.map((sub, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {sub.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node Detail Inspector */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400">Branch Inspector</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Concept Detail
                </span>
              </div>

              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-white">{selectedNode.label}</h4>
                    <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                      <FormattedMathContent content={selectedNode.description} />
                    </div>
                  </div>

                  {selectedNode.subNodes && selectedNode.subNodes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sub-Branches</p>
                      {selectedNode.subNodes.map((sub, sIdx) => (
                        <div key={sIdx} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                          <strong className="text-teal-300 block">{sub.label}</strong>
                          <span className="text-slate-400 text-[11px]">{sub.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ask Tutor About This Specific Branch */}
                  <button
                    onClick={() => onAskTutor(`Explain the "${selectedNode.label}" branch of ${context.topicName} in detail with NMDCAT past paper examples.`)}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Tutor About This Branch</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-8">Select a concept node to view details</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completion & Navigation Footer */}
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
          {isCompleted ? 'Mind Map Stage Completed ✓' : 'Mark Mind Map as Complete'}
        </button>

        {onNavigateStage && (
          <button
            onClick={() => onNavigateStage('notes')}
            className="px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <span>Next Recommended: Smart Notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
