import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-black uppercase tracking-widest text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30",
  outline:
    "border border-slate-700 text-slate-100 hover:bg-slate-900/40 shadow-sm shadow-slate-900/20",
  ghost: "text-slate-400 hover:text-white hover:bg-slate-900/40"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-4",
  md: "h-10 px-6",
  lg: "h-11 px-8"
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}
