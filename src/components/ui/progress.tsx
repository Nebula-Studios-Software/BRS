"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: "default" | "danger" | "success" | "warning";
  }
>(({ className, value, variant = "default", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-full w-full overflow-hidden bg-transparent",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all opacity-20",
        variant === "default" && "bg-default-500",
        variant === "danger" && "bg-danger",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      aria-label={`Progress: ${value}%`}
    />
  </ProgressPrimitive.Root>
));

Progress.displayName = "Progress";

export { Progress };
