import React from "react";

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "glass" | "bordered" | "interactive";
  glow?: "none" | "indigo" | "purple" | "emerald";
}

export function Card({
  children,
  variant = "default",
  glow = "none",
  className = "",
  ...props
}: CardProps) {
  const baseStyles = "rounded-3xl border transition-all duration-300 font-sans overflow-hidden";
  
  const variants = {
    default: "bg-m3-surface-variant border-m3-outline text-slate-100",
    glass: "glass-card text-slate-100",
    bordered: "bg-transparent border-slate-900 text-slate-100",
    interactive: "bg-m3-surface-variant/40 border-m3-outline text-slate-100 hover:bg-m3-surface-variant/75 hover:border-brand-primary/30 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-indigo-500/5",
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
