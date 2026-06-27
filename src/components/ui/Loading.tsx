import React from "react";
import { Brain, Loader2 } from "lucide-react";
import { motion } from "motion/react";

// Standard Spinner component
export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };
  return (
    <Loader2 className={`animate-spin text-brand-primary ${sizes[size]} ${className}`} />
  );
}

// Fullscreen Loading Overlay
export function LoadingOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-600/30 animate-bounce">
          C
        </div>
        <p className="text-sm font-semibold text-slate-300 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}

// Skeleton Screen for cards
export function SkeletonCard() {
  return (
    <div className="bg-m3-surface-variant/40 border border-m3-outline rounded-3xl p-5 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-800 rounded-lg w-1/4"></div>
        <div className="h-4 bg-slate-800 rounded-lg w-1/6"></div>
      </div>
      <div className="h-6 bg-slate-800 rounded-lg w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3.5 bg-slate-800 rounded-lg w-full"></div>
        <div className="h-3.5 bg-slate-800 rounded-lg w-5/6"></div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-3 bg-slate-800 rounded-lg w-1/3"></div>
        <div className="h-8 bg-slate-800 rounded-xl w-1/4"></div>
      </div>
    </div>
  );
}

// Skeleton List for queues
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}

// Special AI Cognitive reasoning loader
export function AILoader({ message = "AI Triage System Analysing..." }: { message?: string }) {
  return (
    <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent animate-pulse" />
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/5"
      >
        <Brain className="w-6 h-6 animate-pulse" />
      </motion.div>
      <div className="space-y-1 z-10">
        <p className="text-sm font-bold text-slate-200">{message}</p>
        <p className="text-xs text-slate-400">Evaluating visual data & mapping telemetry criteria...</p>
      </div>
    </div>
  );
}
