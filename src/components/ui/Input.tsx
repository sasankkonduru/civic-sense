import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;

    return (
      <div className="flex flex-col gap-1.5 w-full font-sans">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`glass-input px-4 py-3 rounded-2xl text-sm ${
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-800 focus:border-brand-primary focus:ring-brand-primary/20"
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-400 mt-0.5">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-500 mt-0.5">{helperText}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;

    return (
      <div className="flex flex-col gap-1.5 w-full font-sans">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={`glass-input px-4 py-3 rounded-2xl text-sm min-h-[100px] resize-y ${
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-800 focus:border-brand-primary focus:ring-brand-primary/20"
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-400 mt-0.5">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-500 mt-0.5">{helperText}</span>}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = "", id, ...props }, ref) => {
    const defaultId = useId();
    const inputId = id || defaultId;

    return (
      <div className="flex flex-col gap-1.5 w-full font-sans">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            className={`glass-input w-full px-4 py-3 rounded-2xl text-sm appearance-none cursor-pointer pr-10 ${
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-800 focus:border-brand-primary focus:ring-brand-primary/20"
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-xs font-medium text-red-400 mt-0.5">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-500 mt-0.5">{helperText}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";
