import React, { useState } from 'react';
import { PrismKnowledgeLayer, PrismClaim, PrismSource } from './prismTypes';
import { PrismConflictBadge } from './PrismConflictBadge';
import { 
  ShieldCheck, 
  FileText, 
  BookOpen, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  Scale
} from 'lucide-react';

interface PrismSourceEvidenceViewProps {
  knowledgeLayer: PrismKnowledgeLayer;
}

export const PrismSourceEvidenceView: React.FC<PrismSourceEvidenceViewProps> = ({ knowledgeLayer }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  const categories = ['ALL', ...Array.from(new Set(knowledgeLayer.claims.map(c => c.category || 'General')))];

  const filteredClaims = selectedCategory === 'ALL'
    ? knowledgeLayer.claims
    : knowledgeLayer.claims.filter(c => (c.category || 'General') === selectedCategory);

  const getSourceById = (sourceId: string): PrismSource | undefined => {
    return knowledgeLayer.sources.find(s => s.id === sourceId);
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary & Conflict Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Verified Knowledge Foundation</h3>
              <p className="text-[11px] text-slate-400">Strictly source-audited against PMDC syllabus & peer-reviewed science</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
              {knowledgeLayer.sources.length} Sources
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-semibold">
              {knowledgeLayer.claims.filter(c => c.status === 'VERIFIED').length} Verified Claims
            </span>
            {knowledgeLayer.textbookConflicts.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                {knowledgeLayer.textbookConflicts.length} Conflicts
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {knowledgeLayer.verifiedSummary || 'Knowledge synthesized and mapped into source-traceable claims and deduction rules.'}
        </p>
      </div>

      {/* 2. Textbook vs Science Conflict Resolution Matrix */}
      {knowledgeLayer.textbookConflicts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-amber-300">Textbook ↔ Science Conflict Matrix (Rule of Non-Silent Correction)</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase">
              High-Yield Exam Nuance
            </span>
          </div>
          <p className="text-xs text-slate-300">
            When prescribed textbooks differ from contemporary scientific consensus, PRISM preserves both realities and flags the precise exam stance so you avoid distractor traps.
          </p>

          <div className="grid grid-cols-1 gap-4 pt-2">
            {knowledgeLayer.textbookConflicts.map((conflict, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-blue-500/30 space-y-1">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]">
                      <BookOpen className="w-3.5 h-3.5" />
                      Prescribed Textbook Convention:
                    </span>
                    <p className="text-slate-200">{conflict.textbookVersion}</p>
                  </div>
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-emerald-500/30 space-y-1">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Current Scientific Literature:
                    </span>
                    <p className="text-slate-200">{conflict.scientificVersion}</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-amber-300">Actionable PMDC Exam Guidance:</span>
                    <p className="text-slate-300">{conflict.recommendationForStudent}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Source Provenance Hierarchy (Tiers 1-4) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Source Provenance Hierarchy
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {knowledgeLayer.sources.map((src) => {
            const tierColors = {
              1: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300',
              2: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
              3: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
              4: 'border-slate-700 bg-slate-950 text-slate-300'
            };

            return (
              <div key={src.id} className={`p-3.5 rounded-xl border space-y-2 text-xs ${tierColors[src.tier] || tierColors[4]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-950/60 border border-current">
                    Tier {src.tier} &bull; {src.sourceType.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{src.reliabilityScore}% Trust</span>
                </div>
                <h5 className="font-bold text-slate-100 line-clamp-1">{src.title}</h5>
                <p className="text-[11px] text-slate-400 line-clamp-1">Origin: {src.origin}</p>
                <p className="text-[10px] text-slate-300/80 line-clamp-2 italic bg-slate-950/50 p-1.5 rounded">
                  "{src.contentSnippet}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Atomic Claims & Qualifier Preservation Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Audited Claims & Qualifier Registry
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Every claim preserves strict scientific and contextual qualifiers</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredClaims.map((claim) => {
            const isExpanded = expandedClaimId === claim.id;
            const sources = claim.sourceIds.map(getSourceById).filter(Boolean) as PrismSource[];

            return (
              <div
                key={claim.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 text-xs transition-all space-y-2"
              >
                <div
                  onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                  className="flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PrismConflictBadge status={claim.status} examRelevance={claim.examRelevance} size="sm" />
                      <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {claim.category || 'General'}
                      </span>
                      {claim.qualifier && (
                        <span className="text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                          Qualifier: {claim.qualifier}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-200 text-sm mt-1">{claim.statement}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-slate-400">
                    <span className="text-[10px] font-bold">{sources.length} Source{sources.length === 1 ? '' : 's'}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-900 space-y-3 text-xs">
                    {claim.notes && (
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        <strong className="text-cyan-400">Audit Notes: </strong>
                        {claim.notes}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 block">Attributed Sources:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sources.map((s) => (
                          <div key={s.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-0.5">
                            <span className="font-bold text-slate-200">{s.title}</span>
                            <p className="text-slate-400 text-[10px]">{s.origin} (Tier {s.tier})</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Deductive Rule Extraction */}
      {knowledgeLayer.rules.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Extracted Deductive Rules & Application Boundaries
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {knowledgeLayer.rules.map((rule) => (
              <div key={rule.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-indigo-400 uppercase px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30">
                  {rule.subject} Core Rule
                </span>
                <p className="font-bold text-slate-200 text-sm">{rule.ruleStatement}</p>
                <div className="text-[11px] text-slate-300">
                  <strong className="text-emerald-400">Conditions: </strong>
                  {rule.applicationConditions}
                </div>
                {rule.exceptions?.length > 0 && (
                  <div className="text-[11px] text-rose-300">
                    <strong className="text-rose-400">Exceptions: </strong>
                    {rule.exceptions.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
