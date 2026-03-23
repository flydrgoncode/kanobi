import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors ${className}`}
      {...props}
    />
  );
}
