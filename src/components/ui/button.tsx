import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer relative overflow-hidden active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:active:bg-input/70",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 dark:hover:bg-accent/50 dark:active:bg-accent/70",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
        solid: "text-white shadow-sm hover:shadow-md active:shadow-sm transition-shadow duration-200",
        shadow: "text-white shadow-lg hover:shadow-xl active:shadow-md transition-shadow duration-200",
      },
      color: {
        default: "",
        primary: "text-primary hover:text-primary/90",
        secondary: "text-secondary hover:text-secondary/90",
        success: "text-green-500 hover:text-green-600",
        info: "text-blue-500 hover:text-blue-600",
        warning: "text-yellow-500 hover:text-yellow-600",
        destructive: "text-destructive hover:text-destructive/90",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    compoundVariants: [
      {
        variant: "ghost",
        color: "success",
        className: "hover:bg-green-50 dark:hover:bg-green-950/50 text-green-500 hover:text-green-600",
      },
      {
        variant: "ghost",
        color: "info",
        className: "hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-500 hover:text-blue-600",
      },
      {
        variant: "ghost",
        color: "warning",
        className: "hover:bg-yellow-50 dark:hover:bg-yellow-950/50 text-yellow-500 hover:text-yellow-600",
      },
      {
        variant: "ghost",
        color: "destructive",
        className: "hover:bg-destructive/10 dark:hover:bg-destructive/20 text-destructive hover:text-destructive/90",
      },
      {
        variant: "outline",
        color: "success",
        className: "border-green-500 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/50 hover:text-green-600",
      },
      {
        variant: "outline",
        color: "info",
        className: "border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600",
      },
      {
        variant: "outline",
        color: "warning",
        className: "border-yellow-500 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/50 hover:text-yellow-600",
      },
      {
        variant: "outline",
        color: "destructive",
        className: "border-destructive text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive/90",
      },
      {
        variant: "solid",
        color: "success",
        className: "bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-green-500/20 hover:shadow-green-500/30 text-black dark:text-black dark:hover:text-black",
      },
      {
        variant: "solid",
        color: "info",
        className: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 shadow-blue-500/20 hover:shadow-blue-500/30 text-white dark:text-white dark:hover:text-white",
      },
      {
        variant: "solid",
        color: "warning",
        className: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 shadow-yellow-500/20 hover:shadow-yellow-500/30 text-black dark:text-black dark:hover:text-black",
      },
      {
        variant: "solid",
        color: "destructive",
        className: "bg-destructive hover:bg-destructive/90 active:bg-destructive/80 shadow-destructive/20 hover:shadow-destructive/30 text-white dark:text-white dark:hover:text-white",
      },
      {
        variant: "shadow",
        color: "success",
        className: "bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 text-black dark:text-black dark:hover:text-black",
      },
      {
        variant: "shadow",
        color: "info",
        className: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 text-white dark:text-white dark:hover:text-white",
      },
      {
        variant: "shadow",
        color: "warning",
        className: "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40 text-black dark:text-black dark:hover:text-black",
      },
      {
        variant: "shadow",
        color: "destructive",
        className: "bg-destructive hover:bg-destructive/90 active:bg-destructive/80 shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 text-white dark:text-white dark:hover:text-white",
      },
    ],
    defaultVariants: {
      variant: "default",
      color: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  color,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const [ripple, setRipple] = React.useState<{ x: number; y: number } | null>(null)
  const [isAnimating, setIsAnimating] = React.useState(false)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setRipple({ x, y })
    setIsAnimating(true)

    setTimeout(() => {
      setIsAnimating(false)
      setRipple(null)
    }, 600)

    props.onClick?.(e)
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size, className }))}
      onClick={handleClick}
      {...props}
    >
      {ripple && isAnimating && (
        <span
          className="absolute inset-0 bg-white/40 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      {props.children}
    </Comp>
  )
}

export { Button, buttonVariants }
