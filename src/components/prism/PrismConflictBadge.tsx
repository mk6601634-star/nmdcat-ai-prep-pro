import React from 'react';
import { KnowledgeStatus, ExamRelevance, VerificationLevel, SuperlativeType, ClaimType } from './prismTypes';
import { CheckCircle2, AlertTriangle, HelpCircle, BookOpen, AlertOctagon, XCircle, Info, Award, Compass } from 'lucide-react';

interface PrismConflictBadgeProps {
  status: KnowledgeStatus;
  examRelevance?: ExamRelevance;
  verificationLevel?: VerificationLevel;
  claimType?: ClaimType;
  superlativeType?: SuperlativeType;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const PrismConflictBadge: React.FC<PrismConflictBadgeProps> = ({
  status,
  examRelevance,
  verificationLevel,
  claimType,
  superlativeType,
  showIcon = true,
  size = 'sm'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const getStatusConfig = () => {
    switch (status) {
      case 'VERIFIED':
        return {
          label: 'Verified Knowledge',
          icon: CheckCircle2,
          classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'TEXTBOOK_SCIENCE_CONFLICT':
        return {
          label: 'Textbook ↔ Science Conflict',
          icon: AlertTriangle,
          classes: 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
        };
      case 'DISPUTED':
        return {
          label: 'Scientific Dispute',
          icon: HelpCircle,
          classes: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        };
      case 'TEXTBOOK_ONLY':
        return {
          label: 'Textbook Convention Only',
          icon: BookOpen,
          classes: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        };
      case 'SCIENTIFICALLY_OUTDATED':
        return {
          label: 'Scientifically Outdated',
          icon: AlertOctagon,
          classes: 'bg-orange-500/20 text-orange-300 border-orange-500/40'
        };
      case 'REJECTED':
        return {
          label: 'Rejected Claim',
          icon: XCircle,
          classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        };
      case 'INSUFFICIENT_EVIDENCE':
      default:
        return {
          label: 'Insufficient Evidence',
          icon: Info,
          classes: 'bg-slate-700/40 text-slate-300 border-slate-600/40'
        };
    }
  };

  const getVerificationLevelConfig = (lvl: VerificationLevel) => {
    switch (lvl) {
      case 'CROSS_SOURCE_CONSISTENT':
        return { label: 'Cross-Source Verified', classes: 'bg-teal-500/20 text-teal-300 border-teal-500/40' };
      case 'MULTI_SOURCE_SUPPORTED':
        return { label: 'Multi-Source Supported', classes: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'SOURCE_SUPPORTED':
        return { label: 'Source Supported', classes: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
      case 'CONTEXT_AMBIGUOUS':
        return { label: 'Context / Scope Ambiguous', classes: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' };
      case 'CONFLICTING_EVIDENCE':
        return { label: 'Conflicting Evidence', classes: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'UNVERIFIED_SUPERLATIVE':
        return { label: 'Unverified Superlative', classes: 'bg-red-500/20 text-red-300 border-red-500/40' };
      case 'INSUFFICIENT_EVIDENCE':
      default:
        return { label: 'Unverified', classes: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 font-bold rounded-md border tracking-wide uppercase ${sizeClasses} ${config.classes}`}>
        {showIcon && <Icon className={iconSize} />}
        <span>{config.label}</span>
      </span>

      {verificationLevel && verificationLevel !== 'SOURCE_SUPPORTED' && (
        <span className={`inline-flex items-center gap-1 font-bold rounded-md border tracking-wide uppercase ${sizeClasses} ${getVerificationLevelConfig(verificationLevel).classes}`}>
          {showIcon && <Award className={iconSize} />}
          <span>{getVerificationLevelConfig(verificationLevel).label}</span>
        </span>
      )}

      {claimType && (claimType === 'SUPERLATIVE' || claimType === 'HISTORICAL' || claimType === 'EXCEPTION') && (
        <span className={`inline-flex items-center gap-1 font-bold rounded-md border tracking-wide uppercase ${sizeClasses} bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40`}>
          {showIcon && <Compass className={iconSize} />}
          <span>{claimType}{superlativeType ? `: ${superlativeType}` : ''}</span>
        </span>
      )}

      {examRelevance && status === 'TEXTBOOK_SCIENCE_CONFLICT' && (
        <span className={`inline-flex items-center gap-1 font-bold rounded-md border tracking-wide uppercase ${sizeClasses} ${
          examRelevance === 'TEXTBOOK_CONVENTION' 
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
            : examRelevance === 'SCIENTIFIC_FACT' 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        }`}>
          <span>Exam: {examRelevance.replace('_', ' ')}</span>
        </span>
      )}
    </div>
  );
};
