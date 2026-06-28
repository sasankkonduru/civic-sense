import React from "react";
import { motion, useReducedMotion } from "motion/react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "critical" | "high" | "medium" | "low" | "info" | "success" | "brand";
  className?: string;
  dot?: boolean;
}

export default function Badge({
  children,
  variant = "default",
  className = "",
  dot = false,
}: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-sans tracking-wide border transition-all duration-200";
  
  const variants = {
    default: "bg-slate-900 text-slate-300 border-slate-800",
    critical: "bg-red-500/10 text-red-400 border-red-500/25 shadow-sm shadow-red-500/5",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/25 shadow-sm shadow-orange-500/5",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25 shadow-sm shadow-yellow-500/5",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm shadow-emerald-500/5",
    info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-sm shadow-cyan-500/5",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm shadow-emerald-500/5",
    brand: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 shadow-sm shadow-indigo-500/5",
  };

  const dotColors = {
    default: "bg-slate-400",
    critical: "bg-red-400",
    high: "bg-orange-400",
    medium: "bg-yellow-400",
    low: "bg-emerald-400",
    info: "bg-cyan-400",
    success: "bg-emerald-400",
    brand: "bg-indigo-400",
  };

  const shouldReduceMotion = useReducedMotion();
  const hoverAnimation = shouldReduceMotion ? {} : { whileHover: { scale: 1.05 } };

  return (
    <motion.span 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      {...hoverAnimation}
      transition={{ duration: 0.2 }}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${dotColors[variant]}`} />
      )}
      {children}
    </motion.span>
  );
}


// Helper to resolve severity level to variant
export function getSeverityVariant(severity: string | undefined): "critical" | "high" | "medium" | "low" | "default" {
  if (!severity) return "default";
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "low") return "low";
  return "default";
}

// Helper to resolve status to variant
export function getStatusVariant(status: string | undefined): "brand" | "info" | "medium" | "success" | "default" | "critical" {
  if (!status) return "default";
  const normalized = status.toLowerCase();
  if (normalized === "submitted" || normalized === "reported") return "brand";
  if (normalized === "assigned" || normalized === "under review") return "info";
  if (normalized === "in progress") return "medium";
  if (normalized === "resolved") return "brand"; // Resolved starts verification
  if (normalized === "ai verification" || normalized === "resolved (pending ai verification)") return "critical";
  if (normalized === "verified & closed" || normalized === "closed") return "success";
  return "default";
}
