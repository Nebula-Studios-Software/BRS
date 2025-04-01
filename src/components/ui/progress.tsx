"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

type ProgressVariant = "default" | "success" | "primary" | "secondary" | "warning" | "danger"

const variantStyles: Record<ProgressVariant, { background: string, indicator: string }> = {
  default: {
    background: "bg-primary/20",
    indicator: "bg-primary"
  },
  success: {
    background: "bg-green-500/20",
    indicator: "bg-green-500"
  },
  primary: {
    background: "bg-blue-500/20",
    indicator: "bg-blue-500"
  },
  secondary: {
    background: "bg-purple-500/20",
    indicator: "bg-purple-500"
  },
  warning: {
    background: "bg-yellow-500/20",
    indicator: "bg-yellow-500"
  },
  danger: {
    background: "bg-red-500/20",
    indicator: "bg-red-500"
  }
}

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  variant?: ProgressVariant
}

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: ProgressProps) {
  const styles = variantStyles[variant]

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative w-full overflow-hidden rounded-full",
        styles.background,
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all",
          styles.indicator
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
