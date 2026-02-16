import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[2.5rem] border border-slate-800 bg-slate-950/60 shadow-xl",
        className
      )}
      {...props}
    />
  );
}
