import React from 'react';
import { KnowledgeStatus, ExamRelevance } from './prismTypes';
import { CheckCircle2, AlertTriangle, HelpCircle, BookOpen, AlertOctagon, XCircle, Info } from 'lucide-react';

interface PrismConflictBadgeProps {
  status: KnowledgeStatus;
  examRelevance?: ExamRelevance;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const PrismConflictBadge: React.FC<PrismConflictBadgeProps> = ({
  status,
  examRelevance,
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

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 font-bold rounded-md border tracking-wide uppercase ${sizeClasses} ${config.classes}`}>
        {showIcon && <Icon className={iconSize} />}
        <span>{config.label}</span>
      </span>

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
