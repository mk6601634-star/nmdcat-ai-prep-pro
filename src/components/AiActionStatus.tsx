import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';

interface AiActionStatusProps {
  statusMessage: string;
  errorMessage: string | null;
  isLoading: boolean;
}

export const AiActionStatus: React.FC<AiActionStatusProps> = ({ statusMessage, errorMessage, isLoading }) => {
  if (!statusMessage && !errorMessage && !isLoading) return null;

  const isError = Boolean(errorMessage);
  const icon = isError ? <AlertCircle className="w-4 h-4 text-rose-300" /> : isLoading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-300" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />;
  const bannerClass = isError
    ? 'bg-rose-500/10 border-rose-500/20 text-rose-100'
    : isLoading
    ? 'bg-slate-950 border-indigo-500/30 text-slate-200'
    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100';

  return (
    <div className={`rounded-2xl border p-4 text-xs font-semibold flex items-center gap-3 ${bannerClass}`}>
      <div className="flex items-center justify-center rounded-full bg-slate-950/40 w-9 h-9">
        {icon}
      </div>
      <div className="space-y-1">
        <p>{errorMessage || statusMessage}</p>
        {isError && <p className="text-[11px] text-rose-200">Please retry the action or refresh the page.</p>}
      </div>
    </div>
  );
};
