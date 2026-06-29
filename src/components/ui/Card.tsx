import React from "react";

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "glass" | "bordered" | "interactive" | "ai";
  glow?: "none" | "indigo" | "purple" | "emerald";
}

export function Card({
  children,
  variant = "default",
  glow = "none",
  className = "",
  ...props
}: CardProps) {
  const baseStyles = "rounded-2xl border transition-all duration-300 font-sans overflow-hidden";
  
  const variants = {
    default: "glass-card text-slate-100",
    glass: "glass-card text-slate-100",
    bordered: "bg-transparent border-white/5 text-slate-100",
    interactive: "glass-card hover:border-indigo-500/25 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(99,102,241,0.15)] transition-all duration-300 ease-out text-slate-100",
    ai: "gemini-ai-card text-slate-100",
  };

  const glows = {
    none: "",
    indigo: "shadow-[0_0_50px_-12px_rgba(99,102,241,0.18)]",
    purple: "shadow-[0_0_50px_-12px_rgba(168,85,247,0.18)]",
    emerald: "shadow-[0_0_50px_-12px_rgba(16,185,129,0.18)]",
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${glows[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-5 border-b border-m3-outline flex flex-col gap-1.5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-bold tracking-tight text-white ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-slate-400 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-4 bg-slate-950/20 border-t border-m3-outline flex items-center justify-between gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
