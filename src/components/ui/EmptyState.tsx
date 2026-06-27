import React from "react";
import { Clipboard, RefreshCw } from "lucide-react";
import Button from "./Button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = "No Tickets Found",
  description = "No municipal reports match the current filters or query selection.",
  onReset,
  resetLabel = "Clear All Filters",
  icon = <Clipboard className="w-8 h-8 text-slate-500" />,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-m3-surface-variant/20 border border-m3-outline rounded-3xl space-y-4 max-w-md mx-auto">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-md">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          {resetLabel}
        </Button>
      )}
    </div>
  );
}
