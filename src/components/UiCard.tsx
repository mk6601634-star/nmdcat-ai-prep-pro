import React from 'react';

interface UiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const UiCard: React.FC<UiCardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`bg-slate-950/95 border border-slate-800/70 p-6 rounded-[28px] shadow-[0_25px_80px_-45px_rgba(15,23,42,0.9)] backdrop-blur-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default UiCard;
