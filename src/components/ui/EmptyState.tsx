import React from "react";
import { Clipboard, RefreshCw } from "lucide-react";
import Button from "./Button";
import { motion, useReducedMotion } from "motion/react";

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
  icon = <Clipboard className="w-8 h-8 text-indigo-400" />,
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const entryAnimation = shouldReduceMotion ? { animate: { opacity: 1 } } : {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" as const }
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/10 border border-slate-900 rounded-[2.5rem] space-y-5 max-w-md mx-auto"
      {...entryAnimation}
    >
      <div className="relative p-5 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center shadow-lg shadow-indigo-500/5 group overflow-hidden">
        {/* Animated ambient background ring */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10 shrink-0">
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-mono">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-medium px-4">{description}</p>
      </div>
      {onReset && (
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={onReset} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            {resetLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

