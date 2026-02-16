import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1",
        className
      )}
      {...props}
    />
  );
}

