import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "px-4 py-2 rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2";
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white",
    ghost: "border border-white/20 hover:border-white/40 text-white",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
