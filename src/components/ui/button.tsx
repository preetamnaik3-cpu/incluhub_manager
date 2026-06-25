import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all rounded-xl disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          {
            "bg-neutral-900 text-white hover:bg-neutral-800": variant === "primary",
            "bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50":
              variant === "secondary",
            "text-neutral-600 hover:bg-neutral-100": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "danger",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
