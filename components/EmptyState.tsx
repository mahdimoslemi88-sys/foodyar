import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-[32px] border-2 border-dashed border-slate-200 h-full animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-400">
        {icon}
      </div>
      <h3 className="text-xl font-extrabold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mx-auto mb-8">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
