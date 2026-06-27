import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title = "Connection Interrupted",
  message = "Failed to synchronize data with the Firestore database cluster.",
  onRetry,
  retryLabel = "Attempt Reconnection",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-red-500/5 border border-red-500/20 rounded-3xl space-y-4 max-w-md mx-auto">
      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-md">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
