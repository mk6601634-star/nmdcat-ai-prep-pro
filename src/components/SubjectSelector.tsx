import React from 'react';
import { SubjectType } from '../types';
import { Dna, FlaskConical, Atom, BookOpen, Brain, ChevronDown } from 'lucide-react';

export interface SubjectSelectorProps {
  value: SubjectType | string | null | undefined;
  onChange: (subject: SubjectType) => void;
  allowedSubjects?: SubjectType[];
  variant?: 'pills' | 'dropdown' | 'bar' | 'compact';
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showAllOption?: boolean;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

export const SCIENCE_SUBJECTS: SubjectType[] = ['Biology', 'Chemistry', 'Physics'];
export const ALL_NMDCAT_SUBJECTS: SubjectType[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];

export const SUBJECT_METADATA: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  badgeBorder: string;
  textClass: string;
  dotClass: string;
}> = {
  'Biology': {
    label: 'Biology',
    icon: Dna,
    color: 'emerald',
    activeBg: 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 shadow-md',
    badgeBorder: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-400'
  },
  'Chemistry': {
    label: 'Chemistry',
    icon: FlaskConical,
    color: 'amber',
    activeBg: 'bg-amber-500 text-slate-950 shadow-amber-500/20 shadow-md',
    badgeBorder: 'border-amber-500/40 text-amber-300 bg-amber-950/40',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400'
  },
  'Physics': {
    label: 'Physics',
    icon: Atom,
    color: 'cyan',
    activeBg: 'bg-cyan-500 text-slate-950 shadow-cyan-500/20 shadow-md',
    badgeBorder: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40',
    textClass: 'text-cyan-400',
    dotClass: 'bg-cyan-400'
  },
  'English': {
    label: 'English',
    icon: BookOpen,
    color: 'purple',
    activeBg: 'bg-purple-500 text-white shadow-purple-500/20 shadow-md',
    badgeBorder: 'border-purple-500/40 text-purple-300 bg-purple-950/40',
    textClass: 'text-purple-400',
    dotClass: 'bg-purple-400'
  },
  'Logical Reasoning': {
    label: 'Logical Reasoning',
    icon: Brain,
    color: 'rose',
    activeBg: 'bg-rose-500 text-white shadow-rose-500/20 shadow-md',
    badgeBorder: 'border-rose-500/40 text-rose-300 bg-rose-950/40',
    textClass: 'text-rose-400',
    dotClass: 'bg-rose-400'
  }
};

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  value,
  onChange,
  allowedSubjects = SCIENCE_SUBJECTS,
  variant = 'pills',
  label = 'Subject Context',
  required = true,
  disabled = false,
  className = '',
  showAllOption = false,
  onSelectAll,
  isAllSelected = false
}) => {
  const currentSubject = value as SubjectType | null;

  if (variant === 'bar') {
    return (
      <div className={`flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}:</span>
          {currentSubject ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${SUBJECT_METADATA[currentSubject]?.badgeBorder || 'border-slate-700 text-slate-300'}`}>
              <span className={`w-2 h-2 rounded-full ${SUBJECT_METADATA[currentSubject]?.dotClass || 'bg-slate-400'} animate-pulse`} />
              <span>{currentSubject}</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-rose-400 italic">No subject selected</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {showAllOption && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectAll?.()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isAllSelected
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Subjects
            </button>
          )}

          {allowedSubjects.map((sub) => {
            const meta = SUBJECT_METADATA[sub];
            const Icon = meta?.icon || Atom;
            const isSelected = !isAllSelected && currentSubject === sub;

            return (
              <button
                key={sub}
                type="button"
                disabled={disabled}
                onClick={() => onChange(sub)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? meta?.activeBg
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>{label}</span>
            {required && <span className="text-[10px] text-amber-400 font-semibold">*Required</span>}
          </label>
        )}
        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => {
              const val = e.target.value as SubjectType;
              if (val) onChange(val);
            }}
            disabled={disabled}
            className={`w-full bg-slate-900 border rounded-xl px-3.5 py-2.5 text-xs font-bold appearance-none transition-all pr-8 ${
              currentSubject && SUBJECT_METADATA[currentSubject]
                ? `${SUBJECT_METADATA[currentSubject].textClass} border-slate-700 focus:border-slate-500`
                : 'text-slate-400 border-rose-500/50 focus:border-rose-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <option value="" disabled>-- Select Subject Context --</option>
            {allowedSubjects.map((sub) => (
              <option key={sub} value={sub} className="bg-slate-900 text-white">
                {sub}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    );
  }

  // Default: Pills variant
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">{label}:</span>
          {required && !value && (
            <span className="text-[10px] text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30 animate-pulse">
              Subject required
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
        {showAllOption && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectAll?.()}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isAllSelected
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
        )}

        {allowedSubjects.map((sub) => {
          const meta = SUBJECT_METADATA[sub];
          const Icon = meta?.icon || Atom;
          const isSelected = !isAllSelected && currentSubject === sub;

          return (
            <button
              key={sub}
              type="button"
              disabled={disabled}
              onClick={() => onChange(sub)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? meta?.activeBg
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
