import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "glass" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transform active:scale-98 select-none font-sans";
  
  const variants = {
    primary: "bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary-hover hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 border border-transparent",
    secondary: "bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-850 hover:border-slate-700",
    outline: "bg-transparent border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white",
    ghost: "bg-transparent hover:bg-slate-900/50 text-slate-400 hover:text-slate-200",
    glass: "glass-panel glass-panel-hover text-slate-200 hover:text-white shadow-md",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20",
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-xs gap-1.5",
    md: "px-5 py-2.5 text-sm gap-2",
    lg: "px-7 py-3.5 text-base gap-2.5",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
